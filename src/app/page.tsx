import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { addDays, formatDay, todayISO } from "@/lib/dates";
import { captureTask, setTaskDone } from "./actions";

type Props = { searchParams: Promise<{ fecha?: string }> };

export default function HoyPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<main className="mx-auto min-h-dvh max-w-xl px-4 py-6" />}>
      <Hoy searchParams={searchParams} />
    </Suspense>
  );
}

async function Hoy({ searchParams }: Props) {
  // La hora actual solo se puede leer en la solicitud, no al prerenderizar.
  await connection();
  const { fecha } = await searchParams;
  const today = todayISO();
  const day = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : today;

  const items = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.date, day), ne(tasks.status, "descartada")))
    .orderBy(sql`${tasks.time} asc nulls last`, asc(tasks.id));

  const link = (iso: string) => (iso === today ? "/" : `/?fecha=${iso}`);

  const arrow =
    "flex size-9 items-center justify-center rounded-lg text-lg text-muted transition-colors hover:bg-hover hover:text-foreground";

  return (
    <>
      <main className="mx-auto min-h-dvh max-w-3xl px-3 pb-36 pt-5 sm:px-6 sm:pt-10">
        <header className="mb-6 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold capitalize tracking-tight sm:text-3xl">{formatDay(day)}</h1>
            {day !== today && (
              <Link href="/" className="text-sm text-muted underline-offset-2 hover:underline">
                Volver a hoy
              </Link>
            )}
          </div>
          <nav className="flex gap-1">
            <Link href={link(addDays(day, -1))} aria-label="Día anterior" className={arrow}>
              ←
            </Link>
            <Link href={link(addDays(day, 1))} aria-label="Día siguiente" className={arrow}>
              →
            </Link>
          </nav>
        </header>

        {items.length === 0 ? (
          <p className="py-16 text-center text-muted">Nada para este día.</p>
        ) : (
          <ul className="flex flex-col">
            {items.map((t) => {
              const done = t.status === "hecha";
              return (
                <li key={t.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-hover">
                  <form action={setTaskDone}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="done" value={String(!done)} />
                    <button
                      aria-label={done ? "Marcar pendiente" : "Marcar hecha"}
                      className={`flex size-5 items-center justify-center rounded-md border text-xs ${
                        done ? "border-accent bg-accent text-white" : "border-line-strong hover:border-accent"
                      }`}
                    >
                      {done && "✓"}
                    </button>
                  </form>
                  <span className={`flex-1 ${done ? "text-muted line-through" : ""}`}>{t.text}</span>
                  {t.postponements > 0 && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-xs ${
                        t.postponements >= 3 ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300" : "bg-hover text-muted"
                      }`}
                    >
                      ↻ {t.postponements}
                    </span>
                  )}
                  {t.time && <span className="text-sm tabular-nums text-muted">{t.time.slice(0, 5)}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-background from-70% to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-8 sm:px-6">
        <form action={captureTask} className="mx-auto max-w-3xl">
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface py-2 pl-4 pr-2 shadow-lg shadow-black/5 focus-within:border-line-strong">
            <input
              name="text"
              autoFocus
              autoComplete="off"
              placeholder="Anotar… (mañana 15:30, el lunes, 5/11)"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:text-muted"
            />
            <button aria-label="Agregar" className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-lg text-white transition-opacity hover:opacity-90">
              ↑
            </button>
          </div>
          <p className="mt-1.5 text-center text-xs text-muted">Sin fecha ni hora va a la bandeja.</p>
        </form>
      </div>
    </>
  );
}
