/** Estado del atajo global, tal como lo informa el shell (shell/hotkey.py). */
export interface HotkeyStatus {
  active: boolean;
  /** Por qué está inactivo; `null` si está activo. */
  reason: "ocupado" | "invalida" | "no disponible" | null;
}

/** Lo que devuelve `configure_hotkey`: el estado más lo que quedó guardado. */
export interface HotkeyResult extends HotkeyStatus {
  enabled: boolean;
  combination: string;
}

/** Evento que lanza el shell cuando el atajo abre la captura (ver `open_captura`). */
export const CAPTURA_EVENT = "ahora:captura";

/**
 * Qué decirle al usuario en Ajustes sobre el atajo, o `null` si no hay nada
 * que decir. Un atajo apagado a propósito no es un problema: solo se explica
 * cuando está encendido y no funciona (o cuando se acaba de rechazar algo).
 */
export function hotkeyMessage(enabled: boolean, status: HotkeyStatus | null): string | null {
  if (!status || status.reason === null) return null;
  if (status.reason === "invalida") return "Combinación no válida: usa un modificador y una tecla";
  if (!enabled) return null;
  if (status.reason === "ocupado") return "Ocupado por otra aplicación";
  return "No disponible en este sistema";
}
