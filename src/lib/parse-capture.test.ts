import { describe, expect, it } from "vitest";
import { parseCapture, parseEdit } from "./parse-capture";

// 2026-10-26 es lunes.
const today = "2026-10-26";

describe("parseCapture", () => {
  it("sin fecha ni hora va a la bandeja", () => {
    expect(parseCapture("comprar pan", today)).toEqual({ text: "comprar pan", date: null, time: null });
  });

  it("mañana con hora", () => {
    expect(parseCapture("llamar al banco mañana 15:30", today)).toEqual({
      text: "llamar al banco",
      date: "2026-10-27",
      time: "15:30",
    });
  });

  it("hora sin fecha es para hoy", () => {
    expect(parseCapture("dentista a las 5pm", today)).toEqual({ text: "dentista", date: today, time: "17:00" });
  });

  it("el nombre del día de hoy apunta a la semana siguiente", () => {
    expect(parseCapture("reunión el lunes", today).date).toBe("2026-11-02");
    expect(parseCapture("reunión el miércoles", today).date).toBe("2026-10-28");
  });

  it("dd/mm pasada salta al año siguiente", () => {
    expect(parseCapture("pagar 5/3", today).date).toBe("2027-03-05");
    expect(parseCapture("pagar 28/10", today).date).toBe("2026-10-28");
  });

  it("si todo es fecha, conserva el texto original", () => {
    expect(parseCapture("mañana", today).text).toBe("mañana");
  });
});

describe("parseEdit", () => {
  it("sin fecha escrita mantiene la fecha de la tarea", () => {
    expect(parseEdit("llamar al banco 16:00", "2026-10-28", today)).toEqual({
      text: "llamar al banco",
      date: "2026-10-28",
      time: "16:00",
    });
  });

  it("borrar la hora deja la tarea sin hora", () => {
    expect(parseEdit("llamar al banco", "2026-10-28", today).time).toBeNull();
  });

  it("una fecha escrita mueve la tarea", () => {
    expect(parseEdit("llamar al banco mañana", "2026-10-28", today).date).toBe("2026-10-27");
  });

  it("en la bandeja, poner hora la deja para hoy", () => {
    expect(parseEdit("dentista 17:00", null, today).date).toBe(today);
  });
});
