import { toLocalIso } from "./formatTime";
import { getApi } from "./pywebviewApi";
import {
  Item,
  NewItem,
  NewRecurrenceRule,
  RecurrenceRule,
  Settings,
  newItemSchema,
  newRecurrenceRuleSchema,
} from "./types";

export async function listItems(): Promise<Item[]> {
  const api = await getApi();
  return await api.list_items();
}

export async function addItem(input: NewItem): Promise<void> {
  const item = newItemSchema.parse(input);
  const api = await getApi();
  await api.add_item(item);
}

export async function completeItem(id: number): Promise<void> {
  const api = await getApi();
  await api.complete_item(id);
}

export async function skipItem(id: number): Promise<void> {
  const api = await getApi();
  await api.skip_item(id);
}

/** Marca un ítem como `en_progreso` (empezada). El motor de avisos hace back
 * off parcial: saltea cortesía y al-filo, pero si se vence sigue molestando. */
export async function startItem(id: number): Promise<void> {
  const api = await getApi();
  await api.start_item(id);
}

/** Vuelve un ítem de `en_progreso` a `pendiente`. Es el deshacer del toggle. */
export async function unstartItem(id: number): Promise<void> {
  const api = await getApi();
  await api.unstart_item(id);
}

export async function snoozeItem(id: number, minutes: number): Promise<void> {
  // Calculado acá, en JS, en vez de con `datetime('now', ...)` de SQLite
  // (que da UTC) — ver el comentario de `toLocalIso` para el porqué.
  const snoozedUntil = toLocalIso(new Date(Date.now() + minutes * 60_000));
  const api = await getApi();
  await api.snooze_item(id, snoozedUntil);
}

/** Registra que un ítem "en seguimiento" acaba de avisar: guarda la hora y
 * el contador de hoy que ya calculó avisoEngine (ver ese archivo para el
 * porqué de que esto se persista en vez de vivir solo en el log en memoria). */
export async function recordSeguimientoNag(id: number, naggedTodayCount: number): Promise<void> {
  const api = await getApi();
  await api.record_seguimiento_nag(id, toLocalIso(new Date()), naggedTodayCount);
}

export async function deleteItem(id: number): Promise<void> {
  const api = await getApi();
  await api.delete_item(id);
}

/** Botón manual "vaciar completadas": pasa hechas/saltadas a `archivada`, que
 * `listItems()` ya excluye. No las borra — quedan en la tabla por si algún
 * día se quiere ver un historial. */
export async function archiveCompleted(): Promise<void> {
  const api = await getApi();
  await api.archive_completed();
}

/** Citas cuya hora ya pasó, que se archivan solas (docs/FILOSOFIA.md,
 * "Estados": "cita cuya hora pasó hace más de N minutos sin due"). Devuelve
 * cuántas. No hace falta mirarlo para nada: es higiene, y `listItems()` ya
 * excluía las archivadas, así que el efecto en pantalla es nulo. */
export async function autoArchiveMissedCitas(): Promise<number> {
  const api = await getApi();
  return await api.auto_archive_missed_citas();
}

export async function listRecurrenceRules(): Promise<RecurrenceRule[]> {
  const api = await getApi();
  return await api.list_recurrence_rules();
}

export async function createRecurrenceRule(input: NewRecurrenceRule): Promise<void> {
  const rule = newRecurrenceRuleSchema.parse(input);
  const api = await getApi();
  await api.create_recurrence_rule(rule);
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
  const api = await getApi();
  return await api.materialize_occurrence(rule, date);
}

export async function getSettings(): Promise<Settings> {
  const api = await getApi();
  return await api.get_settings();
}

export async function updateSettings(partial: Partial<Omit<Settings, "id">>): Promise<void> {
  const entries = Object.entries(partial).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;
  const api = await getApi();
  await api.update_settings(Object.fromEntries(entries));
}
