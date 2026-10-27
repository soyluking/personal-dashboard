import { and, count, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";

// Desde esta cantidad de postergaciones, la tarea pide decisión.
export const DECISION_THRESHOLD = 3;

// Las pendientes de días pasados pasan a hoy y suman una postergación por
// cada día que se movieron. Idempotente: se puede correr en cada carga.
export async function rollOverOverdue(today: string) {
  await db
    .update(tasks)
    .set({
      postponements: sql`${tasks.postponements} + (${today}::date - ${tasks.date})`,
      date: today,
    })
    .where(and(eq(tasks.status, "pendiente"), lt(tasks.date, today)));
}

export async function countInbox() {
  const [{ inbox }] = await db
    .select({ inbox: count() })
    .from(tasks)
    .where(and(isNull(tasks.date), eq(tasks.status, "pendiente")));
  return inbox;
}
