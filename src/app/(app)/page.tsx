import { Suspense } from "react";
import { connection } from "next/server";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { addDays, formatDay, formatDayShort, nowTime, todayISO } from "@/lib/dates";
import { verifySession } from "@/lib/session";
import { DECISION_THRESHOLD, rollOverOverdue } from "@/lib/tasks";
import { Menu } from "./menu";
import { PressLink } from "./press-link";
import { ListSkeleton } from "./skeleton";
import { TaskList } from "./task-list";
import { CaptureBar } from "./capture-bar";
import { discardTask, postponeTask, scheduleTask } from "./actions";

type Props = { searchParams: Promise<{ fecha?: string }> };

export default function HoyPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<ListSkeleton />}>
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
    "glass flex size-10 items-center justify-center rounded-full text-xl text-muted hover:text-foreground";

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 px-3 pb-6 pt-3 sm:px-6 md:pt-8">
        <header className="mb-6 flex min-h-12 items-center gap-2 pl-14 md:min-h-0 md:pl-0">
          <PressLink href={link(addDays(day, -1))} aria-label="Día anterior" className={arrow}>
            ‹
          </PressLink>
          <h1 className="min-w-0 flex-1 truncate text-center text-lg font-medium capitalize tracking-tight sm:text-left sm:text-2xl">
            <span className="sm:hidden">{formatDayShort(day)}</span>
            <span className="hidden sm:inline">{formatDay(day)}</span>
          </h1>
          {day !== today && (
            <PressLink href="/" className="glass flex h-10 items-center rounded-full px-4 text-sm hover:text-foreground">
              Hoy
            </PressLink>
          )}
          <PressLink href={link(addDays(day, 1))} aria-label="Día siguiente" className={arrow}>
            ›
          </PressLink>
        </header>

        {items.length === 0 ? (
          <p className="py-16 text-center text-muted">Nada para este día.</p>
        ) : (
          <TaskList
            day={day}
            now={nowTime()}
            trackOverdue={day === today}
            tasks={items.map((t) => {
              const done = t.status === "hecha";
              const mustDecide = !done && t.postponements >= DECISION_THRESHOLD;
              return {
                id: t.id,
                text: t.text,
                time: t.time,
                done,
                postponements: t.postponements,
                menu: mustDecide ? (
                  <Decision id={t.id} />
                ) : (
                  <TaskMenu id={t.id} nextLabel={day === today ? "Pasar a mañana" : "Pasar al día siguiente"} />
                ),
              };
            })}
          />
        )}
      </main>

      <CaptureBar day={day} hint={day === today ? "queda para hoy" : "queda para este día"} />
    </div>
  );
}

const menuItem = "w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-hover active:bg-line";

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
