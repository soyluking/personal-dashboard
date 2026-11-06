"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import { db } from "@/db";
import { experienceEnum, tasks, users } from "@/db/schema";
import { todayISO } from "@/lib/dates";
import { userTimeZone } from "@/lib/time-zone";
import { parseCapture, parseEdit } from "@/lib/parse-capture";
import { verifySession } from "@/lib/session";
import { ownTask } from "@/lib/tasks";

function revalidate() {
  revalidatePath("/");
  revalidatePath("/bandeja");
}

function taskId(formData: FormData) {
  return Number(formData.get("id"));
}

export async function captureTask(formData: FormData) {
  const user = await verifySession();
  const input = String(formData.get("text") ?? "").trim();
  if (!input) return;

  const day = String(formData.get("day") ?? "");
  const { text, date, time } = parseCapture(input, todayISO(await userTimeZone()), /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null);
  await db.insert(tasks).values({ userId: user.id, text, date, time });
  revalidate();
}

// Cambiar la fecha al editar es darle fecha a mano: el contador vuelve a cero.
export async function editTask(id: number, input: string) {
  const user = await verifySession();
  if (!input.trim()) return;
  const [task] = await db.select({ date: tasks.date }).from(tasks).where(ownTask(user.id, id));
  if (!task) return;

  const { text, date, time } = parseEdit(input, task.date, todayISO(await userTimeZone()));
  await db
    .update(tasks)
    .set({ text, date, time, ...(date !== task.date && { postponements: 0, position: null }) })
    .where(ownTask(user.id, id));
  revalidate();
}

export async function setTaskDone(formData: FormData) {
  const user = await verifySession();
  const done = formData.get("done") === "true";
  await db
    .update(tasks)
    .set({ status: done ? "hecha" : "pendiente", completedAt: done ? new Date() : null })
    .where(ownTask(user.id, taskId(formData)));
  revalidate();
}

// Guarda el orden a mano de lo sin hora de un día: `ids` va de arriba abajo.
export async function reorderTasks(day: string, ids: number[]) {
  const user = await verifySession();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !ids.length || ids.length > 200 || !ids.every(Number.isInteger)) return;
  const cases = sql.join(ids.map((id, i) => sql`when ${id} then ${i}`), sql` `);
  await db
    .update(tasks)
    .set({ position: sql`(case ${tasks.id} ${cases} end)::integer` })
    .where(and(eq(tasks.userId, user.id), eq(tasks.date, day), inArray(tasks.id, ids)));
  revalidate();
}

// Pasa la tarea al día siguiente de su fecha y suma una postergación.
export async function postponeTask(formData: FormData) {
  const user = await verifySession();
  await db
    .update(tasks)
    .set({
      date: sql`${tasks.date} + 1`,
      postponements: sql`${tasks.postponements} + 1`,
      position: null,
    })
    .where(ownTask(user.id, taskId(formData)));
  revalidate();
}

// Darle fecha es un compromiso nuevo: el contador vuelve a cero.
// Sin fecha, la tarea vuelve a la bandeja.
export async function scheduleTask(formData: FormData) {
  const user = await verifySession();
  const date = String(formData.get("date") ?? "");
  await db
    .update(tasks)
    .set({
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
      postponements: 0,
      position: null,
    })
    .where(ownTask(user.id, taskId(formData)));
  revalidate();
}

export async function discardTask(formData: FormData) {
  const user = await verifySession();
  await db
    .update(tasks)
    .set({ status: "descartada" })
    .where(ownTask(user.id, taskId(formData)));
  revalidate();
}

// Deshacer de postergar y descartar: devuelve la fecha y el contador que tenía y la deja pendiente.
export async function restoreTask(formData: FormData) {
  const user = await verifySession();
  const date = String(formData.get("date") ?? "");
  await db
    .update(tasks)
    .set({
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
      postponements: Number(formData.get("postponements")) || 0,
      status: "pendiente",
    })
    .where(ownTask(user.id, taskId(formData)));
  revalidate();
}

export async function setExperience(formData: FormData) {
  const user = await verifySession();
  const experience = experienceEnum.enumValues.find((e) => e === formData.get("experience"));
  if (!experience) return;
  await db.update(users).set({ experience }).where(eq(users.id, user.id));
  revalidatePath("/", "layout");
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
