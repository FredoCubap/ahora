import { useState } from "react";
import { MorphIcon } from "morphicons/react";
import { Circle, CheckCircle2 } from "lucide";
import { Item } from "../lib/types";
import { formatHM, formatRelative } from "../lib/formatTime";
import { ItemActions } from "./ItemActions";

type Variant = "vencida" | "destacado" | "compacto";

interface ItemRowProps {
  item: Item;
  variant: Variant;
  onComplete: (item: Item) => void;
}

function priorityDot(priority: Item["priority"]): { size: string; bg: string; border: string } {
  if (priority === "alta") return { size: "9px", bg: "var(--ahora-accent)", border: "var(--ahora-accent)" };
  if (priority === "media") return { size: "9px", bg: "transparent", border: "var(--ahora-accent)" };
  return { size: "7px", bg: "var(--ahora-text-faint)", border: "var(--ahora-text-faint)" };
}

export function ItemRow({ item, variant, onComplete }: ItemRowProps) {
  const [justCompleted, setJustCompleted] = useState(false);

  function handleComplete() {
    setJustCompleted(true);
    onComplete(item);
  }

  const checkbox = (color: string, size: number) => (
    <button
      onClick={handleComplete}
      aria-label="Marcar como hecho"
      className="flex-shrink-0"
      style={{ width: size + 12, height: size + 12, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <MorphIcon
        icon={justCompleted ? CheckCircle2 : Circle}
        size={size}
        strokeWidth={1.5}
        color={color}
        spring="snappy"
      />
    </button>
  );

  if (variant === "vencida") {
    const time = item.due_time ?? item.fixed_time;
    return (
      <div
        className="flex items-center gap-3 rounded-2xl px-3.5 py-3"
        style={{ background: "var(--ahora-urgent-bg)" }}
      >
        <div
          className="flex-shrink-0 rounded-full"
          style={{ width: 8, height: 8, background: "var(--ahora-urgent)" }}
        />
        <div className="flex flex-1 min-w-0 flex-col gap-0.5">
          <div className="font-semibold text-[15px]" style={{ color: "var(--ahora-text)" }}>
            {item.title}
          </div>
          <div className="text-xs" style={{ color: "var(--ahora-urgent)" }}>
            {time ? `vencía ${formatHM(time)} · ${formatRelative(time)}` : "vencida"}
          </div>
        </div>
        <ItemActions item={item} />
        {checkbox("var(--ahora-urgent)", 14)}
      </div>
    );
  }

  if (variant === "destacado") {
    const time = item.fixed_time ?? item.due_time;
    const dot = priorityDot(item.priority);
    return (
      <div
        className="flex items-center gap-3.5 py-3"
        style={{ borderBottom: "1px solid var(--ahora-border)" }}
      >
        <div className="flex flex-col items-start w-14 flex-shrink-0">
          <div className="font-display font-extrabold text-[19px]" style={{ color: "var(--ahora-text)" }}>
            {time ? formatHM(time) : "—"}
          </div>
          <div
            className="text-[10px] uppercase tracking-wide"
            style={{ color: "var(--ahora-text-faint)" }}
          >
            {item.fixed_time ? "cita" : "límite"}
          </div>
        </div>
        <div
          className="flex-shrink-0 rounded-full"
          style={{ width: dot.size, height: dot.size, background: dot.bg, border: `1.5px solid ${dot.border}` }}
        />
        <div className="flex flex-1 min-w-0 flex-col gap-0.5">
          <div className="font-bold text-[16px]" style={{ color: "var(--ahora-text)" }}>
            {item.title}
          </div>
          {item.notes && (
            <div className="text-xs" style={{ color: "var(--ahora-text-muted)" }}>
              {item.notes}
            </div>
          )}
        </div>
        <ItemActions item={item} />
        {checkbox("var(--ahora-border)", 15)}
      </div>
    );
  }

  const time = item.fixed_time ?? item.due_time;
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <div className="w-10 flex-shrink-0 text-xs" style={{ color: "var(--ahora-text-faint)" }}>
        {time ? formatHM(time) : "—"}
      </div>
      <div className="flex-1 min-w-0 text-[13px]" style={{ color: "var(--ahora-text-muted)" }}>
        {item.title}
      </div>
      <ItemActions item={item} />
      {checkbox("var(--ahora-border)", 11)}
    </div>
  );
}
