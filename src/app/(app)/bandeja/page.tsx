import { Suspense } from "react";
import { connection } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { areaEnum, tasks } from "@/db/schema";
import { addDays, todayISO } from "@/lib/dates";
import { userTimeZone } from "@/lib/time-zone";
import { redirect } from "next/navigation";
import { experienceOf } from "@/lib/experiences";
import { verifySession } from "@/lib/session";
import { discardTask, scheduleTask } from "../actions";
import { CaptureBar } from "../capture-bar";
import { PressLink } from "../press-link";
import { TopBar } from "../top-bar";
import { ListSkeleton } from "../skeleton";
import { TaskText } from "../task-text";

type Area = (typeof areaEnum.enumValues)[number];
type Props = { searchParams: Promise<{ area?: string }> };

const NO_AREA = "sin-area";

export default function BandejaPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Bandeja searchParams={searchParams} />
    </Suspense>
  );
}

async function Bandeja({ searchParams }: Props) {
  const user = await verifySession();
  // La bandeja es de la experiencia ejecutiva; en las otras, lo anotado queda en el día.
  if (!experienceOf(user).areasAndInbox) redirect("/");
  await connection();
  const { area } = await searchParams;
  const today = todayISO(await userTimeZone());

  const filter =
    area === NO_AREA
      ? isNull(tasks.area)
      : areaEnum.enumValues.includes(area as Area)
        ? eq(tasks.area, area as Area)
        : undefined;

  const items = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, user.id), isNull(tasks.date), eq(tasks.status, "pendiente"), filter))
    .orderBy(asc(tasks.createdAt));

  const chip = (value: string | undefined, label: string) => {
    const active = value === area || (!value && !filter);
    return (
      <PressLink
        key={label}
        href={value ? `/bandeja?area=${value}` : "/bandeja"}
        className={`shrink-0 rounded-full border px-3 py-1 text-sm capitalize ${
          active ? "border-accent bg-accent text-white" : "border-line text-muted hover:border-line-strong hover:text-foreground"
        }`}
      >
        {label}
      </PressLink>
    );
  };

  const action = "rounded-md border border-line px-2 py-1 text-xs text-muted transition-colors hover:border-line-strong hover:text-foreground";

  return (
    <div className="flex min-h-dvh flex-col">
    <TopBar>
      <h1 className="text-xl font-semibold leading-none tracking-tight sm:text-2xl">Bandeja</h1>
    </TopBar>
    <main className="mx-auto w-full max-w-3xl flex-1 px-3 pb-6 pt-4 sm:px-6">

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
    <CaptureBar hint="se guarda en la bandeja" />
    </div>
  );
}
