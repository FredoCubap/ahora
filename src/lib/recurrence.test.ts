import { describe, expect, it } from "vitest";
import { addDays, mergeOccurrences, toDateStr } from "./recurrence";
import { Item, Occurrence, RecurrenceRule } from "./types";

/**
 * Tests del merge de recurrencias (docs/FILOSOFIA.md, "Tareas recurrentes").
 *
 * `mergeOccurrences` junta los ítems reales con las ocurrencias virtuales de las
 * reglas. La parte sutil es la excepción: si ya existe una fila real para una
 * ocurrencia (porque se completó, saltó o pospuso), la virtual no debe aparecer.
 * Y si se borra esa fila, la virtual resucita — ese es el bug que ya pasó una
 * vez (ver el comentario en useAppStore.deleteItem).
 */

function rule(p: Partial<RecurrenceRule> = {}): RecurrenceRule {
  return {
    id: 1,
    title: "Diaria",
    freq: "diaria",
    interval_n: 1,
    at_time: "09:00",
    is_due: 0,
    priority: "media",
    starts_on: "2026-01-01",
    active: 1,
    ...p,
  } as RecurrenceRule;
}

function occ(date: string, ruleId = 1): Occurrence {
  return { rule_id: ruleId, date, at_time: "09:00" };
}

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

describe("toDateStr", () => {
  it("da 'YYYY-MM-DD' en hora local", () => {
    expect(toDateStr(new Date(2026, 8, 28))).toBe("2026-09-28");
  });

  it("rellena con ceros", () => {
    expect(toDateStr(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("addDays", () => {
  it("suma días", () => {
    expect(toDateStr(addDays(new Date(2026, 8, 28), 3))).toBe("2026-10-01");
  });

  it("resta días", () => {
    expect(toDateStr(addDays(new Date(2026, 8, 28), -1))).toBe("2026-09-27");
  });

  it("cruza de mes", () => {
    expect(toDateStr(addDays(new Date(2026, 8, 30), 1))).toBe("2026-10-01");
  });
});

describe("mergeOccurrences", () => {
  it("agrega ocurrencias virtuales cuando no hay fila real", () => {
    const r = rule();
    const merged = mergeOccurrences([], [r], [occ("2026-09-28")]);
    expect(merged).toHaveLength(1);
    expect(merged[0].rule_id).toBe(1);
    expect(merged[0].occurrence_date).toBe("2026-09-28");
    expect(merged[0].id).toBeUndefined(); // virtual, sin fila todavía
  });

  it("la fila real manda sobre la virtual (la excepción)", () => {
    const r = rule();
    const real = item({
      id: 42,
      rule_id: 1,
      occurrence_date: "2026-09-28",
      status: "hecha",
    });
    const merged = mergeOccurrences([real], [r], [occ("2026-09-28")]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe(42);
    expect(merged[0].status).toBe("hecha");
  });

  it("no duplica: una ocurrencia con fila real no aparece dos veces", () => {
    const r = rule();
    const real = item({ id: 42, rule_id: 1, occurrence_date: "2026-09-28" });
    const merged = mergeOccurrences([real], [r], [occ("2026-09-28"), occ("2026-09-29")]);
    expect(merged).toHaveLength(2);
  });

  it("una ocurrencia de otra regla no se mezcla", () => {
    const r1 = rule({ id: 1 });
    const r2 = rule({ id: 2 });
    const merged = mergeOccurrences([], [r1, r2], [occ("2026-09-28", 1), occ("2026-09-28", 2)]);
    expect(merged).toHaveLength(2);
    expect(merged.map((i) => i.rule_id).sort()).toEqual([1, 2]);
  });

  it("sin reglas no mergea nada", () => {
    expect(mergeOccurrences([], [], [occ("2026-09-28")])).toHaveLength(0);
  });

  it("una regla inactiva igual mergea (la filtra otro lado)", () => {
    // mergeOccurrences no mira `active`: la regla es la fuente de verdad y el
    // que decide qué se ve es el caller. Acá solo se verifica que no explota.
    const r = rule({ active: 0 });
    const merged = mergeOccurrences([], [r], [occ("2026-09-28")]);
    expect(merged).toHaveLength(1);
  });
});
