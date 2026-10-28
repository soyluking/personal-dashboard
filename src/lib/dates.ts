// Fechas como "YYYY-MM-DD" en la zona horaria fija del dashboard.
const TIME_ZONE = "America/Santiago";

export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TIME_ZONE }).format(now);
}

// Hora actual «HH:MM» en la zona del dashboard.
export function nowTime(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
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
