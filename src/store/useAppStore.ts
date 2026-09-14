import { create } from "zustand";
import * as db from "../lib/db";
import { addDays, expandRecurrences, mergeOccurrences, toDateStr } from "../lib/recurrence";
import { Item, NewItem, NewRecurrenceRule, RecurrenceRule, Settings } from "../lib/types";

const LOOKAHEAD_DAYS = 7;

interface AppState {
  items: Item[];
  rules: RecurrenceRule[];
  settings: Settings | null;
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (input: NewItem) => Promise<void>;
  addRecurrenceRule: (input: NewRecurrenceRule) => Promise<void>;
  completeItem: (item: Item) => Promise<void>;
  skipItem: (item: Item) => Promise<void>;
  snoozeItem: (item: Item, minutes: number) => Promise<void>;
  updateSettings: (partial: Partial<Omit<Settings, "id">>) => Promise<void>;
  archiveCompleted: () => Promise<void>;
}

/**
 * Un ítem real (de la tabla `item`) ya tiene `id` — se usa tal cual. Uno
 * virtual (calculado a partir de una `recurrence_rule`, ver mergeOccurrences)
 * no tiene fila propia todavía: hay que crearla ahora ("materializarla",
 * la excepción de la que habla docs/FILOSOFIA.md) y usar el id que resulta.
 */
async function resolveId(item: Item, rules: RecurrenceRule[]): Promise<number> {
  if (item.id != null) return item.id;

  if (item.rule_id != null && item.occurrence_date != null) {
    const rule = rules.find((r) => r.id === item.rule_id);
    if (!rule) throw new Error(`no se encontró la regla ${item.rule_id} para materializar la ocurrencia`);
    return await db.materializeOccurrence(rule, item.occurrence_date);
  }

  throw new Error("ítem sin id ni datos de ocurrencia: no se puede actuar sobre él");
}

export const useAppStore = create<AppState>((set, get) => ({
  items: [],
  rules: [],
  settings: null,
  loading: true,

  refresh: async () => {
    const today = new Date();
    const from = toDateStr(today);
    const to = toDateStr(addDays(today, LOOKAHEAD_DAYS));

    const [items, settings, rules] = await Promise.all([
      db.listItems(),
      db.getSettings(),
      db.listRecurrenceRules(),
    ]);
    const occurrences = await expandRecurrences(rules, from, to);
    const merged = mergeOccurrences(items, rules, occurrences);

    set({ items: merged, rules, settings, loading: false });
  },

  addItem: async (input) => {
    await db.addItem(input);
    await get().refresh();
  },

  addRecurrenceRule: async (input) => {
    await db.createRecurrenceRule(input);
    await get().refresh();
  },

  completeItem: async (item) => {
    const id = await resolveId(item, get().rules);
    await db.completeItem(id);
    await get().refresh();
  },

  skipItem: async (item) => {
    const id = await resolveId(item, get().rules);
    await db.skipItem(id);
    await get().refresh();
  },

  snoozeItem: async (item, minutes) => {
    const id = await resolveId(item, get().rules);
    await db.snoozeItem(id, minutes);
    await get().refresh();
  },

  updateSettings: async (partial) => {
    await db.updateSettings(partial);
    await get().refresh();
  },

  archiveCompleted: async () => {
    await db.archiveCompleted();
    await get().refresh();
  },
}));
