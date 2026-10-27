"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { todayISO } from "@/lib/dates";
import { parseCapture } from "@/lib/parse-capture";

// TODO(auth): verificar sesión aquí cuando exista el login con Google.

function revalidate() {
  revalidatePath("/");
  revalidatePath("/bandeja");
}

function taskId(formData: FormData) {
  return Number(formData.get("id"));
}

export async function captureTask(formData: FormData) {
  const input = String(formData.get("text") ?? "").trim();
  if (!input) return;

  const { text, date, time } = parseCapture(input, todayISO());
  await db.insert(tasks).values({ text, date, time });
  revalidate();
}

export async function setTaskDone(formData: FormData) {
  const done = formData.get("done") === "true";
  await db
    .update(tasks)
    .set({ status: done ? "hecha" : "pendiente" })
    .where(eq(tasks.id, taskId(formData)));
  revalidate();
}

// Pasa la tarea al día siguiente de su fecha y suma una postergación.
export async function postponeTask(formData: FormData) {
  await db
    .update(tasks)
    .set({
      date: sql`${tasks.date} + 1`,
      postponements: sql`${tasks.postponements} + 1`,
    })
    .where(eq(tasks.id, taskId(formData)));
  revalidate();
}

// Darle fecha es un compromiso nuevo: el contador vuelve a cero.
// Sin fecha, la tarea vuelve a la bandeja.
export async function scheduleTask(formData: FormData) {
  const date = String(formData.get("date") ?? "");
  await db
    .update(tasks)
    .set({
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
      postponements: 0,
    })
    .where(eq(tasks.id, taskId(formData)));
  revalidate();
}

export async function discardTask(formData: FormData) {
  await db
    .update(tasks)
    .set({ status: "descartada" })
    .where(eq(tasks.id, taskId(formData)));
  revalidate();
}
