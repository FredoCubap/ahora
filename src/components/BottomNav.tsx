import { NavLink } from "react-router-dom";

/**
 * Fija abajo del todo, centrada en la misma columna que el resto de la app
 * (mismo patrón que AvisoBanner: un wrapper fixed de ancho completo, con
 * el contenido real centrado adentro). Antes vivía DENTRO de cada pantalla
 * con `mt-auto` — en Semana, que tiene scroll propio y contenido más largo,
 * eso hacía que ni la barra ni el botón "+" (que sí es fixed) coincidieran
 * con el final real del contenido: el "+" quedaba pisando ítems al hacer
 * scroll. Cada pantalla reserva espacio abajo (`pb-24`) para que nada quede
 * tapado detrás de esta barra ni del botón "+".
 */
export function BottomNav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "font-bold text-[12px]" : "text-[12px]";
  const linkStyle = (isActive: boolean) => ({
    color: isActive ? "var(--ahora-accent)" : "var(--ahora-text-faint)",
  });

  return (
    <div className="fixed inset-x-0 bottom-0 flex justify-center pointer-events-none z-40">
      <div
        className="w-full max-w-[480px] flex gap-5 justify-center px-6 py-3.5 pointer-events-auto"
        style={{ background: "var(--ahora-bg)", borderTop: "1px solid var(--ahora-border)" }}
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
    </div>
  );
}
