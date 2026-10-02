import { useEffect, useState } from "react";
import { Settings as SettingsIcon, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { ItemRow } from "../components/ItemRow";
import { BOTTOM_SAFE_AREA } from "../components/BottomNav";
import { zonifyToday, seguimientoItems } from "../lib/zones";
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
  const seguimiento = seguimientoItems(items);

  // "Solo se expande de entrada si la lista de arriba está vacía"
  // (docs/FILOSOFIA.md). Se resuelve con estado derivado en vez de con un
  // useEffect que lo escriba (un setState en un efecto es un render en
  // cascada): mientras el usuario no toque el toggle, el valor ES
  // "lista vacía ? abierto : cerrado". En cuanto lo toque, manda `tocado` y el
  // valor derivado deja de decidir.
  //
  // Durante la carga `items` está vacío, así que `listaVacia` es true — pero
  // no se ve nada igual, porque la zona solo se renderiza si hay ítems en
  // seguimiento y eso recién es cierto cuando la carga terminó.
  const [tocado, setTocado] = useState(false);
  const [abiertoPorUsuario, setAbiertoPorUsuario] = useState(false);
  const listaVacia = vencidas.length === 0 && destacado.length === 0 && resto.length === 0;
  const seguimientoAbierto = tocado ? abiertoPorUsuario : listaVacia;

  function toggleSeguimiento() {
    setAbiertoPorUsuario((v) => !v);
    setTocado(true);
  }

  return (
    <div className="flex flex-col h-full gap-5 p-6" style={{ paddingBottom: BOTTOM_SAFE_AREA }}>
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-0.5">
          <h1
            className="font-display font-extrabold text-[30px] tracking-tight"
            style={{ color: "var(--ahora-text)" }}
          >
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
          <div
            className="text-[11px] font-bold uppercase tracking-wide"
            style={{ color: "var(--ahora-urgent)" }}
          >
            Vencidas
          </div>
          <div className="flex flex-col gap-2">
            {vencidas.map((item) => (
              <ItemRow
                key={itemKey(item)}
                item={item}
                variant="vencida"
                onComplete={completeItem}
              />
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
            <ItemRow
              key={itemKey(item)}
              item={item}
              variant="destacado"
              onComplete={completeItem}
            />
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

      {seguimiento.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            onClick={toggleSeguimiento}
            className="flex items-center gap-2"
            style={{
              background: "transparent",
              border: "none",
              padding: "4px 0",
              cursor: "pointer",
            }}
          >
            <ChevronRight
              size={12}
              color="var(--ahora-seguimiento)"
              style={{
                transform: seguimientoAbierto ? "rotate(90deg)" : "none",
                transition: "transform 0.15s",
                flexShrink: 0,
              }}
            />
            <div
              className="text-[11px] font-bold uppercase tracking-wide"
              style={{ color: "var(--ahora-seguimiento)" }}
            >
              En seguimiento ({seguimiento.length})
            </div>
          </button>
          {seguimientoAbierto && (
            <div
              className="flex flex-col"
              style={{
                background: `color-mix(in oklch, var(--ahora-seguimiento) 9%, var(--ahora-bg))`,
                borderRadius: 14,
                padding: "2px 14px",
              }}
            >
              {seguimiento.map((item) => (
                <ItemRow
                  key={itemKey(item)}
                  item={item}
                  variant="seguimiento"
                  onComplete={completeItem}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {vencidas.length === 0 &&
        destacado.length === 0 &&
        resto.length === 0 &&
        seguimiento.length === 0 && (
          <div
            className="flex-1 flex items-center justify-center text-sm"
            style={{ color: "var(--ahora-text-faint)" }}
          >
            Nada pendiente por ahora.
          </div>
        )}
    </div>
  );
}
