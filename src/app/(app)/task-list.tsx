"use client";

import { useEffect, useLayoutEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type Modifier } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { nowTime } from "@/lib/dates";
import { STARS_PER_DONE, type Experience } from "@/lib/experiences";
import { chime } from "./chime";
import { Chispa, cheer, greeting, type Line } from "./chispa";
import { discardTask, postponeTask, reorderTasks, restoreTask, setTaskDone } from "./actions";
import { changeOccurrence, restoreOccurrence, setRoutineDone } from "./rutina/actions";
import { Icon } from "./nav-icons";
import { SwipeRow } from "./swipe-row";
import { TaskText } from "./task-text";

export type ListTask = {
  // Único en la lista: tareas y rutina comparten números de id.
  key: string;
  id: number;
  text: string;
  time: string | null;
  done: boolean;
  postponements: number;
  // Menú o decisión, ya renderizados en el servidor.
  menu: React.ReactNode;
  // Solo la rutina: fecha original de la ocurrencia, racha y «nunca falles dos veces».
  routine?: { date: string; streak: number | null; warn: boolean };
};

// Lo hecho baja a su sección después de esta pausa: tapar otra tarea con el dedo mientras salta es peor que esperar.
const SETTLE_MS = 700;
const COLORS = ["#3f6fe6", "#8b5cf6", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4"];
// Mientras se edita el texto, mantener presionado mueve el cursor, no la fila.
const inField = (target: EventTarget | null) => target instanceof Element && target.closest("input, textarea") !== null;
class RowTouchSensor extends TouchSensor {
  static activators = [
    { eventName: "onTouchStart" as const, handler: ({ nativeEvent: e }: React.TouchEvent) => e.touches.length === 1 && !inField(e.target) },
  ];
}
class RowMouseSensor extends MouseSensor {
  static activators = [{ eventName: "onMouseDown" as const, handler: ({ nativeEvent: e }: React.MouseEvent) => e.button === 0 && !inField(e.target) }];
}

// Arrastrar solo sube o baja.
const vertical: Modifier = ({ transform }) => ({ ...transform, x: 0 });
const dragA11y = {
  screenReaderInstructions: {
    draggable: "Para reordenar, presiona espacio, muévela con las flechas y presiona espacio otra vez para soltarla.",
  },
  announcements: {
    onDragStart: () => "Tarea tomada.",
    onDragOver: () => undefined,
    onDragEnd: () => "Tarea soltada.",
    onDragCancel: () => "Sin cambios.",
  },
};
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Look = Pick<Experience, "overdueAlert" | "postponeCounter" | "collapseDone" | "reward">;

type Props = {
  tasks: ListTask[];
  day: string;
  // Hora del servidor («HH:MM»); solo hoy se marca lo vencido (`trackOverdue` en falso para otros días).
  now: string;
  trackOverdue: boolean;
  look: Look;
  // Estrellas ganadas hasta ahora según el servidor (premio «chispa»).
  stars: number;
  name: string | null;
};

export function TaskList({ tasks, day, now, trackOverdue, look, stars, name }: Props) {
  const chispa = look.reward === "chispa";
  const [clock, setClock] = useState(now);
  useEffect(() => {
    if (!trackOverdue) return;
    const tick = () => setClock(nowTime());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [trackOverdue]);
  const [showDone, setShowDone] = useState(false);
  const [optimistic, setOptimistic] = useOptimistic(tasks, (all, p: Change) => {
    if ("order" in p) {
      // Las reordenadas se reparten en los mismos lugares que ocupaban, en el orden nuevo.
      const moved = new Set(p.order);
      const queue = p.order.map((key) => all.find((t) => t.key === key)!);
      let i = 0;
      return all.map((t) => (moved.has(t.key) ? queue[i++] : t));
    }
    return p.remove ? all.filter((t) => t.key !== p.key) : all.map((t) => (t.key === p.key ? { ...t, done: p.done ?? t.done } : t));
  });
  const [, startTransition] = useTransition();
  // Tareas recién marcadas que aún no bajan a «Completadas»: dan tiempo a la animación.
  const [waiting, setWaiting] = useState<Set<string>>(new Set());
  const [burst, setBurst] = useState<string | null>(null);
  const [confetti, setConfetti] = useState<{ left: number; delay: number; color: string; spin: number }[] | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const tops = useRef(new Map<string, number>());
  // Al soltar, la fila ya está donde queda: la animación FLIP la haría saltar desde su lugar viejo.
  const skipFlip = useRef(false);

  const orderKey = (t: ListTask) => t.done && !waiting.has(t.key);
  const pending = optimistic.filter((t) => !orderKey(t));
  const finished = optimistic.filter(orderKey);
  const ordered = [...pending, ...finished];

  const total = optimistic.length;
  const doneCount = optimistic.filter((t) => t.done).length;
  // Lo marcado o desmarcado mientras el servidor no responde ya cuenta.
  const starCount = stars + STARS_PER_DONE * (doneCount - tasks.filter((t) => t.done).length);
  const [line, setLine] = useState<{ line: Line; key: number }>(() => ({ line: greeting(name, now, tasks.length === 0), key: 0 }));

  // FLIP: cada fila anima desde donde estaba hasta donde quedó.
  const order = ordered.map((t) => t.key).join(",");
  useLayoutEffect(() => {
    const next = new Map<string, number>();
    rows.current.forEach((el, id) => next.set(id, el.getBoundingClientRect().top));
    if (!reducedMotion() && !skipFlip.current) {
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
    skipFlip.current = false;
  }, [order]);

  // Se reordena a mano solo lo pendiente sin hora: la hora manda y la rutina queda fija.
  const movable = pending.filter((t) => !t.routine && t.time === null && !t.done);
  const movableKeys = movable.map((t) => t.key);
  // En el celular se toma manteniendo presionado: el toque edita y moverse de inmediato es scroll o swipe.
  const sensors = useSensors(
    useSensor(RowTouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(RowMouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [dragging, setDragging] = useState(false);
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(false);
    if (!over || active.id === over.id) return;
    const next = arrayMove(movableKeys, movableKeys.indexOf(String(active.id)), movableKeys.indexOf(String(over.id)));
    const ids = next.map((key) => movable.find((t) => t.key === key)!.id);
    skipFlip.current = true;
    navigator.vibrate?.(8);
    startTransition(async () => {
      setOptimistic({ order: next });
      await reorderTasks(day, ids);
    });
  };

  const toggle = (t: ListTask) => {
    const done = !t.done;
    navigator.vibrate?.(done ? 12 : 6);
    const setWaitingFor = (wait: boolean) =>
      setWaiting((w) => {
        const next = new Set(w);
        if (wait) next.add(t.key);
        else next.delete(t.key);
        return next;
      });
    if (done && chispa) {
      const allDone = doneCount + 1 === total;
      chime(allDone);
      setLine((l) => ({ line: cheer(allDone), key: l.key + 1 }));
    }
    if (done && !reducedMotion()) {
      setWaitingFor(true);
      setTimeout(() => setWaitingFor(false), SETTLE_MS);
      setBurst(t.key);
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
      setOptimistic({ key: t.key, done });
      const data = new FormData();
      data.set("done", String(done));
      if (t.routine) {
        data.set("routineId", String(t.id));
        data.set("date", t.routine.date);
        await setRoutineDone(data);
      } else {
        data.set("id", String(t.id));
        await setTaskDone(data);
      }
    });
  };

  // Aviso con «Deshacer» tras cada gesto: una tarea mal deslizada no se pierde.
  const [toast, setToast] = useState<{ key: number; message: string; undo: () => void } | null>(null);
  const toastKey = useRef(0);
  const showToast = (message: string, undo: () => void) => setToast({ key: ++toastKey.current, message, undo });
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  const leave = (t: ListTask, action: (data: FormData) => Promise<void>, message: string) => {
    startTransition(async () => {
      setOptimistic({ key: t.key, remove: true });
      const data = new FormData();
      data.set("id", String(t.id));
      await action(data);
    });
    const undo = () => {
      setToast(null);
      startTransition(async () => {
        const data = new FormData();
        data.set("id", String(t.id));
        data.set("date", day);
        data.set("postponements", String(t.postponements));
        await restoreTask(data);
      });
    };
    showToast(message, undo);
  };

  // Saltar la rutina este día: ni suma ni corta la racha.
  const skip = (t: ListTask) => {
    const data = new FormData();
    data.set("routineId", String(t.id));
    data.set("date", t.routine!.date);
    startTransition(async () => {
      setOptimistic({ key: t.key, remove: true });
      data.set("kind", "saltar");
      await changeOccurrence(data);
    });
    showToast("Saltada este día", () => {
      setToast(null);
      startTransition(() => restoreOccurrence(data));
    });
  };

  const complete = (t: ListTask) => {
    toggle(t);
    showToast(t.routine ? "Hecha" : "Tarea completada", () => {
      setToast(null);
      toggle({ ...t, done: true });
    });
  };

  const rowRef = (key: string) => (el: HTMLLIElement | null) => void (el ? rows.current.set(key, el) : rows.current.delete(key));
  const row = (t: ListTask) =>
    movable.length > 1 && movableKeys.includes(t.key) ? (
      <SortableRow key={t.key} id={t.key} rowRef={rowRef(t.key)}>
        {body(t)}
      </SortableRow>
    ) : (
      <li key={t.key} ref={rowRef(t.key)}>
        {body(t)}
      </li>
    );

  const body = (t: ListTask) => {
    const overdue = look.overdueAlert && trackOverdue && !t.done && t.time !== null && t.time.slice(0, 5) < clock;
    return (
        <SwipeRow
          enabled={!t.done && !dragging}
          onComplete={() => complete(t)}
          actions={
            t.routine
              ? [{ label: "Saltar", tone: "amber", onClick: () => skip(t) }]
              : [
                  { label: "Postergar", tone: "amber", onClick: () => leave(t, postponeTask, "Tarea postergada") },
                  { label: "Descartar", tone: "red", onClick: () => leave(t, discardTask, "Tarea descartada") },
                ]
          }
        >
        <div
          className={`row-in relative flex select-none [-webkit-touch-callout:none] flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-hover claro:rounded-2xl claro:bg-card claro:px-4 claro:py-3 claro:shadow-[0_1px_4px_rgb(43_34_64/0.08)] ${
            overdue ? "bg-red-500/10" : ""
          } ${chispa && burst === t.key ? "pop" : ""}`}
        >
          {chispa && burst === t.key && (
            <span aria-hidden className="float-up pointer-events-none absolute left-9 top-0 text-sm font-bold text-star">
              +{STARS_PER_DONE} ⭐
            </span>
          )}
          <Check done={t.done} burst={burst === t.key} onToggle={() => toggle(t)} />
          {t.routine ? (
            <span className={`flex min-w-0 flex-1 items-center gap-1.5 ${t.done ? "text-muted" : ""}`}>
              <span aria-label="Rutina" className="shrink-0 text-muted">
                <Icon size={15}>
                  <path d="M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3" />
                </Icon>
              </span>
              <span className={`min-w-0 truncate ${t.done ? "strike" : ""}`}>{t.text}</span>
              {t.routine.warn && !t.done && <span className="shrink-0 text-xs text-amber-300">la última no; hoy no falles</span>}
            </span>
          ) : (
            <TaskText id={t.id} text={t.text} time={t.time} done={t.done} />
          )}
          {t.routine?.streak ? <span className="text-sm tabular-nums text-muted">🔥 {t.routine.streak}</span> : null}
          {look.postponeCounter && t.postponements > 0 && (
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
        </SwipeRow>
    );
  };

  return (
    <>
      {chispa ? (
        <Chispa line={line.line} lineKey={line.key} glow={doneCount} stars={starCount} />
      ) : (
        total > 0 && <Progress done={doneCount} total={total} />
      )}
      <DndContext id="hoy" sensors={sensors} collisionDetection={closestCenter} modifiers={[vertical]} onDragStart={() => {
          setDragging(true);
          navigator.vibrate?.(10);
        }}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(false)}
        accessibility={dragA11y}
      >
      <SortableContext items={movableKeys} strategy={verticalListSortingStrategy}>
      <ul className="flex flex-col claro:gap-2">
        {pending.map(row)}
        {!look.collapseDone && finished.map(row)}
        {look.collapseDone && finished.length > 0 && (
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
        {look.collapseDone && showDone && finished.map(row)}
      </ul>
      </SortableContext>
      </DndContext>
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6rem)] z-30 flex justify-center px-5">
          <div key={toast.key} role="status" className="glass row-in pointer-events-auto flex items-center gap-4 rounded-full py-2 pl-5 pr-2 text-sm">
            {toast.message}
            <button onClick={toast.undo} className="rounded-full bg-selected px-3 py-1.5 font-medium transition-transform active:scale-95">
              Deshacer
            </button>
          </div>
        </div>
      )}
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

type Change = { key: string; done?: boolean; remove?: boolean } | { order: string[] };

// Fila que se arrastra completa. Soltarla no cuenta como toque: no abre la edición.
function SortableRow({ id, rowRef, children }: { id: string; rowRef: (el: HTMLLIElement | null) => void; children: React.ReactNode }) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id });
  const dragged = useRef(false);
  useEffect(() => {
    if (isDragging) dragged.current = true;
  }, [isDragging]);
  return (
    <li
      ref={(el) => {
        setNodeRef(el);
        // El teclado reordena solo con el foco en la fila: espacio o Enter dentro de ella (al editar, en ✓ o «⋯») son de ese elemento.
        setActivatorNodeRef(el);
        rowRef(el);
      }}
      {...attributes}
      {...listeners}
      role={undefined}
      onPointerDownCapture={() => void (dragged.current = false)}
      onClickCapture={(e) => {
        if (!dragged.current) return;
        e.stopPropagation();
        e.preventDefault();
        dragged.current = false;
      }}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={isDragging ? "relative z-10 scale-[1.02] rounded-lg bg-surface shadow-lg" : undefined}
    >
      {children}
    </li>
  );
}

function Check({ done, burst, onToggle }: { done: boolean; burst: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={done ? "Marcar pendiente" : "Marcar completada"}
      className={`check relative flex size-6 shrink-0 items-center justify-center rounded-md border claro:size-7 claro:rounded-full claro:border-2 transition-[background-color,border-color,transform] duration-200 active:scale-90 ${
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
