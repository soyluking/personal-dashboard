// Revisión optimista con la cookie. La verificación de verdad está en verifySession,
// junto a cada lectura y cada acción.
export { auth as proxy } from "@/auth";

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
