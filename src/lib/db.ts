import Database from "@tauri-apps/plugin-sql";
import { toLocalIso } from "./formatTime";
import {
  Item,
  NewItem,
  NewRecurrenceRule,
  RecurrenceRule,
  Settings,
  newItemSchema,
  newRecurrenceRuleSchema,
} from "./types";

const DB_NAME = "sqlite:agenda.db";

let dbPromise: Promise<Database> | null = null;

function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_NAME);
  }
  return dbPromise;
}

export async function listItems(): Promise<Item[]> {
  const db = await getDb();
  return await db.select<Item[]>(
    "SELECT * FROM item WHERE status != 'archivada' ORDER BY COALESCE(fixed_time, due_time) ASC"
  );
}

export async function addItem(input: NewItem): Promise<void> {
  const item = newItemSchema.parse(input);
  const db = await getDb();
  await db.execute(
    `INSERT INTO item (title, notes, fixed_time, due_time, priority, status, remind_before_min)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      item.title,
      item.notes ?? null,
      item.fixed_time ?? null,
      item.due_time ?? null,
      item.priority,
      item.status,
      item.remind_before_min ?? null,
    ]
  );
}

export async function completeItem(id: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE item SET status = 'hecha', completed_at = datetime('now') WHERE id = ?",
    [id]
  );
}

export async function skipItem(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE item SET status = 'saltada' WHERE id = ?", [id]);
}

export async function snoozeItem(id: number, minutes: number): Promise<void> {
  const db = await getDb();
  // Calculado acá, en JS, en vez de con `datetime('now', ...)` de SQLite
  // (que da UTC) — ver el comentario de `toLocalIso` para el porqué.
  const snoozedUntil = toLocalIso(new Date(Date.now() + minutes * 60_000));
  await db.execute("UPDATE item SET snoozed_until = ? WHERE id = ?", [snoozedUntil, id]);
}

export async function deleteItem(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM item WHERE id = ?", [id]);
}

/** Botón manual "vaciar completadas": pasa hechas/saltadas a `archivada`, que
 * `listItems()` ya excluye. No las borra — quedan en la tabla por si algún
 * día se quiere ver un historial. */
export async function archiveCompleted(): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE item SET status = 'archivada' WHERE status IN ('hecha', 'saltada')");
}

export async function listRecurrenceRules(): Promise<RecurrenceRule[]> {
  const db = await getDb();
  return await db.select<RecurrenceRule[]>("SELECT * FROM recurrence_rule WHERE active = 1");
}

export async function createRecurrenceRule(input: NewRecurrenceRule): Promise<void> {
  const rule = newRecurrenceRuleSchema.parse(input);
  const db = await getDb();
  await db.execute(
    `INSERT INTO recurrence_rule
      (title, notes, freq, interval_n, weekdays, month_day, at_time, is_due, priority, remind_before_min, starts_on, ends_on, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      rule.title,
      rule.notes ?? null,
      rule.freq,
      rule.interval_n,
      rule.weekdays ?? null,
      rule.month_day ?? null,
      rule.at_time,
      rule.is_due,
      rule.priority,
      rule.remind_before_min ?? null,
      rule.starts_on,
      rule.ends_on ?? null,
      rule.active,
    ]
  );
}

/**
 * "La regla es la verdad": una recurrencia no tiene fila en `item` hasta que
 * pasa algo distinto de lo normal (se completa, se salta o se pospone esa
 * fecha puntual). Esta función crea esa fila — la excepción — recién en ese
 * momento. `rule_id` + `occurrence_date` identifican de qué ocurrencia es,
 * y el índice único de la migración evita crear dos excepciones para la
 * misma fecha de la misma regla.
 */
export async function materializeOccurrence(rule: RecurrenceRule, date: string): Promise<number> {
  const db = await getDb();
  const when = `${date}T${rule.at_time}`;
  const result = await db.execute(
    `INSERT INTO item (title, notes, fixed_time, due_time, priority, status, remind_before_min, rule_id, occurrence_date)
     VALUES (?, ?, ?, ?, ?, 'pendiente', ?, ?, ?)`,
    [
      rule.title,
      rule.notes ?? null,
      rule.is_due ? null : when,
      rule.is_due ? when : null,
      rule.priority,
      rule.remind_before_min ?? null,
      rule.id,
      date,
    ]
  );
  if (result.lastInsertId == null) {
    throw new Error("no se pudo materializar la ocurrencia: la DB no devolvió un id");
  }
  return result.lastInsertId;
}

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.select<Settings[]>("SELECT * FROM settings WHERE id = 1");
  return rows[0];
}

export async function updateSettings(partial: Partial<Omit<Settings, "id">>): Promise<void> {
  const entries = Object.entries(partial).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;
  const db = await getDb();
  const setClause = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, v]) => v);
  await db.execute(`UPDATE settings SET ${setClause} WHERE id = 1`, values);
}
