import { describe, expect, it } from "vitest";
import { parseQuickCapture } from "./parseQuickCapture";

/**
 * Tests del parser de captura rápida (docs/FILOSOFIA.md, "Entrada rápida").
 *
 * Puro string → estructura. Es la puerta de entrada de todo lo que el usuario
 * escribe, y tiene bastantes casos: hoy/mañana, días de semana, horas en
 * varios formatos, y la distinción cita/tarea ("antes de" / "para las").
 */

/** "Ahora" fijo: un martes a las 10:00. */
function now(): Date {
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
  return d;
}

describe("parseQuickCapture", () => {
  it("reconoce 'hoy' con hora", () => {
    const r = parseQuickCapture("llamar a Juan hoy 15:30", now());
    expect(r.title).toBe("llamar a Juan");
    expect(r.fixed_time).toBeDefined();
    expect(r.fixed_time).toContain("15:30:00");
    expect(r.label).toContain("hoy");
  });

  it("reconoce 'mañana'", () => {
    const r = parseQuickCapture("pagar factura mañana 09:00", now());
    expect(r.title).toBe("pagar factura");
    expect(r.label).toContain("mañana");
  });

  it("reconoce un día de semana", () => {
    const r = parseQuickCapture("reunión viernes 14:00", now());
    expect(r.title).toBe("reunión");
    expect(r.label).toContain("viernes");
  });

  it("reconoce 'a las N' sin minutos", () => {
    const r = parseQuickCapture("cena a las 20", now());
    expect(r.fixed_time).toContain("20:00:00");
  });

  it("reconoce formato am/pm", () => {
    const r = parseQuickCapture("llamada a las 3 pm", now());
    expect(r.fixed_time).toContain("15:00:00");
  });

  it("'antes de' lo marca como tarea (due_time)", () => {
    const r = parseQuickCapture("entregar informe antes de 17:00", now());
    expect(r.due_time).toBeDefined();
    expect(r.fixed_time).toBeUndefined();
    expect(r.label).toContain("tarea");
  });

  it("'para las' también es tarea", () => {
    const r = parseQuickCapture("enviar mail para las 12:00", now());
    expect(r.due_time).toBeDefined();
  });

  it("sin 'antes de' es una cita (fixed_time)", () => {
    const r = parseQuickCapture("llamada 16:00", now());
    expect(r.fixed_time).toBeDefined();
    expect(r.due_time).toBeUndefined();
    expect(r.label).toContain("cita");
  });

  it("sin hora no pone tiempos", () => {
    const r = parseQuickCapture("comprar leche", now());
    expect(r.fixed_time).toBeUndefined();
    expect(r.due_time).toBeUndefined();
    expect(r.title).toBe("comprar leche");
  });

  it("limpia las palabras de tiempo del título", () => {
    const r = parseQuickCapture("llamar a Juan mañana a las 15:30", now());
    expect(r.title).toBe("llamar a Juan");
  });

  it("maneja tildes en los días", () => {
    const r = parseQuickCapture("pago miércoles 10:00", now());
    expect(r.label).toContain("miércoles");
  });
});
