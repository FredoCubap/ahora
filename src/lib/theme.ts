import { ThemeChoice } from "./types";

/** Valor de `data-theme` para cada preferencia. `null` = no forzar nada y que
 * mande el tema del sistema (`prefers-color-scheme`, ver tokens.css). */
export function themeAttribute(choice: ThemeChoice): "light" | "dark" | null {
  if (choice === "claro") return "light";
  if (choice === "oscuro") return "dark";
  return null;
}

export function applyTheme(choice: ThemeChoice): void {
  const attribute = themeAttribute(choice);
  const root = document.documentElement;
  if (attribute) root.setAttribute("data-theme", attribute);
  else root.removeAttribute("data-theme");
}
