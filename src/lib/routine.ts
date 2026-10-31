import { addDays, daysBetween, isoWeekday } from "./dates";

// Reglas de la rutina: qué toca cada día y las rachas. Sin base de datos:
// la rutina no se copia como tareas, se calcula desde horarios y excepciones.

export type Slot = {
  id?: number;
  time: string | null;
  frequency: "diaria" | "semanal";
  interval: number;
  weekdays: number[];
  anchor: string;
  validFrom: string;
  validTo: string | null;
};

export type RoutineException = {
  // Fecha original de la ocurrencia.
  date: string;
  kind: "saltar" | "cambiar";
  newDate: string | null;
  newTime: string | null;
};

export type Occurrence = {
  // Fecha original: identifica la ocurrencia (registro y excepción).
  date: string;
  time: string | null;
  // Fecha en que se muestra: la original o la de un «cambiar».
  shownOn: string;
};

const mod = (n: number, m: number) => ((n % m) + m) % m;
const monday = (iso: string) => addDays(iso, 1 - isoWeekday(iso));

// El horario que hace tocar la rutina ese día, si hay.
export function slotOn(slots: Slot[], day: string): Slot | null {
  return (
    slots.find((s) => {
      if (day < s.validFrom || (s.validTo !== null && day > s.validTo)) return false;
      const every = Math.max(1, s.interval);
      if (s.frequency === "diaria") return mod(daysBetween(s.anchor, day), every) === 0;
      if (!s.weekdays.includes(isoWeekday(day))) return false;
      return mod(daysBetween(monday(s.anchor), monday(day)) / 7, every) === 0;
    }) ?? null
  );
}

// La ocurrencia con fecha original `day`, aplicando su excepción. null si no toca o se saltó.
function occurrence(slots: Slot[], byDate: Map<string, RoutineException>, day: string): Occurrence | null {
  const slot = slotOn(slots, day);
  if (!slot) return null;
  const ex = byDate.get(day);
  if (ex?.kind === "saltar") return null;
  return {
    date: day,
    time: ex?.newTime ?? slot.time,
    shownOn: ex?.newDate ?? day,
  };
}

const index = (exceptions: RoutineException[]) => new Map(exceptions.map((e) => [e.date, e]));

// Lo que se muestra en `day`: la ocurrencia propia si no se movió, más las movidas hacia ese día.
// Una excepción sobre un día que ya no toca deja de aplicar.
export function occurrencesOn(slots: Slot[], exceptions: RoutineException[], day: string): Occurrence[] {
  const byDate = index(exceptions);
  const origins = new Set([day, ...exceptions.filter((e) => e.newDate === day).map((e) => e.date)]);
  return [...origins]
    .map((d) => occurrence(slots, byDate, d))
    .filter((o): o is Occurrence => o !== null && o.shownOn === day);
}

// Hasta dónde mirar hacia adelante por ocurrencias movidas a antes (hechas por adelantado).
const LOOKAHEAD_DAYS = 31;

// Ocurrencias ya resueltas, de la más reciente a la más antigua: hechas, o pasadas sin hacer.
// Las de hoy o después sin marcar todavía no cuentan.
export function resolved(
  slots: Slot[],
  exceptions: RoutineException[],
  done: Set<string>,
  today: string,
  limit = Infinity,
): { date: string; done: boolean }[] {
  if (slots.length === 0) return [];
  const byDate = index(exceptions);
  const start = slots.reduce((min, s) => (s.validFrom < min ? s.validFrom : min), slots[0].validFrom);
  const out: { date: string; done: boolean }[] = [];
  for (let day = addDays(today, LOOKAHEAD_DAYS); day >= start && out.length < limit; day = addDays(day, -1)) {
    const o = occurrence(slots, byDate, day);
    if (!o) continue;
    if (done.has(day)) out.push({ date: day, done: true });
    else if (o.shownOn < today) out.push({ date: day, done: false });
  }
  return out;
}

// Ocurrencias seguidas cumplidas, no días de calendario: box lun/mié/vie lleva 3 tras una semana.
export function streak(history: { done: boolean }[]): number {
  const cut = history.findIndex((h) => !h.done);
  return cut === -1 ? history.length : cut;
}

// «Nunca falles dos veces»: la última ocurrencia resuelta quedó sin hacer.
export function missedLast(history: { done: boolean }[]): boolean {
  return history.length > 0 && !history[0].done;
}

// Una rutina ocurre a lo más una vez por día: dos horarios no pueden compartir días.
export function slotsOverlap(slots: Pick<Slot, "frequency" | "weekdays">[]): boolean {
  if (slots.length > 1 && slots.some((s) => s.frequency === "diaria")) return true;
  const days = slots.flatMap((s) => s.weekdays);
  return new Set(days).size !== days.length;
}

// Cambiar horarios desde `from`: lo que empezaba desde ese día se borra, lo vigente se cierra
// el día anterior y lo nuevo abre ese día. El pasado se sigue calculando con su horario.
export function replaceSlotsFrom(current: Slot[], next: Omit<Slot, "validFrom" | "validTo">[], from: string) {
  const remove = current.filter((s) => s.validFrom >= from).map((s) => s.id!);
  const close = current
    .filter((s) => s.validFrom < from && (s.validTo === null || s.validTo >= from))
    .map((s) => s.id!);
  const insert: Slot[] = next.map((s) => ({ ...s, validFrom: from, validTo: null }));
  return { remove, close, closeOn: addDays(from, -1), insert };
}

const DAY_NAMES = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

// Resumen corto de un horario: «lun mié vie · 8:30», «cada 2 semanas: sáb dom».
export function describeSlot(s: Pick<Slot, "frequency" | "interval" | "weekdays" | "time">): string {
  let when: string;
  if (s.frequency === "diaria") when = s.interval > 1 ? `cada ${s.interval} días` : "todos los días";
  else {
    const days = [...s.weekdays].sort().join(",");
    const names =
      days === "1,2,3,4,5" ? "lun a vie" : days === "6,7" ? "fin de semana" : days === "1,2,3,4,5,6,7" ? "todos los días" : [...s.weekdays].sort().map((d) => DAY_NAMES[d - 1]).join(" ");
    when = s.interval > 1 ? `cada ${s.interval} semanas: ${names}` : names;
  }
  return s.time ? `${when} · ${s.time.slice(0, 5).replace(/^0/, "")}` : when;
}
