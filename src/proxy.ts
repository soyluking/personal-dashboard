// Revisión optimista con la cookie. La verificación de verdad está en verifySession,
// junto a cada lectura y cada acción.
export { auth as proxy } from "@/auth";

export const config = {
  // El manifest y los íconos quedan fuera: el teléfono los pide sin sesión al instalar.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-icon).*)"],
};
