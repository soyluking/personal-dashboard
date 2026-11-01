import { and, count, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";

// Desde esta cantidad de postergaciones, la tarea pide decisión.
export const DECISION_THRESHOLD = 3;

// Las pendientes de días pasados pasan a hoy y suman una postergación por
// cada día que se movieron. Idempotente: se puede correr en cada carga.
export async function rollOverOverdue(userId: number, today: string) {
  await db
    .update(tasks)
    .set({
      postponements: sql`${tasks.postponements} + (${today}::date - ${tasks.date})`,
      date: today,
      position: null,
    })
    .where(and(eq(tasks.userId, userId), eq(tasks.status, "pendiente"), lt(tasks.date, today)));
}

// Toda escritura de una tarea pasa por aquí: una tarea de otro usuario no calza y no se toca.
export function ownTask(userId: number, id: number) {
  return and(eq(tasks.id, id), eq(tasks.userId, userId));
}

export async function countInbox(userId: number) {
  const [{ inbox }] = await db
    .select({ inbox: count() })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), isNull(tasks.date), eq(tasks.status, "pendiente")));
  return inbox;
}
