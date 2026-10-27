import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { areaEnum, tasks } from "@/db/schema";
import { addDays, todayISO } from "@/lib/dates";
import { discardTask, scheduleTask } from "../actions";
import { TaskText } from "../task-text";

type Area = (typeof areaEnum.enumValues)[number];
type Props = { searchParams: Promise<{ area?: string }> };

const NO_AREA = "sin-area";

export default function BandejaPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<main className="mx-auto min-h-dvh max-w-xl px-4 py-6" />}>
      <Bandeja searchParams={searchParams} />
    </Suspense>
  );
}

async function Bandeja({ searchParams }: Props) {
  await connection();
  const { area } = await searchParams;
  const today = todayISO();

  const filter =
    area === NO_AREA
      ? isNull(tasks.area)
      : areaEnum.enumValues.includes(area as Area)
        ? eq(tasks.area, area as Area)
        : undefined;

  const items = await db
    .select()
    .from(tasks)
    .where(and(isNull(tasks.date), eq(tasks.status, "pendiente"), filter))
    .orderBy(asc(tasks.createdAt));

  const chip = (value: string | undefined, label: string) => {
    const active = value === area || (!value && !filter);
    return (
      <Link
        key={label}
        href={value ? `/bandeja?area=${value}` : "/bandeja"}
        className={`shrink-0 rounded-full border px-3 py-1 text-sm capitalize transition-colors ${
          active ? "border-accent bg-accent text-white" : "border-line text-muted hover:border-line-strong hover:text-foreground"
        }`}
      >
        {label}
      </Link>
    );
  };

  const action = "rounded-md border border-line px-2 py-1 text-xs text-muted transition-colors hover:border-line-strong hover:text-foreground";

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-3 pb-24 pt-5 sm:px-6 sm:pt-8 md:pb-12">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight sm:text-3xl">Bandeja</h1>

      <nav className="-mx-3 mb-4 flex gap-2 overflow-x-auto px-3 pb-1">
        {chip(undefined, "Todas")}
        {areaEnum.enumValues.map((a) => chip(a, a))}
        {chip(NO_AREA, "Sin área")}
      </nav>

      {items.length === 0 ? (
        <p className="py-16 text-center text-muted">La bandeja está vacía.</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-hover">
              <TaskText id={t.id} text={t.text} time={t.time} />
              {t.area && <span className="rounded-md bg-hover px-1.5 py-0.5 text-xs capitalize text-muted">{t.area}</span>}
              <div className="flex items-center gap-1">
                <form action={scheduleTask}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="date" value={today} />
                  <button className={action}>Hoy</button>
                </form>
                <form action={scheduleTask}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="date" value={addDays(today, 1)} />
                  <button className={action}>Mañana</button>
                </form>
                <form action={scheduleTask} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={t.id} />
                  <input type="date" name="date" required aria-label="Fecha" className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs" />
                  <button className={action}>Ok</button>
                </form>
                <form action={discardTask}>
                  <input type="hidden" name="id" value={t.id} />
                  <button aria-label="Descartar" title="Descartar" className={action}>
                    ✕
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
