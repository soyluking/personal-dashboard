// Un usuario no ve ni modifica las tareas ni las rutinas de otro. Corre las acciones de verdad
// contra una base de prueba aparte; sin TEST_DATABASE_URL se salta (nunca toca la base de desarrollo).
//   docker exec personal-dashboard-db-1 createdb -U dev dashboard_test
//   TEST_DATABASE_URL=postgres://dev:dev@localhost:5432/dashboard_test npm test
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  return { enabled: Boolean(process.env.TEST_DATABASE_URL) };
});

const session = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/session", () => ({ verifySession: async () => session.current }));
vi.mock("@/auth", () => ({ signOut: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/time-zone", () => ({ userTimeZone: async () => "America/Santiago" }));

import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "@/db";
import { routineLogs, routines, tasks, users } from "@/db/schema";
import { addDays, todayISO } from "@/lib/dates";
import { loadRoutines } from "@/lib/routines";
import { countInbox, rollOverOverdue } from "@/lib/tasks";
import * as taskActions from "./actions";
import * as routineActions from "./rutina/actions";

type User = typeof users.$inferSelect;
let ana: User;
let beto: User;

const form = (values: Record<string, string | number>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, String(v));
  return data;
};
const as = (user: User) => void (session.current = user);

describe.runIf(env.enabled)("aislamiento entre usuarios", () => {
  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "drizzle" });
  });

  beforeEach(async () => {
    await db.execute(sql`truncate users restart identity cascade`);
    [ana, beto] = await db
      .insert(users)
      .values([{ email: "ana@example.com" }, { email: "beto@example.com" }])
      .returning();
  });

  it("no puede editar, completar, postergar, mover ni descartar la tarea de otro", async () => {
    as(ana);
    await taskActions.captureTask(form({ text: "comprar pan", day: todayISO() }));
    const [before] = await db.select().from(tasks);

    as(beto);
    const id = before.id;
    await taskActions.editTask(id, "hackeada");
    await taskActions.setTaskDone(form({ id, done: "true" }));
    await taskActions.postponeTask(form({ id }));
    await taskActions.scheduleTask(form({ id, date: "2030-01-01" }));
    await taskActions.discardTask(form({ id }));
    await taskActions.restoreTask(form({ id, date: "2030-01-01", postponements: 9 }));

    const [after] = await db.select().from(tasks).where(eq(tasks.id, id));
    expect(after).toEqual(before);
  });

  it("no ve la bandeja de otro ni le mueve sus atrasadas", async () => {
    const yesterday = addDays(todayISO(), -1);
    await db.insert(tasks).values([
      { userId: ana.id, text: "sin fecha", date: null },
      { userId: ana.id, text: "de ayer", date: yesterday },
    ]);

    expect(await countInbox(beto.id)).toBe(0);
    await rollOverOverdue(beto.id, todayISO());
    const [late] = await db.select().from(tasks).where(eq(tasks.text, "de ayer"));
    expect(late.date).toBe(yesterday);
  });

  it("no ve ni toca la rutina de otro", async () => {
    const today = todayISO();
    as(ana);
    const slots = JSON.stringify([{ time: "08:30", frequency: "diaria", interval: 1, weekdays: [], anchor: today }]);
    await routineActions.saveRoutine({}, form({ name: "box", slots }));
    const [routine] = await db.select().from(routines);

    as(beto);
    expect(await loadRoutines(beto.id)).toEqual([]);
    expect(await routineActions.saveRoutine({}, form({ id: routine.id, name: "hackeada", slots }))).toEqual({
      error: "Esa rutina no existe.",
    });
    await routineActions.archiveRoutine(form({ id: routine.id }));
    const occurrence = { routineId: routine.id, date: today };
    await expect(routineActions.setRoutineDone(form({ ...occurrence, done: "true" }))).rejects.toThrow();
    await expect(routineActions.changeOccurrence(form({ ...occurrence, kind: "saltar" }))).rejects.toThrow();

    const [after] = await db.select().from(routines).where(eq(routines.id, routine.id));
    expect(after).toEqual(routine);
    expect(await db.select().from(routineLogs)).toEqual([]);
    expect((await loadRoutines(ana.id))[0].slots).toHaveLength(1);
  });
});
