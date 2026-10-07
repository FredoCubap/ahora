import { describe, expect, it } from "vitest";
import { computeActiveAviso, type NotifiedLog } from "./avisoEngine";
import { Item, Settings } from "./types";

/**
 * Tests del motor de avisos (docs/FILOSOFIA.md, "El motor de avisos").
 *
 * Es la lógica más delicada de la app: decide cuándo la app te interrumpe, y
 * tiene más bordes de los que se ven en la UI (cortesía, al-filo, vencida con
 * techo de reintentos, pospón, seguimiento con techo diario, y ahora el back
 * off parcial de "empezada"). Un error acá o no te avisa o te rompe las pelotas.
 *
 * Todo con fechas relativas a "ahora" para que el test no dependa del día en que
 * se corre.
 */

const SETTINGS: Settings = {
  id: 1,
  work_start: "09:00",
  work_end: "18:00",
  work_days: "1,2,3,4,5",
  snooze_min: 10,
  overdue_retry_min: 30,
  overdue_retry_max: 3,
  seguimiento_interval_min: 240,
  seguimiento_daily_cap: 3,
  theme: "sistema",
};

/** "Ahora" fijo: un martes a las 10:00, pleno horario laboral. */
function now(): Date {
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  // Martes (getDay() === 2) para que work_days lo incluya.
  while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
  return d;
}

