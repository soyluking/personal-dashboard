"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { todayISO } from "@/lib/dates";
import { parseCapture, parseEdit } from "@/lib/parse-capture";
import { verifySession } from "@/lib/session";

function revalidate() {
  revalidatePath("/");
  revalidatePath("/bandeja");
}

function taskId(formData: FormData) {
  return Number(formData.get("id"));
}

export async function captureTask(formData: FormData) {
  await verifySession();
  const input = String(formData.get("text") ?? "").trim();
  if (!input) return;

  const day = String(formData.get("day") ?? "");
  const { text, date, time } = parseCapture(input, todayISO(), /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null);
  await db.insert(tasks).values({ text, date, time });
  revalidate();
}

// Cambiar la fecha al editar es darle fecha a mano: el contador vuelve a cero.
export async function editTask(id: number, input: string) {
  await verifySession();
  if (!input.trim()) return;
  const [task] = await db.select({ date: tasks.date }).from(tasks).where(eq(tasks.id, id));
  if (!task) return;

  const { text, date, time } = parseEdit(input, task.date, todayISO());
  await db
    .update(tasks)
    .set({ text, date, time, ...(date !== task.date && { postponements: 0 }) })
    .where(eq(tasks.id, id));
  revalidate();
}

export async function setTaskDone(formData: FormData) {
  await verifySession();
  const done = formData.get("done") === "true";
  await db
    .update(tasks)
    .set({ status: done ? "hecha" : "pendiente" })
    .where(eq(tasks.id, taskId(formData)));
  revalidate();
}

// Pasa la tarea al día siguiente de su fecha y suma una postergación.
export async function postponeTask(formData: FormData) {
  await verifySession();
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
  await verifySession();
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
  await verifySession();
  await db
    .update(tasks)
    .set({ status: "descartada" })
    .where(eq(tasks.id, taskId(formData)));
  revalidate();
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
