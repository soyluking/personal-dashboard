// Solo entran los correos de AUTH_ALLOWED_EMAILS, separados por coma (AUTH_ALLOWED_EMAIL, el
// de un solo usuario, sigue valiendo). Sin la variable no entra nadie, para que un deploy mal
// configurado no quede abierto.
export function isAllowedEmail(
  email: string | null | undefined,
  allowed = process.env.AUTH_ALLOWED_EMAILS ?? process.env.AUTH_ALLOWED_EMAIL,
) {
  if (!email || !allowed) return false;
  const normalized = email.trim().toLowerCase();
  return allowed
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .some((a) => a !== "" && a === normalized);
}
