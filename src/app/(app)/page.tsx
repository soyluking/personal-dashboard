import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { addDays, formatDay, todayISO } from "@/lib/dates";
import { verifySession } from "@/lib/session";
import { DECISION_THRESHOLD, rollOverOverdue } from "@/lib/tasks";
import { Menu } from "./menu";
import { TaskText } from "./task-text";
import { captureTask, discardTask, postponeTask, scheduleTask, setTaskDone } from "./actions";

type Props = { searchParams: Promise<{ fecha?: string }> };

export default function HoyPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<main className="mx-auto min-h-dvh max-w-xl px-4 py-6" />}>
      <Hoy searchParams={searchParams} />
    </Suspense>
  );
}

async function Hoy({ searchParams }: Props) {
  await verifySession();
  // La hora actual solo se puede leer en la solicitud, no al prerenderizar.
  await connection();
  const { fecha } = await searchParams;
  const today = todayISO();
  const day = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : today;

  await rollOverOverdue(today);

  const items = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.date, day), ne(tasks.status, "descartada")))
    .orderBy(sql`${tasks.time} asc nulls last`, asc(tasks.id));

  const link = (iso: string) => (iso === today ? "/" : `/?fecha=${iso}`);

  const arrow =
    "glass flex size-10 items-center justify-center rounded-full text-xl text-muted transition-colors hover:text-foreground";

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 px-3 pb-6 pt-3 sm:px-6 md:pt-8">
        <header className="mb-6 flex flex-wrap items-center gap-2">
          <Link
            href="/"
            aria-disabled={day === today}
            className={`glass flex h-10 items-center rounded-full px-4 text-sm transition-colors ${
              day === today ? "pointer-events-none text-muted" : "hover:text-foreground"
            }`}
          >
            Hoy
          </Link>
          <nav className="flex items-center gap-2">
            <Link href={link(addDays(day, -1))} aria-label="Día anterior" className={arrow}>
              ‹
            </Link>
            <Link href={link(addDays(day, 1))} aria-label="Día siguiente" className={arrow}>
              ›
            </Link>
          </nav>
          <h1 className="ml-1 text-xl font-medium capitalize tracking-tight sm:text-2xl">{formatDay(day)}</h1>
        </header>

        {items.length === 0 ? (
          <p className="py-16 text-center text-muted">Nada para este día.</p>
        ) : (
          <ul className="flex flex-col">
            {items.map((t) => {
              const done = t.status === "hecha";
              const mustDecide = !done && t.postponements >= DECISION_THRESHOLD;
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-hover">
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
                  <TaskText id={t.id} text={t.text} time={t.time} done={done} />
                  {t.postponements > 0 && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-xs ${
                        t.postponements >= 3 ? "bg-amber-500/20 text-amber-300" : "bg-hover text-muted"
                      }`}
                    >
                      ↻ {t.postponements}
                    </span>
                  )}
                  {t.time && <span className="text-sm tabular-nums text-muted">{t.time.slice(0, 5)}</span>}
                  {!done && !mustDecide && <TaskMenu id={t.id} nextLabel={day === today ? "Pasar a mañana" : "Pasar al día siguiente"} />}
                  {mustDecide && <Decision id={t.id} />}
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <div className="sticky bottom-0 bg-gradient-to-t from-background/70 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-8 sm:px-6">
        <form action={captureTask} className="mx-auto max-w-3xl">
          <div className="glass flex items-center gap-2 rounded-full py-2 pl-5 pr-2">
            <input
              name="text"
              autoFocus
              autoComplete="off"
              placeholder="Anotar… (mañana 15:30, el lunes, 5/11)"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:text-muted"
            />
            <button aria-label="Agregar" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-lg text-white transition-opacity hover:opacity-90">
              ↑
            </button>
          </div>
          <p className="mt-1.5 text-center text-xs text-muted">Sin fecha ni hora va a la bandeja.</p>
        </form>
      </div>
    </div>
  );
}

const menuItem = "w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-hover";

// Acciones de una tarea, con nombre escrito para no adivinar íconos.
function TaskMenu({ id, nextLabel }: { id: number; nextLabel: string }) {
  return (
    <Menu label="Más acciones">
      <form action={postponeTask}>
        <input type="hidden" name="id" value={id} />
        <button className={menuItem}>{nextLabel}</button>
      </form>
      <form action={scheduleTask} className="flex items-center gap-1 px-2 py-1">
        <input type="hidden" name="id" value={id} />
        <input type="date" name="date" required aria-label="Nueva fecha" className="min-w-0 flex-1 rounded-md border border-line bg-surface px-1.5 py-1 text-xs" />
        <button className="rounded-md px-2 py-1 text-sm hover:bg-hover">Mover</button>
      </form>
      <form action={scheduleTask}>
        <input type="hidden" name="id" value={id} />
        <button className={menuItem}>Mandar a la bandeja</button>
      </form>
      <form action={discardTask}>
        <input type="hidden" name="id" value={id} />
        <button className={`${menuItem} text-muted`}>Descartar</button>
      </form>
    </Menu>
  );
}

// Desde la tercera postergación: hacerla (el check), darle fecha, devolverla a la bandeja o descartarla.
function Decision({ id }: { id: number }) {
  const button = "rounded-md border border-line px-2 py-1 text-xs transition-colors hover:border-line-strong";
  return (
    <div className="flex w-full flex-wrap items-center gap-2 pl-8 text-muted">
      <span className="text-xs">¿Qué hacemos?</span>
      <form action={scheduleTask} className="flex items-center gap-1">
        <input type="hidden" name="id" value={id} />
        <input type="date" name="date" required aria-label="Nueva fecha" className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs" />
        <button className={button}>Darle fecha</button>
      </form>
      <form action={scheduleTask}>
        <input type="hidden" name="id" value={id} />
        <button className={button}>A la bandeja</button>
      </form>
      <form action={discardTask}>
        <input type="hidden" name="id" value={id} />
        <button className={button}>Descartar</button>
      </form>
    </div>
  );
}
