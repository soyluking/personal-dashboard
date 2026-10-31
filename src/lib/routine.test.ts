import { describe, expect, it } from "vitest";
import { missedLast, occurrencesOn, replaceSlotsFrom, resolved, slotOn, slotsOverlap, streak, type Slot } from "./routine";

// 2026-11-02 es lunes.
const weekly = (weekdays: number[], extra: Partial<Slot> = {}): Slot => ({
  time: "08:30",
  frequency: "semanal",
  interval: 1,
  weekdays,
  anchor: "2026-11-02",
  validFrom: "2026-11-02",
  validTo: null,
  ...extra,
});
const daily = (extra: Partial<Slot> = {}): Slot => ({ ...weekly([]), frequency: "diaria", ...extra });

describe("qué toca cada día", () => {
  it("semanal: solo los días elegidos y desde que vale", () => {
    const box = [weekly([1, 3, 5])];
    expect(slotOn(box, "2026-11-02")).not.toBeNull(); // lun
    expect(slotOn(box, "2026-11-03")).toBeNull(); // mar
    expect(slotOn(box, "2026-11-06")).not.toBeNull(); // vie
    expect(slotOn(box, "2026-10-30")).toBeNull(); // vie, antes de crearla
  });

  it("semana por medio se cuenta desde la semana del ancla, aunque el ancla no sea lunes", () => {
    const ame = [weekly([6, 7], { interval: 2, anchor: "2026-11-04", validFrom: "2026-11-01" })];
    expect(slotOn(ame, "2026-11-07")).not.toBeNull();
    expect(slotOn(ame, "2026-11-14")).toBeNull();
    expect(slotOn(ame, "2026-11-21")).not.toBeNull();
  });

  it("cada N días desde el ancla", () => {
    const cada3 = [daily({ interval: 3 })];
    expect(slotOn(cada3, "2026-11-05")).not.toBeNull();
    expect(slotOn(cada3, "2026-11-06")).toBeNull();
  });

  it("cambiar de días desde una fecha no reescribe el pasado", () => {
    const { remove, close, closeOn, insert } = replaceSlotsFrom(
      [weekly([1, 3, 5], { id: 1 })],
      [{ ...weekly([2, 4]), validFrom: undefined, validTo: undefined } as never],
      "2026-11-09",
    );
    expect({ remove, close, closeOn }).toEqual({ remove: [], close: [1], closeOn: "2026-11-08" });
    const slots = [weekly([1, 3, 5], { validTo: closeOn }), ...insert];
    expect(slotOn(slots, "2026-11-06")?.weekdays).toEqual([1, 3, 5]); // vie pasado sigue tocando
    expect(slotOn(slots, "2026-11-13")).toBeNull(); // vie siguiente ya no
    expect(slotOn(slots, "2026-11-10")?.weekdays).toEqual([2, 4]);
  });

  it("un horario que empezaba desde esa fecha se reemplaza, no se cierra", () => {
    const r = replaceSlotsFrom([weekly([1], { id: 7, validFrom: "2026-11-09" })], [], "2026-11-09");
    expect(r.remove).toEqual([7]);
    expect(r.close).toEqual([]);
  });

  it("dos horarios de una rutina no pueden compartir día", () => {
    expect(slotsOverlap([weekly([1, 3, 5]), weekly([6, 7])])).toBe(false);
    expect(slotsOverlap([weekly([1, 3]), weekly([3])])).toBe(true);
    expect(slotsOverlap([daily(), weekly([6])])).toBe(true);
  });
});

describe("excepciones", () => {
  const box = [weekly([1, 3, 5])];

  it("saltar saca la ocurrencia del día", () => {
    expect(occurrencesOn(box, [{ date: "2026-11-04", kind: "saltar", newDate: null, newTime: null }], "2026-11-04")).toEqual([]);
  });

  it("otra hora cambia solo ese día", () => {
    const ex = [{ date: "2026-11-04", kind: "cambiar" as const, newDate: null, newTime: "19:00" }];
    expect(occurrencesOn(box, ex, "2026-11-04")).toEqual([{ date: "2026-11-04", time: "19:00", shownOn: "2026-11-04" }]);
    expect(occurrencesOn(box, ex, "2026-11-06")[0].time).toBe("08:30");
  });

  it("mover la saca de su día y la muestra en el nuevo, con su fecha original", () => {
    const ex = [{ date: "2026-11-04", kind: "cambiar" as const, newDate: "2026-11-05", newTime: null }];
    expect(occurrencesOn(box, ex, "2026-11-04")).toEqual([]);
    expect(occurrencesOn(box, ex, "2026-11-05")).toEqual([{ date: "2026-11-04", time: "08:30", shownOn: "2026-11-05" }]);
  });

  it("una excepción en un día que ya no toca deja de aplicar", () => {
    const ex = [{ date: "2026-11-03", kind: "cambiar" as const, newDate: "2026-11-05", newTime: null }];
    expect(occurrencesOn(box, ex, "2026-11-05")).toEqual([]);
  });
});

describe("rachas", () => {
  const history = (slots: Slot[], done: string[], today: string, exceptions = []) =>
    resolved(slots, exceptions, new Set(done), today);

  it("cuenta ocurrencias, no días: box lun/mié/vie lleva 3 tras una semana", () => {
    const h = history([weekly([1, 3, 5])], ["2026-11-02", "2026-11-04", "2026-11-06"], "2026-11-08");
    expect(streak(h)).toBe(3);
  });

  it("un día sin marcar corta la racha (sin estado «no cumplido» aparte)", () => {
    const dormir = [daily()];
    const done = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-06", "2026-11-07"];
    expect(streak(history(dormir, done, "2026-11-08"))).toBe(2);
    expect(streak(history(dormir, done, "2026-11-09"))).toBe(0); // el 8 quedó sin marcar
  });

  it("la de hoy sin marcar no corta hasta que termina el día", () => {
    expect(streak(history([daily()], ["2026-11-02", "2026-11-03"], "2026-11-04"))).toBe(2);
  });

  it("las saltadas a propósito ni suman ni cortan", () => {
    const skip = [{ date: "2026-11-03", kind: "saltar", newDate: null, newTime: null }] as never;
    expect(streak(history([daily()], ["2026-11-02", "2026-11-04"], "2026-11-05", skip))).toBe(2);
  });

  it("una movida y hecha en su nuevo día cuenta", () => {
    const moved = [{ date: "2026-11-04", kind: "cambiar", newDate: "2026-11-05", newTime: null }] as never;
    expect(streak(history([weekly([1, 3, 5])], ["2026-11-02", "2026-11-04"], "2026-11-06", moved))).toBe(2);
  });

  it("«nunca falles dos veces»: avisa cuando la última quedó sin hacer", () => {
    expect(missedLast(history([daily()], ["2026-11-02"], "2026-11-04"))).toBe(true);
    expect(missedLast(history([daily()], ["2026-11-02", "2026-11-03"], "2026-11-04"))).toBe(false);
  });
});
