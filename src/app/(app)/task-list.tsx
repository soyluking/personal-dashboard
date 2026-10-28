"use client";

import { useEffect, useLayoutEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { nowTime } from "@/lib/dates";
import { setTaskDone } from "./actions";
import { TaskText } from "./task-text";

export type ListTask = {
  id: number;
  text: string;
  time: string | null;
  done: boolean;
  postponements: number;
  // Menú o decisión, ya renderizados en el servidor.
  menu: React.ReactNode;
};

// Lo hecho baja a su sección después de esta pausa: tapar otra tarea con el dedo mientras salta es peor que esperar.
const SETTLE_MS = 700;
const COLORS = ["#3f6fe6", "#8b5cf6", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4"];
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// `now` es la hora del servidor («HH:MM»); solo hoy se marca lo vencido (`overdue` en falso para otros días).
export function TaskList({ tasks, now, trackOverdue }: { tasks: ListTask[]; now: string; trackOverdue: boolean }) {
  const [clock, setClock] = useState(now);
  useEffect(() => {
    if (!trackOverdue) return;
    const tick = () => setClock(nowTime());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [trackOverdue]);
  const [showDone, setShowDone] = useState(false);
  const [optimistic, setOptimistic] = useOptimistic(tasks, (all, p: { id: number; done: boolean }) =>
    all.map((t) => (t.id === p.id ? { ...t, done: p.done } : t)),
  );
  const [, startTransition] = useTransition();
  // Tareas recién marcadas que aún no bajan a «Completadas»: dan tiempo a la animación.
  const [waiting, setWaiting] = useState<Set<number>>(new Set());
  const [burst, setBurst] = useState<number | null>(null);
  const [confetti, setConfetti] = useState<{ left: number; delay: number; color: string; spin: number }[] | null>(null);
  const rows = useRef(new Map<number, HTMLLIElement>());
  const tops = useRef(new Map<number, number>());

  const orderKey = (t: ListTask) => t.done && !waiting.has(t.id);
  const pending = optimistic.filter((t) => !orderKey(t));
  const finished = optimistic.filter(orderKey);
  const ordered = [...pending, ...finished];

  const total = optimistic.length;
  const doneCount = optimistic.filter((t) => t.done).length;

  // FLIP: cada fila anima desde donde estaba hasta donde quedó.
  const order = ordered.map((t) => t.id).join(",");
  useLayoutEffect(() => {
    const next = new Map<number, number>();
    rows.current.forEach((el, id) => next.set(id, el.getBoundingClientRect().top));
    if (!reducedMotion()) {
      next.forEach((top, id) => {
        const before = tops.current.get(id);
        const el = rows.current.get(id);
        if (before === undefined || !el || Math.abs(before - top) < 1) return;
        el.animate([{ transform: `translateY(${before - top}px)` }, { transform: "none" }], {
          duration: 320,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        });
      });
    }
    tops.current = next;
  }, [order]);

  const toggle = (t: ListTask) => {
    const done = !t.done;
    navigator.vibrate?.(done ? 12 : 6);
    const setWaitingFor = (wait: boolean) =>
      setWaiting((w) => {
        const next = new Set(w);
        if (wait) next.add(t.id);
        else next.delete(t.id);
        return next;
      });
    if (done && !reducedMotion()) {
      setWaitingFor(true);
      setTimeout(() => setWaitingFor(false), SETTLE_MS);
      setBurst(t.id);
      setTimeout(() => setBurst(null), 700);
      if (doneCount + 1 === total) {
        setConfetti(
          Array.from({ length: 36 }, () => ({
            left: Math.random() * 100,
            delay: Math.random() * 0.4,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            spin: 180 + Math.random() * 540,
          })),
        );
        setTimeout(() => setConfetti(null), 2200);
      }
    }
    if (!done) setWaitingFor(false);
    startTransition(async () => {
      setOptimistic({ id: t.id, done });
      const data = new FormData();
      data.set("id", String(t.id));
      data.set("done", String(done));
      await setTaskDone(data);
    });
  };

  const row = (t: ListTask) => {
    const overdue = trackOverdue && !t.done && t.time !== null && t.time.slice(0, 5) < clock;
    return (
      <li key={t.id} ref={(el) => void (el ? rows.current.set(t.id, el) : rows.current.delete(t.id))}>
        <div
          className={`row-in flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-hover ${
            overdue ? "bg-red-500/10" : ""
          }`}
        >
          <Check done={t.done} burst={burst === t.id} onToggle={() => toggle(t)} />
          <TaskText id={t.id} text={t.text} time={t.time} done={t.done} />
          {t.postponements > 0 && (
            <span
              className={`rounded-md px-1.5 py-0.5 text-xs ${
                t.postponements >= 3 ? "bg-amber-500/20 text-amber-300" : "bg-hover text-muted"
              }`}
            >
              ↻ {t.postponements}
            </span>
          )}
          {t.time && (
            <span className={`text-sm tabular-nums ${overdue ? "font-medium text-red-400" : "text-muted"}`}>
              {t.time.slice(0, 5)}
              {overdue && <span className="sr-only"> (vencida)</span>}
            </span>
          )}
          {!t.done && t.menu}
        </div>
      </li>
    );
  };

  return (
    <>
      {total > 0 && <Progress done={doneCount} total={total} />}
      <ul className="flex flex-col">
        {pending.map(row)}
        {finished.length > 0 && (
          <li>
            <button
              type="button"
              onClick={() => setShowDone(!showDone)}
              aria-expanded={showDone}
              className="flex w-full items-center gap-1.5 px-2 pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-muted transition-colors hover:text-foreground"
            >
              <span aria-hidden className={`transition-transform ${showDone ? "rotate-90" : ""}`}>›</span>
              Completadas ({finished.length})
            </button>
          </li>
        )}
        {showDone && finished.map(row)}
      </ul>
      {confetti && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {confetti.map((c, i) => (
            <span
              key={i}
              className="confetti"
              style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s`, ["--spin" as string]: `${c.spin}deg` }}
            />
          ))}
        </div>
      )}
    </>
  );
}

function Check({ done, burst, onToggle }: { done: boolean; burst: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={done ? "Marcar pendiente" : "Marcar completada"}
      className={`check relative flex size-6 shrink-0 items-center justify-center rounded-md border transition-[background-color,border-color,transform] duration-200 active:scale-90 ${
        done ? "check-done border-accent bg-accent" : "border-line-strong hover:border-accent"
      }`}
    >
      <svg viewBox="0 0 16 16" className="size-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 8.5l3 3 6-7" className="check-path" />
      </svg>
      {burst &&
        COLORS.map((c, i) => (
          <span key={c} aria-hidden className="burst" style={{ background: c, ["--a" as string]: `${i * 60}deg` }} />
        ))}
    </button>
  );
}

// Anillo del día. Solo motiva: el balance entre áreas se mide con rachas y notas, no contando tareas.
function Progress({ done, total }: { done: number; total: number }) {
  const R = 15;
  const C = 2 * Math.PI * R;
  const all = done === total;
  return (
    <div className="mb-3 flex items-center gap-3 px-2">
      <svg viewBox="0 0 36 36" className={`size-9 -rotate-90 ${all ? "ring-glow" : ""}`} aria-hidden>
        <circle cx="18" cy="18" r={R} fill="none" stroke="var(--line-strong)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          stroke={all ? "#22c55e" : "var(--accent)"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - done / total)}
          style={{ transition: "stroke-dashoffset 500ms cubic-bezier(0.2, 0.8, 0.2, 1), stroke 300ms" }}
        />
      </svg>
      <p className="text-sm text-muted">
        <span className="font-medium tabular-nums text-foreground">{done}</span> de {total} completadas
        {all && " · ¡Día completo!"}
      </p>
    </div>
  );
}
