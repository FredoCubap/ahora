/** "YYYY-MM-DDTHH:MM:SS" en hora LOCAL (sin `Z` ni offset) — el mismo formato
 * que ya usan `due_time`/`fixed_time`. Nunca usar `datetime('now', ...)` de
 * SQLite para esto: esa función trabaja en UTC, y como el resto de la app
 * guarda hora local sin marcarla como tal, al releerla con `new Date(...)`
 * el navegador la toma como si ya fuera local — corriendo el valor por el
 * offset del huso horario completo (ver snoozeItem en db.ts). */
export function toLocalIso(d: Date): string {
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function formatHM(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffMin = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const hours = Math.round(diffMin / 60);
  return `hace ${hours} h`;
}
