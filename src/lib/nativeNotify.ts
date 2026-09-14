import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";

let permissionChecked = false;
let permissionGranted = false;

/**
 * Notificación nativa del sistema operativo — la que se ve aunque la
 * ventana esté minimizada/oculta en bandeja. Pide permiso una sola vez por
 * sesión (no en cada aviso); si el usuario lo niega, no vuelve a insistir
 * y esta función simplemente no hace nada — el banner + sonido dentro de
 * la app (AvisoBanner.tsx) siguen funcionando igual, son independientes.
 */
export async function notifyNative(title: string, body?: string): Promise<void> {
  if (!permissionChecked) {
    permissionChecked = true;
    permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      const result = await requestPermission();
      permissionGranted = result === "granted";
    }
  }

  if (permissionGranted) {
    sendNotification({ title, body });
  }
}
