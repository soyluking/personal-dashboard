import { describe, expect, it } from "vitest";
import { visibleStreak } from "./experiences";

describe("visibleStreak", () => {
  it("la positiva nunca muestra «0» ni una racha de 1", () => {
    expect(visibleStreak(0, "positiva")).toBeNull();
    expect(visibleStreak(1, "positiva")).toBeNull();
    expect(visibleStreak(2, "positiva")).toBe(2);
  });

  it("la completa muestra la racha desde 1", () => {
    expect(visibleStreak(1, "completa")).toBe(1);
    expect(visibleStreak(0, "completa")).toBeNull();
  });
});
