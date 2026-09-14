export interface ParsedCapture {
  title: string;
  fixed_time?: string;
  due_time?: string;
  label: string;
}

const WEEKDAYS: Record<string, number> = {
  lunes: 1,
  martes: 2,
  miercoles: 3,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  sábado: 6,
  domingo: 0,
};

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function toLocalIso(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(
    date.getHours()
  )}:${pad2(date.getMinutes())}:00`;
}

function findDate(text: string, now: Date): { date: Date | null; match: string | null; label: string } {
  const manana = text.match(/\bmañana\b/i);
  if (manana) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return { date: d, match: manana[0], label: "mañana" };
  }
  const hoy = text.match(/\bhoy\b/i);
  if (hoy) {
    return { date: new Date(now), match: hoy[0], label: "hoy" };
  }
  for (const [name, jsDow] of Object.entries(WEEKDAYS)) {
    const re = new RegExp(`\\b${name}\\b`, "i");
    const m = text.match(re);
    if (m) {
      const d = new Date(now);
      const diff = (jsDow - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + diff);
      return { date: d, match: m[0], label: name };
    }
  }
  return { date: null, match: null, label: "" };
}

function findTime(text: string): { hours: number; minutes: number; match: string; label: string } | null {
  let m = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (m) {
    const hours = parseInt(m[1], 10);
    const minutes = parseInt(m[2], 10);
    if (hours <= 23 && minutes <= 59) {
      return { hours, minutes, match: m[0], label: `${pad2(hours)}:${pad2(minutes)}` };
    }
  }

  m = text.match(/\b(?:a las|las)\s+(\d{1,2})\s*(am|pm)?\b/i);
  if (m) {
    let hours = parseInt(m[1], 10);
    if (m[2]?.toLowerCase() === "pm" && hours < 12) hours += 12;
    if (m[2]?.toLowerCase() === "am" && hours === 12) hours = 0;
    return { hours, minutes: 0, match: m[0], label: `${pad2(hours)}:00` };
  }

  m = text.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (m) {
    let hours = parseInt(m[1], 10);
    if (m[2].toLowerCase() === "pm" && hours < 12) hours += 12;
    if (m[2].toLowerCase() === "am" && hours === 12) hours = 0;
    return { hours, minutes: 0, match: m[0], label: `${pad2(hours)}:00` };
  }

  return null;
}

/**
 * Parser básico en español para la captura rápida: reconoce hoy/mañana, días
 * de semana y una hora HH:MM (o "a las N [am|pm]"). No es NLP completo — ver
 * plan de implementación para el alcance deliberadamente acotado.
 */
export function parseQuickCapture(rawText: string, now: Date = new Date()): ParsedCapture {
  let working = rawText;

  const isDue = /\b(antes de|para las|antes)\b/i.test(rawText);

  const dateResult = findDate(working, now);
  if (dateResult.match) {
    working = working.replace(dateResult.match, "");
  }

  const timeResult = findTime(working);
  if (timeResult) {
    working = working.replace(timeResult.match, "");
  }

  working = working.replace(/\b(antes de|para las|a las|las|antes)\b/gi, "");
  const title = working.replace(/\s+/g, " ").trim();

  if (!timeResult) {
    const label = dateResult.label || "";
    return { title, label };
  }

  const day = dateResult.date ?? now;
  const when = new Date(day);
  when.setHours(timeResult.hours, timeResult.minutes, 0, 0);
  const iso = toLocalIso(when);

  const kind = isDue ? "tarea" : "cita";
  const dayLabel = dateResult.label || "hoy";
  const label = `${kind} · ${dayLabel} · ${timeResult.label}`;

  return isDue
    ? { title, due_time: iso, label }
    : { title, fixed_time: iso, label };
}
