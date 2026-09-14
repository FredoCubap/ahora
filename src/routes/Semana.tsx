import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { Header } from "../components/Header";
import { ItemRow } from "../components/ItemRow";
import { BottomNav } from "../components/BottomNav";
import { zonifyToday, backlogItems } from "../lib/zones";
import { Item, itemKey } from "../lib/types";

const LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

function startOfWeek(now: Date): Date {
  const d = new Date(now);
  const isoDow = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (isoDow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function summarizeDay(items: Item[], day: Date): string {
  let citas = 0;
  let tareas = 0;
  for (const item of items) {
    if (item.status !== "pendiente" && item.status !== "en_progreso") continue;
    if (item.fixed_time && isSameDay(new Date(item.fixed_time), day)) citas++;
    else if (item.due_time && isSameDay(new Date(item.due_time), day)) tareas++;
  }
  if (citas === 0 && tareas === 0) return "sin planes";
  const parts = [];
  if (citas) parts.push(`${citas} cita${citas > 1 ? "s" : ""}`);
  if (tareas) parts.push(`${tareas} tarea${tareas > 1 ? "s" : ""}`);
  return parts.join(" · ");
}

export function Semana() {
  const items = useAppStore((s) => s.items);
  const refresh = useAppStore((s) => s.refresh);
  const completeItem = useAppStore((s) => s.completeItem);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const now = new Date();
  const monday = startOfWeek(now);
  const days = LETTERS.map((letter, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return { letter, date: d, isToday: isSameDay(d, now) };
  });

  const rangeLabel = `${monday.getDate()} – ${days[6].date.getDate()} de ${new Intl.DateTimeFormat("es-ES", {
    month: "long",
  }).format(monday)}`;

  const todayZones = zonifyToday(items, now);
  const todayItems = [...todayZones.vencidas, ...todayZones.destacado, ...todayZones.resto];

  const upcoming = days
    .filter((d) => d.date.getTime() > now.getTime() && !d.isToday)
    .slice(0, 3)
    .map((d) => ({
      nombre: new Intl.DateTimeFormat("es-ES", { weekday: "long" }).format(d.date),
      resumen: summarizeDay(items, d.date),
    }));

  const backlog = backlogItems(items);

  return (
    <div className="flex flex-col h-full gap-5 p-6 pb-5 overflow-y-auto">
      <Header title="Semana" subtitle={rangeLabel} />

      <div className="flex justify-between">
        {days.map((d) => (
          <div key={d.letter + d.date.toISOString()} className="flex flex-col items-center gap-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--ahora-text-faint)" }}>
              {d.letter}
            </div>
            <div
              className="font-display font-bold text-sm flex items-center justify-center rounded-full"
              style={{
                width: 34,
                height: 34,
                background: d.isToday ? "var(--ahora-accent)" : "transparent",
                color: d.isToday ? "var(--ahora-accent-text)" : "var(--ahora-text-muted)",
              }}
            >
              {d.date.getDate()}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="text-[11px] font-bold uppercase tracking-wide mb-0.5" style={{ color: "var(--ahora-text-faint)" }}>
          Hoy
        </div>
        {todayItems.length === 0 && (
          <div className="text-[13px]" style={{ color: "var(--ahora-text-faint)" }}>
            Nada agendado hoy.
          </div>
        )}
        {todayItems.map((item) => (
          <ItemRow key={itemKey(item)} item={item} variant="compacto" onComplete={completeItem} />
        ))}
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="text-[11px] font-bold uppercase tracking-wide mb-0.5" style={{ color: "var(--ahora-text-faint)" }}>
          Próximos días
        </div>
        {upcoming.map((d) => (
          <div key={d.nombre} className="flex items-center gap-2.5 py-2">
            <div className="flex-1 min-w-0 text-[13px] font-semibold capitalize" style={{ color: "var(--ahora-text)" }}>
              {d.nombre}
            </div>
            <div className="text-xs" style={{ color: "var(--ahora-text-muted)" }}>
              {d.resumen}
            </div>
          </div>
        ))}
      </div>

      <div id="backlog" className="flex flex-col gap-0.5">
        <div className="text-[11px] font-bold uppercase tracking-wide mb-0.5" style={{ color: "var(--ahora-text-faint)" }}>
          Backlog · algún día
        </div>
        {backlog.length === 0 && (
          <div className="text-[13px]" style={{ color: "var(--ahora-text-faint)" }}>
            Vacío por ahora.
          </div>
        )}
        {backlog.map((item) => (
          <ItemRow key={itemKey(item)} item={item} variant="compacto" onComplete={completeItem} />
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
