import { describe, expect, it } from "vitest";
import { hotkeyMessage } from "./hotkey";

describe("hotkeyMessage", () => {
  it("no dice nada si el atajo está activo", () => {
    expect(hotkeyMessage(true, { active: true, reason: null })).toBeNull();
  });

  it("no dice nada mientras no se ha podido preguntar el estado", () => {
    expect(hotkeyMessage(true, null)).toBeNull();
  });

  it("avisa cuando otra aplicación tiene la combinación", () => {
    expect(hotkeyMessage(true, { active: false, reason: "ocupado" })).toMatch(/otra aplicación/);
  });

  it("avisa cuando el sistema no lo soporta", () => {
    expect(hotkeyMessage(true, { active: false, reason: "no disponible" })).toMatch(
      /No disponible/,
    );
  });

  it("un atajo apagado a propósito no es un problema", () => {
    expect(hotkeyMessage(false, { active: false, reason: "no disponible" })).toBeNull();
    expect(hotkeyMessage(false, { active: false, reason: "ocupado" })).toBeNull();
  });

  it("explica una combinación rechazada aunque el atajo esté apagado", () => {
    expect(hotkeyMessage(false, { active: false, reason: "invalida" })).toMatch(/no válida/);
  });
});
