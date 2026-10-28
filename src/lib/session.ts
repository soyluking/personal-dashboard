import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAllowedEmail } from "./allowed-email";

// Las server actions se pueden llamar directo, sin pasar por las páginas:
// cada una y cada lectura de datos llama a esto primero.
export async function verifySession() {
  const session = await auth();
  if (!isAllowedEmail(session?.user?.email)) redirect("/login");
}
