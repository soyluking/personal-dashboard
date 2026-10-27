import { addDays, weekday } from "./dates";

export type ParsedCapture = {
  text: string;
  date: string | null;
  time: string | null;
};

const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};

const strip = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "");

// Busca en la versión sin tildes (mismo largo) y corta sobre el original.
function take(text: string, pattern: RegExp) {
  const m = pattern.exec(strip(text));
  if (!m) return null;
  const rest = text.slice(0, m.index) + " " + text.slice(m.index + m[0].length);
  return { match: m, rest };
}

function parseTime(text: string) {
  const hhmm = take(text, /\b(?:a las |a la )?([01]?\d|2[0-3]):([0-5]\d)\b/i);
  if (hhmm) {
    const [, h, m] = hhmm.match;
    return { time: `${h.padStart(2, "0")}:${m}`, rest: hhmm.rest };
  }
  const ampm = take(text, /\b(?:a las |a la )?(1[0-2]|0?[1-9])(?::([0-5]\d))? ?(am|pm)\b/i);
  if (ampm) {
    const [, h, m = "00", mer] = ampm.match;
    const hour = (Number(h) % 12) + (mer.toLowerCase() === "pm" ? 12 : 0);
    return { time: `${String(hour).padStart(2, "0")}:${m}`, rest: ampm.rest };
  }
  const alas = take(text, /\ba las (1?\d|2[0-3])(?: ?h(?:rs?)?)?\b/i);
  if (alas) {
    return { time: `${alas.match[1].padStart(2, "0")}:00`, rest: alas.rest };
  }
  return null;
}

function parseDate(text: string, today: string) {
  const pasado = take(text, /\bpasado manana\b/i);
  if (pasado) return { date: addDays(today, 2), rest: pasado.rest };
  const manana = take(text, /\bmanana\b/i);
  if (manana) return { date: addDays(today, 1), rest: manana.rest };
  const hoy = take(text, /\bhoy\b/i);
  if (hoy) return { date: today, rest: hoy.rest };

  const dia = take(text, /\b(?:el |este |proximo )?(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/i);
  if (dia) {
    const diff = (WEEKDAYS[dia.match[1].toLowerCase()] - weekday(today) + 7) % 7;
    return { date: addDays(today, diff === 0 ? 7 : diff), rest: dia.rest };
  }

  const dm = take(text, /\b(?:el )?(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])\b/);
  if (dm) {
    const [, d, m] = dm.match;
    const year = Number(today.slice(0, 4));
    let date = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    if (date < today) date = `${year + 1}-${date.slice(5)}`;
    return { date, rest: dm.rest };
  }
  return null;
}

function extract(input: string, today: string) {
  let text = input;
  const d = parseDate(text, today);
  if (d) text = d.rest;
  const t = parseTime(text);
  if (t) text = t.rest;

  const clean = text.replace(/\s+/g, " ").replace(/^[\s,.-]+|[\s,.-]+$/g, "");
  return { text: clean || input.trim(), date: d?.date ?? null, time: t?.time ?? null };
}

// Reconoce fecha y hora con reglas simples. Sin fecha ni hora, la tarea va a la bandeja;
// con hora y sin fecha, es para hoy.
export function parseCapture(input: string, today: string): ParsedCapture {
  const { text, date, time } = extract(input, today);
  return { text, date: date ?? (time ? today : null), time };
}

// Al editar, la fecha se mantiene si no se escribe otra. La hora es la que quede
// en el texto: borrarla deja la tarea sin hora.
export function parseEdit(input: string, currentDate: string | null, today: string): ParsedCapture {
  const { text, date, time } = extract(input, today);
  return { text, date: date ?? currentDate ?? (time ? today : null), time };
}
