import { isSameLocalDay } from "./formatTime";
import { Item } from "./types";

export interface TodayZones {
  vencidas: Item[];
  destacado: Item[];
  resto: Item[];
}

/**
 * Divide los ítems activos de hoy en las tres zonas de "Ahora y a
 * continuación" (docs/FILOSOFIA.md). Ítems sin hora o fuera de hoy no
 * aparecen acá — viven en Semana/backlog.
 */
export function zonifyToday(items: Item[], now: Date = new Date()): TodayZones {
  const active = items.filter((i) => i.status === "pendiente" || i.status === "en_progreso");
  const vencidas: Item[] = [];
  const destacado: Item[] = [];
  const resto: Item[] = [];
  const threeHoursMs = 3 * 60 * 60 * 1000;

  for (const item of active) {
    if (item.due_time) {
      const due = new Date(item.due_time);
      if (due.getTime() < now.getTime()) {
        vencidas.push(item);
        continue;
      }
    }

    const relevant = item.fixed_time ?? item.due_time;
    if (!relevant) continue;
    const relevantDate = new Date(relevant);
    if (!isSameLocalDay(relevantDate, now)) continue;
    if (relevantDate.getTime() < now.getTime()) continue; // cita ya pasada, sin due_time: fuera de vista

    if (relevantDate.getTime() - now.getTime() <= threeHoursMs) destacado.push(item);
    else resto.push(item);
  }

  return { vencidas, destacado, resto };
}

/** Ítems sin fixed_time ni due_time: "algún día", viven en el backlog.
 * Un ítem "en seguimiento" tampoco tiene tiempos, pero no es backlog — ver
 * seguimientoItems más abajo. */
export function backlogItems(items: Item[]): Item[] {
  return items.filter(
    (i) =>
      (i.status === "pendiente" || i.status === "en_progreso") &&
      !i.fixed_time &&
      !i.due_time &&
      !i.waiting_on
  );
}

/** Ítems "en seguimiento" (docs/FILOSOFIA.md): `waiting_on` relleno y sin
 * fixed_time/due_time — no son citas ni tareas, son "no perder el hilo". */
export function seguimientoItems(items: Item[]): Item[] {
  return items.filter(
    (i) =>
      (i.status === "pendiente" || i.status === "en_progreso") &&
      !i.fixed_time &&
      !i.due_time &&
      !!i.waiting_on
  );
}

/** Días abiertos desde `created_at`, para el "llevas N días" de seguimiento. */
export function diasAbiertos(item: Item, now: Date = new Date()): number {
  if (!item.created_at) return 0;
  const created = new Date(item.created_at);
  const diffMs = now.getTime() - created.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}
