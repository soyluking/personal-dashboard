import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { routineExceptions, routineLogs, routines, routineSlots } from "@/db/schema";
import type { RoutineException, Slot } from "./routine";

export type RoutineData = {
  id: number;
  name: string;
  trackStreak: boolean;
  area: string | null;
  archivedAt: string | null;
  slots: (Slot & { id: number })[];
  exceptions: RoutineException[];
  // Fechas originales de las ocurrencias hechas.
  done: Set<string>;
};

// Toda la rutina del usuario con su historia: son pocas filas y las reglas se calculan en código.
export async function loadRoutines(userId: number): Promise<RoutineData[]> {
  const rs = await db.select().from(routines).where(eq(routines.userId, userId));
  if (rs.length === 0) return [];
  const ids = rs.map((r) => r.id);
  const [slots, exceptions, logs] = await Promise.all([
    db.select().from(routineSlots).where(inArray(routineSlots.routineId, ids)),
    db.select().from(routineExceptions).where(inArray(routineExceptions.routineId, ids)),
    db
      .select({ routineId: routineLogs.routineId, date: routineLogs.date })
      .from(routineLogs)
      .where(inArray(routineLogs.routineId, ids)),
  ]);
  return rs.map((r) => ({
    id: r.id,
    name: r.name,
    trackStreak: r.trackStreak,
    area: r.area,
    archivedAt: r.archivedAt,
    slots: slots.filter((s) => s.routineId === r.id),
    exceptions: exceptions.filter((e) => e.routineId === r.id),
    done: new Set(logs.filter((l) => l.routineId === r.id).map((l) => l.date)),
  }));
}

// Horarios, excepciones y registros cuelgan de la rutina: antes de tocarlos, la rutina tiene que ser del usuario.
export async function ownsRoutine(userId: number, routineId: number) {
  const [found] = await db
    .select({ id: routines.id })
    .from(routines)
    .where(and(eq(routines.id, routineId), eq(routines.userId, userId)));
  return Boolean(found);
}
