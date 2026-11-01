// Orden de «Hoy». La hora manda: lo con hora va por hora y, a igual hora, la rutina primero.
// Lo sin hora va en un bloque: abajo, o arriba si lo nuevo entra arriba (`newOnTop`).
// Dentro del bloque, las tareas siguen el orden a mano (`position`) y las nuevas (sin posición)
// entran al final o, con `newOnTop`, al principio con lo último anotado primero.
// La rutina sin hora queda junto a las tareas: antes de ellas, o después con `newOnTop`.
export type DayItem = {
  time: string | null;
  // Solo tareas; null si nunca se reordenó en este día.
  position: number | null;
  // Id de la tarea: el orden en que se anotó.
  seq: number;
  routine: boolean;
};

export function sortDay<T extends DayItem>(items: T[], newOnTop: boolean): T[] {
  const top = newOnTop ? -1 : 1;
  return items.toSorted((a, b) => {
    if (a.time !== null && b.time !== null) {
      return a.time.localeCompare(b.time) || Number(b.routine) - Number(a.routine) || (a.routine ? 0 : a.seq - b.seq);
    }
    if (a.time !== null) return -top;
    if (b.time !== null) return top;

    if (a.routine || b.routine) return a.routine === b.routine ? 0 : (a.routine ? -1 : 1) * top;

    if (a.position === null && b.position === null) return (a.seq - b.seq) * top;
    if (a.position === null) return top;
    if (b.position === null) return -top;
    return a.position - b.position || a.seq - b.seq;
  });
}
