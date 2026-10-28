import { describe, expect, it } from "vitest";
import { isAllowedEmail } from "./allowed-email";

const allowed = "yo@example.com";

describe("isAllowedEmail", () => {
  it("deja entrar al correo permitido sin importar mayúsculas", () => {
    expect(isAllowedEmail("Yo@Example.com", allowed)).toBe(true);
  });

  it("rechaza cualquier otro correo", () => {
    expect(isAllowedEmail("otro@example.com", allowed)).toBe(false);
  });

  it("sin correo permitido configurado no entra nadie", () => {
    expect(isAllowedEmail("yo@example.com", undefined)).toBe(false);
    expect(isAllowedEmail("yo@example.com", "")).toBe(false);
  });

  it("sin sesión no entra", () => {
    expect(isAllowedEmail(undefined, allowed)).toBe(false);
  });
});
