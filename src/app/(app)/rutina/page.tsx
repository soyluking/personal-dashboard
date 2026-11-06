import { Suspense } from "react";
import { connection } from "next/server";
import { todayISO } from "@/lib/dates";
import { userTimeZone } from "@/lib/time-zone";
import { describeSlot, resolved, streak } from "@/lib/routine";
import { loadRoutines } from "@/lib/routines";
import { verifySession } from "@/lib/session";
import { PressLink } from "../press-link";
import { ListSkeleton } from "../skeleton";
import { TopBar } from "../top-bar";

const DOTS = 7;

export default function RutinaPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Rutina />
    </Suspense>
  );
}

async function Rutina() {
  const user = await verifySession();
  await connection();
  const today = todayISO(await userTimeZone());

  const items = (await loadRoutines(user.id))
    .filter((r) => r.archivedAt === null)
    .map((r) => {
      const current = r.slots.filter((s) => s.validTo === null || s.validTo >= today);
      const history = r.trackStreak ? resolved(r.slots, r.exceptions, r.done, today) : [];
      return {
        ...r,
        summary: current.map(describeSlot).join(" · "),
        first: current.map((s) => s.time ?? "99").sort()[0] ?? "99",
        streak: streak(history),
        dots: history.slice(0, DOTS).reverse(),
      };
    })
    .sort((a, b) => a.first.localeCompare(b.first) || a.name.localeCompare(b.name));

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar>
        <h1 className="flex-1 text-xl font-semibold leading-none tracking-tight sm:text-2xl">Rutina</h1>
        <PressLink href="/rutina/nueva" className="glass flex h-10 items-center rounded-full px-4 text-sm leading-none text-foreground">
          Nueva
        </PressLink>
      </TopBar>
      <main className="mx-auto w-full max-w-3xl flex-1 px-3 pb-6 pt-4 sm:px-6">
        {items.length === 0 ? (
          <p className="py-16 text-center text-muted">Todavía no hay rutina. Crea la primera con «Nueva».</p>
        ) : (
          <ul className="flex flex-col">
            {items.map((r) => (
              <li key={r.id}>
                <PressLink href={`/rutina/editar?id=${r.id}`} className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-hover">
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{r.name}</p>
                    <p className="truncate text-sm text-muted">{r.summary}</p>
                  </div>
                  {r.trackStreak && (
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="flex gap-1" aria-label={`Últimas ${r.dots.length}: ${r.dots.filter((d) => d.done).length} hechas`}>
                        {r.dots.map((d) => (
                          <span key={d.date} className={`size-2 rounded-full ${d.done ? "bg-accent" : "border border-line-strong"}`} />
                        ))}
                      </span>
                      <span className="w-10 text-right text-sm tabular-nums">{r.streak > 0 ? `🔥 ${r.streak}` : ""}</span>
                    </div>
                  )}
                </PressLink>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
