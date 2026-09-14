import { Item } from "./types";

export interface TodayZones {
  vencidas: Item[];
  destacado: Item[];
  resto: Item[];
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
    if (!isSameDay(relevantDate, now)) continue;
    if (relevantDate.getTime() < now.getTime()) continue; // cita ya pasada, sin due_time: fuera de vista

    if (relevantDate.getTime() - now.getTime() <= threeHoursMs) destacado.push(item);
    else resto.push(item);
  }

  return { vencidas, destacado, resto };
}

/** Ítems sin fixed_time ni due_time: "algún día", viven en el backlog. */
export function backlogItems(items: Item[]): Item[] {
  return items.filter(
    (i) => (i.status === "pendiente" || i.status === "en_progreso") && !i.fixed_time && !i.due_time
  );
}
