import { NavLink } from "react-router-dom";
import { Plus } from "lucide-react";

const BAR_HEIGHT = 56;
const GAP_ABOVE_BAR = 14;
const FAB_SIZE = 52;

/** Altura total a reservar (`pb-*`) en el contenido de cada pantalla para que
 * nada quede tapado detrás de esta barra + el "+". Un solo número, calculado
 * acá — así nunca se desalinea de lo que esta barra realmente ocupa. */
export const BOTTOM_SAFE_AREA = BAR_HEIGHT + GAP_ABOVE_BAR + FAB_SIZE + GAP_ABOVE_BAR;

interface BottomNavProps {
  onAdd: () => void;
}

/**
 * Barra fija abajo del todo + el "+" de captura rápida, como UN SOLO bloque:
 * el "+" vive *dentro* del mismo wrapper centrado que la barra (en vez de
 * ser un `fixed` aparte con su propio cálculo de centrado), así hereda el
 * centrado de la barra gratis y nunca se puede desalinear de la columna.
 */
export function BottomNav({ onAdd }: BottomNavProps) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "font-bold text-[12px]" : "text-[12px]";
  const linkStyle = (isActive: boolean) => ({
    color: isActive ? "var(--ahora-accent)" : "var(--ahora-text-faint)",
  });

  return (
    <div className="fixed inset-x-0 bottom-0 flex justify-center pointer-events-none z-40">
      <div className="relative w-full max-w-[480px]">
        <div
          className="flex items-center justify-center gap-5 px-6 pointer-events-auto"
          style={{
            height: BAR_HEIGHT,
            background: "var(--ahora-bg)",
            borderTop: "1px solid var(--ahora-border)",
          }}
        >
          <NavLink to="/" end className={linkClass} style={({ isActive }) => linkStyle(isActive)}>
            Hoy
          </NavLink>
          <NavLink to="/semana" className={linkClass} style={({ isActive }) => linkStyle(isActive)}>
            Semana
          </NavLink>
          <NavLink to="/semana#backlog" className={linkClass} style={() => linkStyle(false)}>
            Backlog
          </NavLink>
        </div>

        <button
          onClick={onAdd}
          aria-label="Nuevo ítem"
          className="absolute flex items-center justify-center rounded-full shadow-lg pointer-events-auto"
          style={{
            width: FAB_SIZE,
            height: FAB_SIZE,
            right: 24,
            bottom: BAR_HEIGHT + GAP_ABOVE_BAR,
            background: "var(--ahora-accent)",
          }}
        >
          <Plus size={22} color="var(--ahora-accent-text)" />
        </button>
      </div>
    </div>
  );
}
