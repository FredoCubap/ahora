import { HotkeyResult, HotkeyStatus } from "./hotkey";
import { getApi } from "./pywebviewApi";

/**
 * Llamadas al sistema operativo que no son datos: el autostart y el cierre de
 * la app. Viven aparte de `db.ts` a propósito — esas no tocan la base y no
 * tienen sentido ahí.
 *
 * Todas son best-effort: si el shell no puede responder (no está disponible,
 * la plataforma no lo soporta) se devuelve un valor por defecto y la app sigue.
 * Un rechazo sin manejar acá sería un error en consola sin nada que arreglar.
 */

/** Si la app arranca con el sistema. False si no se pudo preguntar. */
export async function getAutostart(): Promise<boolean> {
  try {
    const api = await getApi();
    return await api.get_autostart();
  } catch {
    return false;
  }
}

/** Prende o apaga el autostart. Devuelve el estado real resultante. */
export async function setAutostart(enabled: boolean): Promise<boolean> {
  try {
    const api = await getApi();
    return await api.set_autostart(enabled);
  } catch {
    // Si no se pudo escribir, el estado sigue siendo el de antes, que es
    // justamente lo contrario de lo pedido.
    return !enabled;
  }
}

/** Cierra la app de verdad. Equivale a "Salir" del ícono de bandeja. */
export async function quitApp(): Promise<void> {
  try {
    const api = await getApi();
    await api.quit();
  } catch {
    // Si no se pudo cerrar desde adentro, no hay mucho más que hacer desde acá.
  }
}

/** Estado del atajo global. `null` si no se pudo preguntar. */
export async function getHotkeyStatus(): Promise<HotkeyStatus | null> {
  try {
    const api = await getApi();
    return await api.get_hotkey_status();
  } catch {
    return null;
  }
}

/**
 * Activa, desactiva o cambia el atajo global. Devuelve lo que quedó guardado y
 * el estado real, o `null` si el shell no respondió (entonces no se sabe).
 */
export async function configureHotkey(
  enabled: boolean,
  combination: string,
): Promise<HotkeyResult | null> {
  try {
    const api = await getApi();
    return await api.configure_hotkey(enabled, combination);
  } catch {
    return null;
  }
}

/** Avisa al shell de que la captura se cerró, para que devuelva la ventana a la bandeja. */
export async function capturaClosed(): Promise<void> {
  try {
    const api = await getApi();
    await api.captura_closed();
  } catch {
    // Sin shell no hay ventana que esconder.
  }
}
