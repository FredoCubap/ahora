import { Item, NewItem, NewRecurrenceRule, Occurrence, RecurrenceRule, Settings } from "./types";

// Puente al shell Python (ver shell/main.py). pywebview inyecta
// `window.pywebview.api` de forma asíncrona: arranca vacío ({}) y se llena
// recién cuando dispara `pywebviewready`.
export interface PywebviewApi {
  list_items(): Promise<Item[]>;
  add_item(item: NewItem): Promise<void>;
  complete_item(id: number): Promise<void>;
  skip_item(id: number): Promise<void>;
  start_item(id: number): Promise<void>;
  unstart_item(id: number): Promise<void>;
  snooze_item(id: number, snoozedUntilIso: string): Promise<void>;
  record_seguimiento_nag(id: number, naggedAtIso: string, naggedTodayCount: number): Promise<void>;
  delete_item(id: number): Promise<void>;
  archive_completed(): Promise<void>;
  list_recurrence_rules(): Promise<RecurrenceRule[]>;
  create_recurrence_rule(rule: NewRecurrenceRule): Promise<void>;
  materialize_occurrence(rule: RecurrenceRule, date: string): Promise<number>;
  get_settings(): Promise<Settings>;
  update_settings(partial: Partial<Omit<Settings, "id">>): Promise<void>;
  expand_recurrences(rules: RecurrenceRule[], from: string, to: string): Promise<Occurrence[]>;
  /** Archiva las citas cuya hora ya pasó. Devuelve cuántas. */
  auto_archive_missed_citas(): Promise<number>;

  // Sistema operativo — no son datos y no pasan por la DB: los resuelve el
  // shell directamente (el registro de Windows para el autostart, el ícono de
  // bandeja para las notificaciones).
  get_autostart(): Promise<boolean>;
  set_autostart(enabled: boolean): Promise<boolean>;
  notify(title: string, body: string): Promise<boolean>;
  quit(): Promise<void>;
}

declare global {
  interface Window {
    pywebview?: { api: PywebviewApi };
  }
}

let apiPromise: Promise<PywebviewApi> | null = null;

function apiReady(): boolean {
  // `window.pywebview.api` existe desde el arranque, pero vacío ({}) hasta
  // que pywebview termina de inyectar las funciones reales — por eso no
  // alcanza con chequear que `window.pywebview` exista.
  return typeof window.pywebview?.api.list_items === "function";
}

export function getApi(): Promise<PywebviewApi> {
  if (!apiPromise) {
    apiPromise = apiReady()
      ? Promise.resolve(window.pywebview!.api)
      : new Promise((resolve) => {
          window.addEventListener("pywebviewready", () => resolve(window.pywebview!.api), {
            once: true,
          });
        });
  }
  return apiPromise;
}
