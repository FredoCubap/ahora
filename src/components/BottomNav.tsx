import { NavLink } from "react-router-dom";

export function BottomNav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "font-bold text-[12px]" : "text-[12px]";
  const linkStyle = (isActive: boolean) => ({
    color: isActive ? "var(--ahora-accent)" : "var(--ahora-text-faint)",
  });

  return (
    <div
      className="flex gap-5 pt-3.5 mt-auto"
      style={{ borderTop: "1px solid var(--ahora-border)" }}
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
  );
}
