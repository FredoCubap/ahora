import { useCallback, useEffect, useState } from "react";

export type ThemeChoice = "claro" | "oscuro" | "sistema";

const STORAGE_KEY = "ahora-theme";

function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "sistema") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice === "oscuro" ? "dark" : "light");
}

/**
 * Preferencia de vista claro/oscuro/sistema, persistida en localStorage.
 * Distinto del sistema de temas cargables por archivo (parqueado para más
 * adelante) — esto es solo el toggle claro/oscuro/sistema de Ajustes.
 */
export function useTheme() {
  const [choice, setChoiceState] = useState<ThemeChoice>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "claro" || stored === "oscuro" || stored === "sistema" ? stored : "sistema";
  });

  useEffect(() => {
    applyTheme(choice);
  }, [choice]);

  const setChoice = useCallback((next: ThemeChoice) => {
    localStorage.setItem(STORAGE_KEY, next);
    setChoiceState(next);
  }, []);

  return { choice, setChoice };
}
