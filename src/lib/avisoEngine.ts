import { Item, itemKey, Settings } from "./types";

export interface AvisoLogEntry {
  count: number;
  lastFiredAt: number;
}

/** Log de avisos ya disparados. En memoria del proceso — se pierde al reiniciar
 * la app (sancionado por docs/FILOSOFIA.md: "en memoria... o en notification_log
 * si queremos que sobreviva a reinicios — decidir cuando lleguemos"). */
export type NotifiedLog = Map<string, AvisoLogEntry>;

function parseHM(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

function isWorkTime(now: Date, settings: Settings): boolean {
  const isoDow = now.getDay() === 0 ? 7 : now.getDay(); // 1=lunes..7=domingo
  const workDays = settings.work_days.split(",").map((s) => parseInt(s.trim(), 10));
  if (!workDays.includes(isoDow)) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= parseHM(settings.work_start) && nowMin <= parseHM(settings.work_end);
}

/**
 * Decide, para este instante, cuál ítem (si alguno) debe disparar un aviso —
 * cortesía / al filo / vencida con techo de reintentos, tal como describe
 * "El motor de avisos" en docs/FILOSOFIA.md. Escribe en `log` cuando dispara
 * un aviso (para no repetirlo) — es el único efecto secundario permitido.
 */
export function computeActiveAviso(
  items: Item[],
  settings: Settings,
  now: Date,
  log: NotifiedLog
): Item | null {
  if (!isWorkTime(now, settings)) return null;
  const nowMs = now.getTime();

  const candidates = items.filter(
    (i) => i.status === "pendiente" || i.status === "en_progreso"
  );

  for (const item of candidates) {
    // Un ítem virtual (ocurrencia de una recurrencia sin materializar
    // todavía, ver mergeOccurrences) no tiene `id` — antes eso lo excluía
    // acá directo y nunca disparaba aviso, aunque sí apareciera "vencida"
    // en las listas (que no filtran por id). `itemKey` da un identificador
    // estable para ambos casos, real o virtual.
    const key0 = itemKey(item);

    if (item.snoozed_until) {
      const snoozeMs = new Date(item.snoozed_until).getTime();
      if (nowMs < snoozeMs) continue; // todavía esperando el pospuesto: no evaluar nada más
      const key = `snooze:${key0}:${item.snoozed_until}`;
      if (!log.has(key)) {
        log.set(key, { count: 1, lastFiredAt: nowMs });
        return item;
      }
      // Ya avisó el pospuesto y no hubo respuesta: seguir de largo hacia la
      // lógica normal de abajo (vencida/reintentos), en vez de callarse para
      // siempre. Sin este fall-through, un pospón sin respuesta silenciaba el
      // ítem hasta que se completara/saltara manualmente.
    }

    const relevantTime = item.due_time ?? item.fixed_time;
    if (!relevantTime) continue;
    const targetMs = new Date(relevantTime).getTime();

    if (item.remind_before_min != null) {
      const courtesyMs = targetMs - item.remind_before_min * 60_000;
      const key = `cortesia:${key0}`;
      if (nowMs >= courtesyMs && nowMs < targetMs && !log.has(key)) {
        log.set(key, { count: 1, lastFiredAt: nowMs });
        return item;
      }
    }

    // Ventana de 1 min de tolerancia para no perder el tick exacto.
    const ontimeKey = `al_filo:${key0}`;
    if (nowMs >= targetMs && nowMs < targetMs + 60_000 && !log.has(ontimeKey)) {
      log.set(ontimeKey, { count: 1, lastFiredAt: nowMs });
      return item;
    }

    if (item.due_time && nowMs >= targetMs + 60_000) {
      const key = `vencida:${key0}`;
      const entry = log.get(key);
      const retryMs = settings.overdue_retry_min * 60_000;
      if (!entry) {
        log.set(key, { count: 1, lastFiredAt: nowMs });
        return item;
      }
      if (entry.count < settings.overdue_retry_max && nowMs - entry.lastFiredAt >= retryMs) {
        entry.count += 1;
        entry.lastFiredAt = nowMs;
        return item;
      }
    }
  }

  return null;
}
