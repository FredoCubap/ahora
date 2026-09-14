import { invoke } from "@tauri-apps/api/core";
import { Item, Occurrence, RecurrenceRule } from "./types";

/** "YYYY-MM-DD" en horario local (no `toISOString`, que usa UTC y puede
 * correr la fecha un día para atrás/adelante según el huso horario). */
export function toDateStr(d: Date): string {
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Le pide al backend Rust las fechas en las que cae cada regla dentro de
 * `[from, to]` (ambas "YYYY-MM-DD"). El cálculo en sí vive en
 * `expand_recurrences` (src-tauri/src/lib.rs) — acá solo lo invocamos. */
export async function expandRecurrences(
  rules: RecurrenceRule[],
  from: string,
  to: string
): Promise<Occurrence[]> {
  if (rules.length === 0) return [];
  return await invoke<Occurrence[]>("expand_recurrences", { rules, from, to });
}

/**
 * Combina los `item` reales (de la DB) con las ocurrencias virtuales de las
 * reglas de recurrencia, para que el resto de la app (zonas, motor de
 * avisos, pantallas) trabaje con una sola lista de ítems.
 *
 * Una ocurrencia se muestra como virtual (sin `id`) SALVO que ya exista una
 * fila real en `item` para esa misma `(rule_id, occurrence_date)` — eso es
 * una excepción: ya se completó, saltó o pospuso esa fecha puntual, y esa
 * fila real manda por sobre la ocurrencia calculada.
 */
export function mergeOccurrences(
  items: Item[],
  rules: RecurrenceRule[],
  occurrences: Occurrence[]
): Item[] {
  const exceptionKeys = new Set(
    items
      .filter((i) => i.rule_id != null && i.occurrence_date != null)
      .map((i) => `${i.rule_id}:${i.occurrence_date}`)
  );
  const rulesById = new Map(rules.map((r) => [r.id, r]));

  const virtual: Item[] = [];
  for (const occ of occurrences) {
    if (exceptionKeys.has(`${occ.rule_id}:${occ.date}`)) continue;
    const rule = rulesById.get(occ.rule_id);
    if (!rule) continue;

    const when = `${occ.date}T${occ.at_time}`;
    virtual.push({
      title: rule.title,
      notes: rule.notes ?? null,
      fixed_time: rule.is_due ? null : when,
      due_time: rule.is_due ? when : null,
      priority: rule.priority,
      status: "pendiente",
      remind_before_min: rule.remind_before_min ?? null,
      snoozed_until: null,
      rule_id: rule.id,
      occurrence_date: occ.date,
    });
  }

  return [...items, ...virtual];
}
