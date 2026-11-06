"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { areaEnum, routineExceptions, routineLogs, routines, routineSlots } from "@/db/schema";
import { todayISO } from "@/lib/dates";
import { userTimeZone } from "@/lib/time-zone";
import { replaceSlotsFrom, slotsOverlap, type Slot } from "@/lib/routine";
import { ownsRoutine } from "@/lib/routines";
import { verifySession } from "@/lib/session";

type Area = (typeof areaEnum.enumValues)[number];
export type SlotInput = Pick<Slot, "time" | "frequency" | "interval" | "weekdays" | "anchor">;
export type FormState = { error?: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const hhmm = (t: string | null) => (t && /^\d{2}:\d{2}/.test(t) ? t.slice(0, 5) : null);

function revalidate() {
  revalidatePath("/");
  revalidatePath("/rutina");
}

function parseSlots(raw: string, today: string): SlotInput[] | string {
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return "Horarios inválidos.";
  }
  if (!Array.isArray(list) || list.length === 0) return "Agrega al menos un horario.";
  const slots: SlotInput[] = list.map((s) => ({
    time: hhmm(s.time ?? null),
    frequency: s.frequency === "diaria" ? "diaria" : "semanal",
    interval: Math.min(52, Math.max(1, Math.round(Number(s.interval) || 1))),
    weekdays: s.frequency === "diaria" ? [] : [...new Set<number>((s.weekdays ?? []).map(Number))].filter((d) => d >= 1 && d <= 7).sort(),
    anchor: ISO.test(s.anchor ?? "") ? s.anchor : today,
  }));
  if (slots.some((s) => s.frequency === "semanal" && s.weekdays.length === 0)) return "Elige al menos un día en cada horario.";
  if (slotsOverlap(slots)) return "Dos horarios no pueden compartir días: la rutina ocurre a lo más una vez por día.";
  return slots;
}

const same = (a: SlotInput[], b: SlotInput[]) => {
  const key = (s: SlotInput) => JSON.stringify([hhmm(s.time), s.frequency, s.interval, [...s.weekdays].sort(), s.anchor]);
  return a.map(key).sort().join() === b.map(key).sort().join();
};

// Desde la pantalla Rutina vale «todos»: nombre, área y racha cambian en toda la historia;
// hora y días, desde hoy (el pasado no se reescribe).
export async function saveRoutine(_: FormState, formData: FormData): Promise<FormState> {
  const user = await verifySession();
  const today = todayISO(await userTimeZone());
  const id = Number(formData.get("id")) || null;
  if (id && !(await ownsRoutine(user.id, id))) return { error: "Esa rutina no existe." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Ponle un nombre." };
  const area = String(formData.get("area") ?? "");
  const values = {
    name,
    trackStreak: formData.get("trackStreak") === "on",
    area: areaEnum.enumValues.includes(area as Area) ? (area as Area) : null,
  };
  const slots = parseSlots(String(formData.get("slots") ?? ""), today);
  if (typeof slots === "string") return { error: slots };

  await db.transaction(async (tx) => {
    if (!id) {
      const [r] = await tx.insert(routines).values({ ...values, userId: user.id }).returning({ id: routines.id });
      await tx.insert(routineSlots).values(slots.map((s) => ({ ...s, routineId: r.id, validFrom: today })));
      return;
    }
    await tx.update(routines).set(values).where(eq(routines.id, id));
    const current = (await tx.select().from(routineSlots).where(eq(routineSlots.routineId, id))).filter(
      (s) => s.validTo === null || s.validTo >= today,
    );
    if (same(current, slots)) return;
    const plan = replaceSlotsFrom(current, slots, today);
    if (plan.remove.length) await tx.delete(routineSlots).where(inArray(routineSlots.id, plan.remove));
    if (plan.close.length) await tx.update(routineSlots).set({ validTo: plan.closeOn }).where(inArray(routineSlots.id, plan.close));
    await tx.insert(routineSlots).values(plan.insert.map((s) => ({ ...s, routineId: id })));
  });
  revalidate();
  redirect("/rutina");
}

// Archivar cierra los horarios desde hoy: el pasado y sus rachas quedan.
export async function archiveRoutine(formData: FormData) {
  const user = await verifySession();
  const id = Number(formData.get("id"));
  if (!(await ownsRoutine(user.id, id))) return;
  const today = todayISO(await userTimeZone());
  await db.transaction(async (tx) => {
    const current = (await tx.select().from(routineSlots).where(eq(routineSlots.routineId, id))).filter(
      (s) => s.validTo === null || s.validTo >= today,
    );
    const plan = replaceSlotsFrom(current, [], today);
    if (plan.remove.length) await tx.delete(routineSlots).where(inArray(routineSlots.id, plan.remove));
    if (plan.close.length) await tx.update(routineSlots).set({ validTo: plan.closeOn }).where(inArray(routineSlots.id, plan.close));
    await tx.update(routines).set({ archivedAt: today }).where(eq(routines.id, id));
  });
  revalidate();
  redirect("/rutina");
}

// Valida la ocurrencia y que la rutina sea del usuario de la sesión.
async function occurrenceKey(formData: FormData) {
  const user = await verifySession();
  const routineId = Number(formData.get("routineId"));
  const date = String(formData.get("date") ?? "");
  if (!routineId || !ISO.test(date) || !(await ownsRoutine(user.id, routineId))) throw new Error("Ocurrencia inválida");
  return { routineId, date };
}

// `date` es siempre la fecha original de la ocurrencia.
export async function setRoutineDone(formData: FormData) {
  const key = await occurrenceKey(formData);
  if (formData.get("done") === "true") await db.insert(routineLogs).values(key).onConflictDoNothing();
  else await db.delete(routineLogs).where(and(eq(routineLogs.routineId, key.routineId), eq(routineLogs.date, key.date)));
  revalidate();
}

// Solo este día: saltar, otra hora o moverla. No toca el horario.
export async function changeOccurrence(formData: FormData) {
  const key = await occurrenceKey(formData);
  const kind = formData.get("kind") === "saltar" ? "saltar" : "cambiar";
  const newDate = String(formData.get("newDate") ?? "");
  const exception = {
    kind,
    newDate: kind === "cambiar" && ISO.test(newDate) && newDate !== key.date ? newDate : null,
    newTime: kind === "cambiar" ? hhmm(String(formData.get("newTime") ?? "")) : null,
  } as const;
  if (exception.kind === "cambiar" && !exception.newDate && !exception.newTime) return;
  await db
    .insert(routineExceptions)
    .values({ ...key, ...exception })
    .onConflictDoUpdate({ target: [routineExceptions.routineId, routineExceptions.date], set: exception });
  revalidate();
}

// Deshacer una excepción: la ocurrencia vuelve a su horario.
export async function restoreOccurrence(formData: FormData) {
  const key = await occurrenceKey(formData);
  await db
    .delete(routineExceptions)
    .where(and(eq(routineExceptions.routineId, key.routineId), eq(routineExceptions.date, key.date)));
  revalidate();
}
