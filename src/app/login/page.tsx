import { Suspense } from "react";
import { signIn } from "@/auth";

type Props = { searchParams: Promise<{ error?: string; callbackUrl?: string }> };

export const metadata = { title: "Entrar" };

export default function LoginPage({ searchParams }: Props) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
      <h1 className="text-3xl font-medium">Dashboard</h1>
      <Suspense>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginForm({ searchParams }: Props) {
  const { error, callbackUrl } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    // Auth.js solo redirige dentro del mismo sitio, aunque callbackUrl venga de afuera.
    await signIn("google", { redirectTo: String(formData.get("callbackUrl") || "/") });
  }

  return (
    <form action={login} className="flex flex-col items-center gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
      <button className="glass flex h-12 items-center rounded-full px-6 text-base font-medium transition-colors hover:bg-hover">
        Entrar con Google
      </button>
      {error && <p className="text-sm text-muted">Esa cuenta no tiene acceso.</p>}
    </form>
  );
}
