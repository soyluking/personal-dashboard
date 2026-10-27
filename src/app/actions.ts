"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { todayISO } from "@/lib/dates";
import { parseCapture } from "@/lib/parse-capture";

// TODO(auth): verificar sesión aquí cuando exista el login con Google.

export async function captureTask(formData: FormData) {
  const input = String(formData.get("text") ?? "").trim();
  if (!input) return;

  const { text, date, time } = parseCapture(input, todayISO());
  await db.insert(tasks).values({ text, date, time });
  revalidatePath("/");
}

export async function setTaskDone(formData: FormData) {
  const id = Number(formData.get("id"));
  const done = formData.get("done") === "true";
  await db
    .update(tasks)
    .set({ status: done ? "hecha" : "pendiente" })
    .where(eq(tasks.id, id));
  revalidatePath("/");
}
