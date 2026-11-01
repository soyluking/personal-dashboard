import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isAllowedEmail } from "./allowed-email";

export type User = typeof users.$inferSelect;

// Las server actions se pueden llamar directo, sin pasar por las páginas:
// cada una y cada lectura de datos llama a esto primero y filtra por el usuario que devuelve.
// `cache` evita repetir la consulta dentro de una misma solicitud.
export const verifySession = cache(async (): Promise<User> => {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isAllowedEmail(email)) redirect("/login");
  return findOrCreateUser(email.trim().toLowerCase(), session?.user?.name ?? null);
});

// El usuario se crea en su primer ingreso.
async function findOrCreateUser(email: string, name: string | null) {
  const [found] = await db.select().from(users).where(eq(users.email, email));
  // El dueño migrado parte sin nombre; Chispa saluda con él.
  if (found && !found.name && name) {
    await db.update(users).set({ name }).where(eq(users.id, found.id));
    return { ...found, name };
  }
  if (found) return found;
  await db.insert(users).values({ email, name }).onConflictDoNothing();
  const [created] = await db.select().from(users).where(eq(users.email, email));
  return created;
}
