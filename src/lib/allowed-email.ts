// El sistema es de un solo usuario: solo entra el correo de AUTH_ALLOWED_EMAIL.
// Sin la variable no entra nadie, para que un deploy mal configurado no quede abierto.
export function isAllowedEmail(email: string | null | undefined, allowed = process.env.AUTH_ALLOWED_EMAIL) {
  if (!email || !allowed) return false;
  return email.trim().toLowerCase() === allowed.trim().toLowerCase();
}
