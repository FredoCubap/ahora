import { getApi } from "./pywebviewApi";

/**
 * Notificación nativa del sistema operativo — la que se ve aunque la ventana
 * esté oculta en bandeja. La muestra el ícono de bandeja (ver shell/tray.py),
 * que es el componente del shell con acceso real a la bandeja del SO.
 *
 * Es best-effort por diseño: si algo falla (bandeja no disponible, falta el
 * ícono) no se rompe nada. El banner visual y el sonido dentro de la app
 * (AvisoBanner.tsx) son caminos independientes y siguen funcionando igual.
 */
export async function notifyNative(title: string, body?: string): Promise<void> {
  try {
    const api = await getApi();
    await api.notify(title, body ?? "");
  } catch {
    // Sin notificaciones del SO no pasa nada: el aviso ya se mostró dentro de
    // la app. Un rechazo acá sería un error sin nada que arreglar de verdad.
  }
}
