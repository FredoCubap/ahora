import { z } from "zod";

export const PRIORITIES = ["baja", "media", "alta"] as const;
export const STATUSES = ["pendiente", "en_progreso", "hecha", "saltada", "archivada"] as const;

export type Priority = (typeof PRIORITIES)[number];
export type Status = (typeof STATUSES)[number];

export const itemSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1),
  notes: z.string().nullable().optional(),
  fixed_time: z.string().nullable().optional(),
  due_time: z.string().nullable().optional(),
  priority: z.enum(PRIORITIES).default("media"),
  status: z.enum(STATUSES).default("pendiente"),
  remind_before_min: z.number().nullable().optional(),
  snoozed_until: z.string().nullable().optional(),
  // "En seguimiento" (docs/FILOSOFIA.md): relleno + sin fixed_time/due_time =
  // el ítem se comporta como seguimiento, no como cita ni tarea.
  waiting_on: z.string().nullable().optional(),
  nag_interval_min: z.number().nullable().optional(),
  last_nagged_at: z.string().nullable().optional(),
  nagged_today_count: z.number().default(0),
  rule_id: z.number().nullable().optional(),
  occurrence_date: z.string().nullable().optional(),
  created_at: z.string().optional(),
  completed_at: z.string().nullable().optional(),
});

export type Item = z.infer<typeof itemSchema>;

/** `key` de React para un ítem: los reales usan su `id`; los virtuales
 * (ocurrencias de una recurrencia sin materializar, ver mergeOccurrences)
 * no tienen `id` todavía, así que se identifican por regla + fecha. */
export function itemKey(item: Item): string {
  return item.id != null ? `item:${item.id}` : `occ:${item.rule_id}:${item.occurrence_date}`;
}

export const newItemSchema = itemSchema.omit({
  id: true,
  created_at: true,
  completed_at: true,
});

// z.input (no z.infer/z.output): campos con `.default(...)` — priority,
// status, nagged_today_count — deben quedar opcionales para quien
// CONSTRUYE un NewItem antes de parsear. z.infer da el tipo de SALIDA de
// parse(), donde el default ya se aplicó y por eso son obligatorios; eso
// forzaría a todo caller a inventarse un valor que igual va a ser pisado.
export type NewItem = z.input<typeof newItemSchema>;

export const settingsSchema = z.object({
  id: z.literal(1),
  work_start: z.string(),
  work_end: z.string(),
  work_days: z.string(),
  snooze_min: z.number(),
  overdue_retry_min: z.number(),
  overdue_retry_max: z.number(),
  seguimiento_interval_min: z.number(),
  seguimiento_daily_cap: z.number(),
});

export type Settings = z.infer<typeof settingsSchema>;

export const FREQS = ["diaria", "semanal", "mensual"] as const;
export type Freq = (typeof FREQS)[number];

// Fila cruda de la tabla `recurrence_rule`. `is_due`/`active` son INTEGER en
// SQLite (0/1) — por eso van como number, no boolean, tanto acá como en el
// struct de Rust que recibe estas mismas filas.
export const recurrenceRuleSchema = z.object({
  id: z.number(),
  title: z.string().min(1),
  notes: z.string().nullable().optional(),
  freq: z.enum(FREQS),
  interval_n: z.number(),
  weekdays: z.string().nullable().optional(),
  month_day: z.number().nullable().optional(),
  at_time: z.string(),
  is_due: z.number(),
  priority: z.enum(PRIORITIES),
  remind_before_min: z.number().nullable().optional(),
  starts_on: z.string(),
  ends_on: z.string().nullable().optional(),
  active: z.number(),
  created_at: z.string().optional(),
});

export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>;

export const newRecurrenceRuleSchema = recurrenceRuleSchema.omit({ id: true, created_at: true });
export type NewRecurrenceRule = z.infer<typeof newRecurrenceRuleSchema>;

/** Una fecha calculada por el comando Rust `expand_recurrences`. */
export interface Occurrence {
  rule_id: number;
  date: string;
  at_time: string;
}
