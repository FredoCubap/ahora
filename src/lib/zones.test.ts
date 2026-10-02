import { describe, expect, it } from "vitest";
import { backlogItems, diasAbiertos, seguimientoItems, zonifyToday } from "./zones";
import { Item } from "./types";

/**
 * Tests del particionado de zonas (docs/FILOSOFIA.md, "Vista principal").
 *
 * `zonifyToday` decide qué se ve en la pantalla principal y en qué zona. Es
 * lógica pura con varios bordes: citas ya pasadas, ítems de otro día, backlog
 * vs seguimiento. Un error acá es un ítem que no se ve o que se ve en el lugar
 * equivocado — y no se nota hasta que pasa.
 */

function item(p: Partial<Item> = {}): Item {
  return {
    id: 1,
    title: "Test",
    status: "pendiente",
    priority: "media",
    nagged_today_count: 0,
    ...p,
  } as Item;
}

/** "Ahora" fijo: un martes a las 10:00. */
function now(): Date {
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
  return d;
}

function at(hours: number, minutes = 0): string {
  const d = now();
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

describe("zonifyToday", () => {
  it("una tarea vencida va a vencidas", () => {
    const i = item({ due_time: at(8, 0) });
    const z = zonifyToday([i], now());
    expect(z.vencidas).toContain(i);
    expect(z.destacado).not.toContain(i);
    expect(z.resto).not.toContain(i);
  });

  it("una tarea dentro de las próximas 3 h va a destacado", () => {
    const i = item({ due_time: at(12, 0) }); // +2 h
    const z = zonifyToday([i], now());
    expect(z.destacado).toContain(i);
  });

  it("una tarea de más de 3 h va a resto", () => {
    const i = item({ due_time: at(15, 0) }); // +5 h
    const z = zonifyToday([i], now());
    expect(z.resto).toContain(i);
  });

  it("una cita ya pasada (sin due_time) no aparece en ninguna zona", () => {
    // Es la regla de "una cita que ya pasó no compite visualmente con lo
    // urgente" — docs/FILOSOFIA.md. No es un bug, es deliberado.
    const i = item({ fixed_time: at(8, 0) });
    const z = zonifyToday([i], now());
    expect(z.vencidas).not.toContain(i);
    expect(z.destacado).not.toContain(i);
    expect(z.resto).not.toContain(i);
  });

  it("una cita futura va a destacado o resto", () => {
    const i = item({ fixed_time: at(11, 0) }); // +1 h
    const z = zonifyToday([i], now());
    expect(z.destacado).toContain(i);
  });

  it("un ítem de otro día no aparece", () => {
    const manana = now();
    manana.setDate(manana.getDate() + 1);
    const i = item({ due_time: manana.toISOString() });
    const z = zonifyToday([i], now());
    expect(z.vencidas).not.toContain(i);
    expect(z.destacado).not.toContain(i);
    expect(z.resto).not.toContain(i);
  });

  it("un ítem sin hora no aparece en las zonas de hoy", () => {
    const i = item({ waiting_on: "algo" });
    const z = zonifyToday([i], now());
    expect(z.vencidas).not.toContain(i);
    expect(z.destacado).not.toContain(i);
    expect(z.resto).not.toContain(i);
  });

  it("un ítem hecha no aparece en ninguna zona", () => {
    const i = item({ status: "hecha", due_time: at(8, 0) });
    const z = zonifyToday([i], now());
    expect(z.vencidas).not.toContain(i);
    expect(z.destacado).not.toContain(i);
    expect(z.resto).not.toContain(i);
  });

  it("un ítem en_progreso sí aparece (sigue activo)", () => {
    const i = item({ status: "en_progreso", due_time: at(8, 0) });
    const z = zonifyToday([i], now());
    expect(z.vencidas).toContain(i);
  });
});

describe("backlogItems", () => {
  it("un ítem sin fixed_time ni due_time es backlog", () => {
    const i = item();
    expect(backlogItems([i])).toContain(i);
  });

  it("un ítem con waiting_on NO es backlog (es seguimiento)", () => {
    const i = item({ waiting_on: "algo" });
    expect(backlogItems([i])).not.toContain(i);
  });

  it("un ítem con due_time no es backlog", () => {
    const i = item({ due_time: at(15, 0) });
    expect(backlogItems([i])).not.toContain(i);
  });
});

describe("seguimientoItems", () => {
  it("un ítem con waiting_on y sin tiempos es seguimiento", () => {
    const i = item({ waiting_on: "esperando" });
    expect(seguimientoItems([i])).toContain(i);
  });

  it("un ítem sin waiting_on no es seguimiento", () => {
    const i = item();
    expect(seguimientoItems([i])).not.toContain(i);
  });

  it("un ítem con waiting_on pero con due_time no es seguimiento", () => {
    const i = item({ waiting_on: "algo", due_time: at(15, 0) });
    expect(seguimientoItems([i])).not.toContain(i);
  });
});

describe("diasAbiertos", () => {
  it("cuenta los días desde created_at", () => {
    const created = now();
    created.setDate(created.getDate() - 3);
    const i = item({ created_at: created.toISOString() });
    expect(diasAbiertos(i, now())).toBe(3);
  });

  it("un ítem creado hoy da 0", () => {
    const i = item({ created_at: now().toISOString() });
    expect(diasAbiertos(i, now())).toBe(0);
  });

  it("sin created_at da 0", () => {
    const i = item();
    expect(diasAbiertos(i, now())).toBe(0);
  });
});
