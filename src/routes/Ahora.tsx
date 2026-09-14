import { useEffect } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { ItemRow } from "../components/ItemRow";
import { BottomNav } from "../components/BottomNav";
import { zonifyToday } from "../lib/zones";
import { itemKey } from "../lib/types";

const DATE_LABEL = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "2-digit",
  month: "long",
}).format(new Date());

export function Ahora() {
  const items = useAppStore((s) => s.items);
  const refresh = useAppStore((s) => s.refresh);
  const completeItem = useAppStore((s) => s.completeItem);
  const navigate = useNavigate();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const { vencidas, destacado, resto } = zonifyToday(items);

  return (
    <div className="flex flex-col h-full gap-5 p-6 pb-5">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display font-extrabold text-[30px] tracking-tight" style={{ color: "var(--ahora-text)" }}>
            Ahora
          </h1>
          <div className="text-[13px] capitalize" style={{ color: "var(--ahora-text-muted)" }}>
            {DATE_LABEL}
          </div>
        </div>
        <button
          onClick={() => navigate("/ajustes")}
          aria-label="Ajustes"
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{ width: 36, height: 36, background: "var(--ahora-chip-bg)" }}
        >
          <SettingsIcon size={17} color="var(--ahora-text-muted)" />
        </button>
      </div>

      {vencidas.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--ahora-urgent)" }}>
            Vencidas
          </div>
          <div className="flex flex-col gap-2">
            {vencidas.map((item) => (
              <ItemRow key={itemKey(item)} item={item} variant="vencida" onComplete={completeItem} />
            ))}
          </div>
        </div>
      )}

      {destacado.length > 0 && (
        <div className="flex flex-col">
          <div
            className="text-[11px] font-bold uppercase tracking-wide mb-1"
            style={{ color: "var(--ahora-text-faint)" }}
          >
            Ahora y próximas 3 h
          </div>
          {destacado.map((item) => (
            <ItemRow key={itemKey(item)} item={item} variant="destacado" onComplete={completeItem} />
          ))}
        </div>
      )}

      {resto.length > 0 && (
        <div className="flex flex-col">
          <div
            className="text-[11px] font-bold uppercase tracking-wide mb-0.5"
            style={{ color: "var(--ahora-text-faint)" }}
          >
            Resto de hoy
          </div>
          {resto.map((item) => (
            <ItemRow key={itemKey(item)} item={item} variant="compacto" onComplete={completeItem} />
          ))}
        </div>
      )}

      {vencidas.length === 0 && destacado.length === 0 && resto.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--ahora-text-faint)" }}>
          Nada pendiente por ahora.
        </div>
      )}

      <BottomNav />
    </div>
  );
}
