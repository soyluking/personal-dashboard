import { describe, expect, it } from "vitest";
import { sortDay, type DayItem } from "./order";

const task = (name: string, seq: number, extra: Partial<DayItem> = {}) => ({ name, seq, time: null, position: null, routine: false, ...extra });
const routine = (name: string, time: string | null = null) => ({ name, seq: 0, time, position: null, routine: true });
const names = (items: { name: string }[]) => items.map((i) => i.name);

describe("sortDay", () => {
  it("la hora manda sobre el orden a mano", () => {
    const items = [task("sin hora", 1, { position: 0 }), task("tarde", 2, { time: "18:00" }), task("mañana", 3, { time: "08:00" })];
    expect(names(sortDay(items, false))).toEqual(["mañana", "tarde", "sin hora"]);
  });

  it("a igual hora, la rutina va primero", () => {
    const items = [task("tarea", 1, { time: "08:00" }), routine("rutina", "08:00")];
    expect(names(sortDay(items, false))).toEqual(["rutina", "tarea"]);
    expect(names(sortDay(items, true))).toEqual(["rutina", "tarea"]);
  });

  it("lo sin hora sigue el orden a mano", () => {
    const items = [task("a", 1, { position: 2 }), task("b", 2, { position: 0 }), task("c", 3, { position: 1 })];
    expect(names(sortDay(items, false))).toEqual(["b", "c", "a"]);
    expect(names(sortDay(items, true))).toEqual(["b", "c", "a"]);
  });

  it("lo nuevo entra al final, después de la rutina sin hora", () => {
    const items = [task("nueva", 3), task("ordenada", 1, { position: 0 }), routine("rutina"), task("con hora", 2, { time: "09:00" })];
    expect(names(sortDay(items, false))).toEqual(["con hora", "rutina", "ordenada", "nueva"]);
  });

  it("con lo nuevo arriba, lo sin hora va primero y lo último anotado encabeza", () => {
    const items = [
      task("vieja", 1),
      task("nueva", 4),
      task("ordenada", 2, { position: 0 }),
      routine("rutina"),
      task("con hora", 3, { time: "09:00" }),
    ];
    expect(names(sortDay(items, true))).toEqual(["nueva", "vieja", "ordenada", "rutina", "con hora"]);
  });
});
