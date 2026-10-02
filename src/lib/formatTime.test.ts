import { describe, expect, it } from "vitest";
import { formatHM, formatRelative, isSameLocalDay, toLocalIso } from "./formatTime";

/**
 * Tests de formato de fechas.
 *
 * `toLocalIso` es el formato que usa toda la app para guardar horas, y el
 * comentario en ese archivo documenta el error que ya pasó: usar
 * `datetime('now')` de SQLite (UTC) en vez de hora local corría todos los
 * cálculos por el offset del huso horario. Estos tests fijan ese contrato.
 */

describe("toLocalIso", () => {
  it("da 'YYYY-MM-DDTHH:MM:SS' en hora local", () => {
    const d = new Date(2026, 8, 28, 15, 30, 0); // 28 sep 2026 15:30 local
    expect(toLocalIso(d)).toBe("2026-09-28T15:30:00");
  });

  it("no usa UTC (el error histórico)", () => {
    // Si usara toISOString(), el resultado tendría 'Z' y la hora en UTC.
    const d = new Date(2026, 8, 28, 15, 30, 0);
    const iso = toLocalIso(d);
    expect(iso).not.toContain("Z");
    expect(iso).toBe(d.toLocaleString("sv-SE").replace(" ", "T").slice(0, 19));
  });

  it("rellena con ceros", () => {
    const d = new Date(2026, 0, 5, 9, 5, 0);
    expect(toLocalIso(d)).toBe("2026-01-05T09:05:00");
  });
});

describe("formatHM", () => {
  it("da 'HH:MM'", () => {
    expect(formatHM("2026-09-28T15:30:00")).toBe("15:30");
  });

  it("maneja medianoche", () => {
    expect(formatHM("2026-09-28T00:05:00")).toBe("00:05");
  });
});

describe("formatRelative", () => {
  it("'ahora' si pasó menos de 1 min", () => {
    // formatRelative redondea: 30 s → 1 min. Para "ahora" hace falta < 30 s.
    const d = new Date(Date.now() - 10_000);
    expect(formatRelative(d.toISOString())).toBe("ahora");
  });

  it("'hace N min' dentro de la hora", () => {
    const d = new Date(Date.now() - 15 * 60_000);
    expect(formatRelative(d.toISOString())).toBe("hace 15 min");
  });

  it("'hace N h' pasado una hora", () => {
    const d = new Date(Date.now() - 2 * 60 * 60_000);
    expect(formatRelative(d.toISOString())).toBe("hace 2 h");
  });
});

describe("isSameLocalDay", () => {
  it("mismo día → true", () => {
    const a = new Date(2026, 8, 28, 9, 0, 0);
    const b = new Date(2026, 8, 28, 18, 0, 0);
    expect(isSameLocalDay(a, b)).toBe(true);
  });

  it("día distinto → false", () => {
    const a = new Date(2026, 8, 28, 23, 59, 0);
    const b = new Date(2026, 8, 29, 0, 1, 0);
    expect(isSameLocalDay(a, b)).toBe(false);
  });

  it("cruza medianoche → false", () => {
    const a = new Date(2026, 8, 28, 23, 0, 0);
    const b = new Date(2026, 8, 29, 1, 0, 0);
    expect(isSameLocalDay(a, b)).toBe(false);
  });
});
