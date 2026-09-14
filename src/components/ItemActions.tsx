import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { Item } from "../lib/types";

interface ItemActionsProps {
  item: Item;
}

/**
 * Menú "⋯" con las acciones que antes solo existían atadas al banner de
 * aviso (Saltar, Posponer) — acá quedan disponibles siempre, no solo
 * cuando el aviso ya sonó. "Marcar hecho" no está acá porque ya tiene su
 * propio botón (el círculo/check de ItemRow); duplicarlo sería redundante.
 */
export function ItemActions({ item }: ItemActionsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const skipItem = useAppStore((s) => s.skipItem);
  const snoozeItem = useAppStore((s) => s.snoozeItem);
  const deleteItem = useAppStore((s) => s.deleteItem);
  const snoozeMinutes = useAppStore((s) => s.settings?.snooze_min ?? 10);

  // Un ítem de recurrencia (virtual o ya materializado) no se puede borrar
  // sin resucitarlo — ver el comentario en useAppStore.deleteItem.
  const canDelete = item.rule_id == null;

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function run(action: () => Promise<void>) {
    setOpen(false);
    action();
  }

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Más acciones"
        className="flex items-center justify-center"
        style={{ width: 24, height: 24 }}
      >
        <MoreVertical size={15} color="var(--ahora-text-faint)" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 flex flex-col rounded-xl overflow-hidden"
          style={{
            background: "var(--ahora-bg-elevated)",
            border: "1.5px solid var(--ahora-border)",
            minWidth: 170,
            zIndex: 10,
            boxShadow: "0 8px 20px -6px rgba(0,0,0,0.25)",
          }}
        >
          <button
            onClick={() => run(() => skipItem(item))}
            className="text-left text-[13px] px-3.5 py-2.5"
            style={{ color: "var(--ahora-text)" }}
          >
            Saltar
          </button>
          <button
            onClick={() => run(() => snoozeItem(item, snoozeMinutes))}
            className="text-left text-[13px] px-3.5 py-2.5"
            style={{ color: "var(--ahora-text)", borderTop: "1px solid var(--ahora-border)" }}
          >
            Posponer {snoozeMinutes} min
          </button>
          {canDelete && (
            <button
              onClick={() => run(() => deleteItem(item))}
              className="text-left text-[13px] px-3.5 py-2.5"
              style={{ color: "var(--ahora-urgent)", borderTop: "1px solid var(--ahora-border)" }}
            >
              Borrar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