function at(hours: number, minutes = 0): string {
  const d = now();
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function item(p: Partial<Item> = {}): Item {
  return {
    id: 1,
    title: "Test",
    status: "pendiente",
    priority: "media",
    nagged_today_count: 0,
    ...p,
  } as Item;
}

function log(): NotifiedLog {
  return new Map();
}

describe("computeActiveAviso", () => {
  it("no avisa fuera del horario laboral", () => {
    const sabado = now();
    sabado.setDate(sabado.getDate() + (6 - sabado.getDay())); // sábado
    sabado.setHours(10, 0, 0, 0);

    const i = item({ due_time: at(10, 0) });
    expect(computeActiveAviso([i], SETTINGS, sabado, log())).toBeNull();
  });

  it("no avisa si no es día laboral", () => {
    const domingo = now();
    domingo.setDate(domingo.getDate() + (7 - domingo.getDay())); // domingo
    domingo.setHours(10, 0, 0, 0);

    const i = item({ due_time: at(10, 0) });
    expect(computeActiveAviso([i], SETTINGS, domingo, log())).toBeNull();
  });

  it("avisa por cortesía dentro de la ventana de remind_before_min", () => {
    // Due en 15 min, remind_before 20 → ya pasó el corte de cortesía.
    const i = item({ due_time: at(10, 15), remind_before_min: 20 });
    expect(computeActiveAviso([i], SETTINGS, now(), log())).toBe(i);
  });

  it("no avisa por cortesía si todavía no llegó la ventana", () => {
    // Due en 30 min, remind_before 20 → falta.
    const i = item({ due_time: at(10, 30), remind_before_min: 20 });
    expect(computeActiveAviso([i], SETTINGS, now(), log())).toBeNull();
  });

  it("avisa al filo (en la ventana de 1 min)", () => {
    const i = item({ due_time: at(10, 0) });
    expect(computeActiveAviso([i], SETTINGS, now(), log())).toBe(i);
  });

  it("no avisa al filo si ya pasó la ventana de 1 min", () => {
    // Con due_time pasado 2 min ya es "vencida" (y esa sí dispara). El caso
    // "al filo pasado" solo existe para citas: fixed_time sin due_time.
    const i = item({ fixed_time: at(9, 58) });
    expect(computeActiveAviso([i], SETTINGS, now(), log())).toBeNull();
  });

  it("avisa vencida y respeta el techo de reintentos", () => {
    const i = item({ due_time: at(8, 0) });
    const n = now();
    const l = log(); // un solo log: el techo vive en el log, no en el ítem

    // Primer aviso.
    expect(computeActiveAviso([i], SETTINGS, n, l)).toBe(i);

    // Mismo instante, ya está en el log → no repite.
    expect(computeActiveAviso([i], SETTINGS, n, l)).toBeNull();

    // A los 30 min (overdue_retry_min), segundo intento.
    const t2 = new Date(n.getTime() + 30 * 60_000);
    expect(computeActiveAviso([i], SETTINGS, t2, l)).toBe(i);

    // A los 60 min, tercero.
    const t3 = new Date(n.getTime() + 60 * 60_000);
    expect(computeActiveAviso([i], SETTINGS, t3, l)).toBe(i);

    // A los 90 min, ya llegó a overdue_retry_max (3) → se rinde.
    const t4 = new Date(n.getTime() + 90 * 60_000);
    expect(computeActiveAviso([i], SETTINGS, t4, l)).toBeNull();
  });

  it("no avisa vencida si no tiene due_time (una cita pasada no es vencida)", () => {
    const i = item({ fixed_time: at(8, 0) });
    expect(computeActiveAviso([i], SETTINGS, now(), log())).toBeNull();
  });

  it("no avisa mientras dura el pospón", () => {
    const i = item({ due_time: at(8, 0), snoozed_until: at(10, 30) });
    expect(computeActiveAviso([i], SETTINGS, now(), log())).toBeNull();
  });

  it("vuelve a avisar cuando expira el pospón", () => {
    const i = item({ due_time: at(8, 0), snoozed_until: at(9, 0) });
    expect(computeActiveAviso([i], SETTINGS, now(), log())).toBe(i);
  });

  it("un pospón sin respuesta no silencia el ítem para siempre", () => {
    // El pospón expiró y ya avisó una vez: debe caer en la lógica normal
    // (vencida) en vez de callarse.
    const i = item({ due_time: at(8, 0), snoozed_until: at(9, 0) });
    const l = log();
    computeActiveAviso([i], SETTINGS, now(), l); // consume el aviso de pospón
    expect(computeActiveAviso([i], SETTINGS, now(), l)).toBe(i);
  });

  it("el seguimiento avisa con su intervalo y techo diario", () => {
    const i = item({ waiting_on: "esperando respuesta" });
    const n = now();
    const l = log(); // un solo log: el intervalo se mide contra el primer registro

    // Primer aviso: nunca avisó, así que espera un intervalo completo.
    expect(computeActiveAviso([i], SETTINGS, n, l)).toBeNull();

    // A los 240 min (seguimiento_interval_min), avisa.
    const t2 = new Date(n.getTime() + 240 * 60_000);
    expect(computeActiveAviso([i], SETTINGS, t2, l)).toBe(i);
  });

  it("el seguimiento respeta el techo diario", () => {
    const i = item({
      waiting_on: "esperando",
      last_nagged_at: at(9, 0),
      nagged_today_count: 3, // ya llegó a seguimiento_daily_cap
    });
    expect(computeActiveAviso([i], SETTINGS, now(), log())).toBeNull();
  });

  // --- Back off parcial de "empezada" (en_progreso) ---

  it("empezada: no avisa por cortesía", () => {
    const i = item({
      status: "en_progreso",
      due_time: at(10, 15),
      remind_before_min: 20,
    });
    expect(computeActiveAviso([i], SETTINGS, now(), log())).toBeNull();
  });

  it("empezada: no avisa al filo", () => {
    const i = item({ status: "en_progreso", due_time: at(10, 0) });
    expect(computeActiveAviso([i], SETTINGS, now(), log())).toBeNull();
  });

  it("empezada: SÍ avisa si se vence", () => {
    const i = item({ status: "en_progreso", due_time: at(8, 0) });
    expect(computeActiveAviso([i], SETTINGS, now(), log())).toBe(i);
  });

  it("empezada: la vencida también respeta el techo de reintentos", () => {
    const i = item({ status: "en_progreso", due_time: at(8, 0) });
    const n = now();
    const l = log(); // un solo log, igual que arriba
    computeActiveAviso([i], SETTINGS, n, l); // 1
    const t2 = new Date(n.getTime() + 30 * 60_000);
    computeActiveAviso([i], SETTINGS, t2, l); // 2
    const t3 = new Date(n.getTime() + 60 * 60_000);
    computeActiveAviso([i], SETTINGS, t3, l); // 3
    const t4 = new Date(n.getTime() + 90 * 60_000);
    expect(computeActiveAviso([i], SETTINGS, t4, l)).toBeNull();
  });

  it("empezada: una cita (sin due_time) no avisa ni vencida", () => {
    const i = item({ status: "en_progreso", fixed_time: at(8, 0) });
    expect(computeActiveAviso([i], SETTINGS, now(), log())).toBeNull();
  });
});
