// Pone el correo real al dueño de los datos de antes del multiusuario (ver drizzle/0003_users.sql).
// Corre una vez por base, justo después de migrar:
//   node --env-file=.env.local scripts/claim-owner.mjs
// Usa OWNER_EMAIL o, si no está, AUTH_ALLOWED_EMAIL (el correo único de antes).
import postgres from "postgres";

const email = (process.env.OWNER_EMAIL ?? process.env.AUTH_ALLOWED_EMAIL ?? "").trim().toLowerCase();
if (!email.includes("@") || email.includes(",")) {
  console.error("Falta OWNER_EMAIL (un solo correo).");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);
try {
  const claimed = await sql`update users set email = ${email} where email = 'dueno@pendiente.invalid' returning id`;
  if (claimed.length) console.log(`Listo: el usuario ${claimed[0].id} es del dueño.`);
  else console.log("No había datos pendientes de dueño.");
} catch (error) {
  // El correo ya existe: el dueño entró antes de correr esto y quedó con un usuario vacío.
  console.error(error.code === "23505" ? "Ese correo ya tiene usuario: bórralo si está vacío y vuelve a correr." : error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
