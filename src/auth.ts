import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isAllowedEmail } from "@/lib/allowed-email";

// Sesión JWT en una cookie: no necesita tablas. Google lee AUTH_GOOGLE_ID y AUTH_GOOGLE_SECRET.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    signIn: ({ profile }) => profile?.email_verified === true && isAllowedEmail(profile.email),
    // Lo usa el proxy para mandar a /login a quien no tiene sesión.
    authorized: ({ auth }) => isAllowedEmail(auth?.user?.email),
  },
});
