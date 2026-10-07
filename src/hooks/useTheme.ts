import { useCallback } from "react";
import { useAppStore } from "../store/useAppStore";
import { applyTheme } from "../lib/theme";
import { ThemeChoice } from "../lib/types";

/**
 * Preferencia de tema (claro / oscuro / sistema). Vive en `settings.theme`, en
 * la base de datos, junto al resto de los ajustes: `localStorage` no sirve en
 * esta app porque con pywebview no se conserva entre ejecuciones.
 *
 * Aplicar el atributo al arrancar no es cosa de este hook (lo hace el script
 * de index.html y el efecto de App.tsx): esto es lo que usa Ajustes para
 * mostrar y cambiar la elección.
 */
export function useTheme() {
  const choice = useAppStore((s) => s.settings?.theme ?? "sistema");
  const updateSettings = useAppStore((s) => s.updateSettings);

  const setChoice = useCallback(
    (next: ThemeChoice) => {
      // Se aplica de inmediato, sin esperar a que la base responda y el store
      // se refresque: el usuario ve el cambio al tocar el botón.
      applyTheme(next);
      void updateSettings({ theme: next });
    },
    [updateSettings],
  );

  return { choice, setChoice };
}
