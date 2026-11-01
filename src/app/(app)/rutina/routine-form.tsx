"use client";

import { useActionState, useState } from "react";
import { saveRoutine, type FormState, type SlotInput } from "./actions";

type Props = {
  today: string;
  areas: readonly string[];
  initial?: { id: number; name: string; trackStreak: boolean; area: string | null; slots: SlotInput[] };
};

type Repeat = "todos" | "semana" | "dias";
const DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const field = "rounded-lg border border-line bg-surface px-3 py-2 text-base outline-none focus:border-line-strong";

const repeatOf = (s: SlotInput): Repeat => (s.frequency === "semanal" ? "semana" : s.interval > 1 ? "dias" : "todos");

// Repetición como Google Calendar: todos los días, algunos días de la semana (cada N semanas) o cada N días.
export function RoutineForm({ today, areas, initial }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveRoutine, {});
  const [slots, setSlots] = useState<SlotInput[]>(
    initial?.slots.map((s) => ({ ...s, time: s.time?.slice(0, 5) ?? null })) ?? [
      { time: null, frequency: "diaria", interval: 1, weekdays: [], anchor: today },
    ],
  );
  const update = (i: number, patch: Partial<SlotInput>) => setSlots(slots.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <form action={action} className="flex flex-col gap-5">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="slots" value={JSON.stringify(slots)} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Nombre</span>
        <input name="name" required defaultValue={initial?.name} autoFocus={!initial} className={field} />
      </label>

      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="trackStreak" defaultChecked={initial?.trackStreak ?? true} className="size-5 accent-[var(--accent)]" />
          <span>Llevar racha</span>
        </label>
        {areas.length === 0 ? (
          // Sin áreas en esta experiencia: se conserva la que tenía.
          <input type="hidden" name="area" value={initial?.area ?? ""} />
        ) : (
        <label className="flex items-center gap-2">
          <span className="text-sm text-muted">Área</span>
          <select name="area" defaultValue={initial?.area ?? ""} className={`${field} py-1.5 capitalize`}>
            <option value="">Sin área</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        )}
      </div>

      {slots.map((s, i) => {
        const repeat = repeatOf(s);
        return (
          <fieldset key={i} className="flex flex-col gap-3 rounded-2xl border border-line p-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={repeat}
                aria-label="Repetición"
                onChange={(e) => {
                  const r = e.target.value as Repeat;
                  update(i, r === "todos" ? { frequency: "diaria", interval: 1, weekdays: [] } : r === "dias" ? { frequency: "diaria", interval: 2, weekdays: [] } : { frequency: "semanal", interval: 1, weekdays: [1, 2, 3, 4, 5] });
                }}
                className={`${field} py-1.5`}
              >
                <option value="todos">Todos los días</option>
                <option value="semana">Algunos días de la semana</option>
                <option value="dias">Cada N días</option>
              </select>
              <input
                type="time"
                value={s.time ?? ""}
                aria-label="Hora (opcional)"
                onChange={(e) => update(i, { time: e.target.value || null })}
                className={`${field} py-1.5`}
              />
              {slots.length > 1 && (
                <button type="button" onClick={() => setSlots(slots.filter((_, j) => j !== i))} className="ml-auto text-sm text-muted hover:text-foreground">
                  Quitar
                </button>
              )}
            </div>

            {repeat === "semana" && (
              <div className="flex gap-1.5" role="group" aria-label="Días">
                {DAYS.map((d, j) => {
                  const on = s.weekdays.includes(j + 1);
                  return (
                    <button
                      key={j}
                      type="button"
                      aria-pressed={on}
                      onClick={() => update(i, { weekdays: on ? s.weekdays.filter((x) => x !== j + 1) : [...s.weekdays, j + 1] })}
                      className={`size-9 rounded-full border text-sm ${on ? "border-accent bg-accent text-white" : "border-line text-muted"}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            )}

            {repeat !== "todos" && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                Cada
                <input
                  type="number"
                  min={repeat === "dias" ? 2 : 1}
                  max={52}
                  value={s.interval}
                  onChange={(e) => update(i, { interval: Number(e.target.value) || 1 })}
                  className={`${field} w-16 py-1 text-center`}
                />
                {repeat === "dias" ? "días" : s.interval > 1 ? "semanas" : "semana"}
                {s.interval > 1 && (
                  <>
                    , contando desde
                    <input type="date" value={s.anchor} onChange={(e) => update(i, { anchor: e.target.value || today })} className={`${field} py-1`} />
                  </>
                )}
              </div>
            )}
          </fieldset>
        );
      })}

      <button
        type="button"
        onClick={() => setSlots([...slots, { time: null, frequency: "semanal", interval: 1, weekdays: [], anchor: today }])}
        className="self-start text-sm text-muted hover:text-foreground"
      >
        + Agregar otro horario
      </button>
      <p className="-mt-3 text-xs text-muted">Para otra hora según el día: ordenar lun mié vie a las 13:00 y el fin de semana a las 10:30.</p>

      {state.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}

      <button disabled={pending} className="self-start rounded-full bg-accent px-5 py-2 font-medium text-white disabled:opacity-60">
        {pending ? "Guardando…" : "Guardar"}
      </button>
      {initial && <p className="-mt-3 text-xs text-muted">Los cambios de hora o días valen desde hoy; los días pasados no cambian.</p>}
    </form>
  );
}
