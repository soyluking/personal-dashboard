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

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href={link(addDays(day, -1))} aria-label="Día anterior" className="rounded-lg px-3 py-2 text-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">
          ←
        </Link>
        <div className="text-center">
          <h1 className="text-lg font-semibold capitalize">{formatDay(day)}</h1>
          {day !== today && (
            <Link href="/" className="text-sm text-zinc-500 underline">
              Volver a hoy
            </Link>
          )}
        </div>
        <Link href={link(addDays(day, 1))} aria-label="Día siguiente" className="rounded-lg px-3 py-2 text-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">
          →
        </Link>
      </header>

      <form action={captureTask} className="flex flex-col gap-1">
        <input
          name="text"
          autoFocus
          autoComplete="off"
          placeholder="Anotar… (mañana 15:30, el lunes, 5/11)"
          className="w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-3 text-base outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-200"
        />
        <p className="px-1 text-xs text-zinc-500">Sin fecha ni hora va a la bandeja.</p>
      </form>

      {items.length === 0 ? (
        <p className="text-center text-zinc-500">Nada para este día.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {items.map((t) => {
            const done = t.status === "hecha";
            return (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <form action={setTaskDone}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="done" value={String(!done)} />
                  <button
                    aria-label={done ? "Marcar pendiente" : "Marcar hecha"}
                    className={`flex size-7 items-center justify-center rounded-full border-2 ${
                      done ? "border-emerald-600 bg-emerald-600 text-white" : "border-zinc-400"
                    }`}
                  >
                    {done && "✓"}
                  </button>
                </form>
                <span className={`flex-1 ${done ? "text-zinc-400 line-through" : ""}`}>{t.text}</span>
                {t.postponements > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      t.postponements >= 3 ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    ↻ {t.postponements}
                  </span>
                )}
                {t.time && <span className="text-sm tabular-nums text-zinc-500">{t.time.slice(0, 5)}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
