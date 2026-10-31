import { Suspense } from "react";
import { connection } from "next/server";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { addDays, formatDay, formatDayShort, nowTime, todayISO } from "@/lib/dates";
import { verifySession } from "@/lib/session";
import { DECISION_THRESHOLD, rollOverOverdue } from "@/lib/tasks";
import { missedLast, occurrencesOn, resolved, streak } from "@/lib/routine";
import { loadRoutines } from "@/lib/routines";
import { Menu } from "./menu";
import { chevronLeftIcon, chevronRightIcon } from "./nav-icons";
import { TopBar } from "./top-bar";
import { PressLink } from "./press-link";
import { ListSkeleton } from "./skeleton";
import { TaskList, type ListTask } from "./task-list";
import { CaptureBar } from "./capture-bar";
import { discardTask, postponeTask, scheduleTask } from "./actions";
import { changeOccurrence } from "./rutina/actions";

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

  const [taskRows, routineData] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.date, day), ne(tasks.status, "descartada")))
      .orderBy(sql`${tasks.time} asc nulls last`, asc(tasks.id)),
    loadRoutines(),
  ]);

  const nextLabel = day === today ? "Pasar a mañana" : "Pasar al día siguiente";
  const taskItems: ListTask[] = taskRows.map((t) => {
    const done = t.status === "hecha";
    const mustDecide = !done && t.postponements >= DECISION_THRESHOLD;
    return {
      key: `t${t.id}`,
      id: t.id,
      text: t.text,
      time: t.time,
      done,
      postponements: t.postponements,
      menu: mustDecide ? <Decision id={t.id} /> : <TaskMenu id={t.id} nextLabel={nextLabel} />,
    };
  });

  // La rutina no se guarda por día: se calcula desde horarios y excepciones.
  const routineItems: ListTask[] = routineData.flatMap((r) =>
    occurrencesOn(r.slots, r.exceptions, day).map((o) => {
      const history = r.trackStreak ? resolved(r.slots, r.exceptions, r.done, today) : [];
      return {
        key: `r${r.id}-${o.date}`,
        id: r.id,
        text: r.name,
        time: o.time,
        done: r.done.has(o.date),
        postponements: 0,
        menu: <OccurrenceMenu routineId={r.id} date={o.date} />,
        routine: {
          date: o.date,
          streak: r.trackStreak ? streak(history) : null,
          warn: day === today && missedLast(history),
        },
      };
    }),
  );

  // Por hora y lo sin hora al final; a igual hora, la rutina primero.
  const items = [...routineItems, ...taskItems].sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));

  const link = (iso: string) => (iso === today ? "/" : `/?fecha=${iso}`);

  const arrow =
    "glass flex size-10 shrink-0 items-center justify-center rounded-full text-foreground";

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar>
        <PressLink href={link(addDays(day, -1))} aria-label="Día anterior" className={arrow}>
          {chevronLeftIcon}
        </PressLink>
        <h1 className="min-w-0 flex-1 truncate text-center text-base font-medium capitalize leading-none tracking-tight sm:text-left sm:text-xl">
          <span className="sm:hidden">{formatDayShort(day)}</span>
          <span className="hidden sm:inline">{formatDay(day)}</span>
        </h1>
        {day !== today && (
          <PressLink href="/" className="glass flex h-10 items-center rounded-full px-4 text-sm leading-none text-foreground">
            Hoy
          </PressLink>
        )}
        <PressLink href={link(addDays(day, 1))} aria-label="Día siguiente" className={arrow}>
          {chevronRightIcon}
        </PressLink>
      </TopBar>
      <main className="mx-auto w-full max-w-3xl flex-1 px-3 pb-6 pt-4 sm:px-6">

        {items.length === 0 ? (
          <p className="py-16 text-center text-muted">Nada para este día.</p>
        ) : (
          <TaskList
            day={day}
            now={nowTime()}
            trackOverdue={day === today}
            tasks={items}
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

// Solo este día: no toca el horario de la rutina. Editarla vale para todos los días.
function OccurrenceMenu({ routineId, date }: { routineId: number; date: string }) {
  const field = "min-w-0 flex-1 rounded-md border border-line bg-surface px-1.5 py-1 text-xs";
  return (
    <Menu label="Más acciones">
      <form action={changeOccurrence} className="flex items-center gap-1 px-2 py-1">
        <input type="hidden" name="routineId" value={routineId} />
        <input type="hidden" name="date" value={date} />
        <input type="time" name="newTime" required aria-label="Otra hora este día" className={field} />
        <button className="rounded-md px-2 py-1 text-sm hover:bg-hover">Hora</button>
      </form>
      <form action={changeOccurrence} className="flex items-center gap-1 px-2 py-1">
        <input type="hidden" name="routineId" value={routineId} />
        <input type="hidden" name="date" value={date} />
        <input type="date" name="newDate" required aria-label="Mover a otro día" className={field} />
        <button className="rounded-md px-2 py-1 text-sm hover:bg-hover">Mover</button>
      </form>
      <form action={changeOccurrence}>
        <input type="hidden" name="routineId" value={routineId} />
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="kind" value="saltar" />
        <button className={menuItem}>Saltar este día</button>
      </form>
      <PressLink href={`/rutina/editar?id=${routineId}`} className={menuItem}>
        Editar rutina
      </PressLink>
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
