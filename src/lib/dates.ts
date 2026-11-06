// Fechas como "YYYY-MM-DD". «Hoy» y «ahora» dependen de la zona horaria del dispositivo,
// que el servidor conoce por una cookie (ver time-zone.ts); sin ella, la de Santiago.
export const DEFAULT_TIME_ZONE = "America/Santiago";

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function todayISO(timeZone: string = DEFAULT_TIME_ZONE, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone }).format(now);
}

// Hora actual «HH:MM».
export function nowTime(timeZone: string = DEFAULT_TIME_ZONE, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// 0 = domingo … 6 = sábado.
export function weekday(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${iso}T00:00:00Z`));
}

// Para pantallas angostas: «mié, 28 oct».
export function formatDayShort(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(new Date(`${iso}T00:00:00Z`))
    .replace(/\./g, "");
}

// Días de `from` a `to` (negativo si `to` es antes).
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

// Día ISO: 1 = lunes … 7 = domingo.
export function isoWeekday(iso: string): number {
  return weekday(iso) || 7;
}
