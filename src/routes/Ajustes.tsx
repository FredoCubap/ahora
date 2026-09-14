import { useEffect, useState, type ChangeEvent } from "react";
import { disable as disableAutostart, enable as enableAutostart, isEnabled as isAutostartEnabled } from "@tauri-apps/plugin-autostart";
import { useAppStore } from "../store/useAppStore";
import { Header } from "../components/Header";
import { useTheme, ThemeChoice } from "../hooks/useTheme";

const DAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

/**
 * Campo numérico que no escribe en la DB en cada tecla: mantiene un borrador
 * local mientras se escribe y solo confirma (commit) al salir del campo, y
 * solo si es un entero >= 1. Si el valor es inválido (vacío, 0, texto),
 * descarta el borrador y vuelve al último valor guardado — así nunca se
 * persiste un `overdue_retry_min: 0` que haría insistir el aviso sin parar.
 */
function useNumberField(value: number, commit: (n: number) => void) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    setDraft(e.target.value);
  }

  function onBlur() {
    const n = Number(draft);
    if (Number.isInteger(n) && n >= 1) {
      commit(n);
    } else {
      setDraft(String(value));
    }
  }

  return { value: draft, onChange, onBlur };
}

const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "claro", label: "Claro" },
  { value: "oscuro", label: "Oscuro" },
  { value: "sistema", label: "Sistema" },
];

export function Ajustes() {
  const settings = useAppStore((s) => s.settings);
  const items = useAppStore((s) => s.items);
  const refresh = useAppStore((s) => s.refresh);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const archiveCompleted = useAppStore((s) => s.archiveCompleted);
  const { choice, setChoice } = useTheme();

  const [autostart, setAutostart] = useState(false);
  useEffect(() => {
    isAutostartEnabled().then(setAutostart);
  }, []);

  async function toggleAutostart() {
    if (autostart) {
      await disableAutostart();
    } else {
      await enableAutostart();
    }
    setAutostart(await isAutostartEnabled());
  }

  // Deben llamarse siempre, en el mismo orden, en cada render — por eso van
  // antes del `if (!settings) return null` de abajo (reglas de los Hooks).
  // Mientras `settings` todavía no cargó, usan un valor de respaldo que se
  // reemplaza solo en cuanto `settings` llega (el useEffect interno del hook
  // reacciona al cambio de `value`).
  const snoozeField = useNumberField(settings?.snooze_min ?? 10, (n) =>
    updateSettings({ snooze_min: n })
  );
  const retryMinField = useNumberField(settings?.overdue_retry_min ?? 30, (n) =>
    updateSettings({ overdue_retry_min: n })
  );
  const retryMaxField = useNumberField(settings?.overdue_retry_max ?? 3, (n) =>
    updateSettings({ overdue_retry_max: n })
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!settings) return null;

  const completedCount = items.filter((i) => i.status === "hecha" || i.status === "saltada").length;

  const activeDays = new Set(settings.work_days.split(",").map((s) => parseInt(s.trim(), 10)));

  function toggleDay(dayNum: number) {
    const next = new Set(activeDays);
    if (next.has(dayNum)) next.delete(dayNum);
    else next.add(dayNum);
    const sorted = Array.from(next).sort((a, b) => a - b);
    updateSettings({ work_days: sorted.join(",") });
  }

  return (
    <div className="flex flex-col h-full gap-4.5 p-6 pb-5 overflow-y-auto">
      <Header title="Ajustes" />

      <div className="flex flex-col gap-2.5">
        <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--ahora-text-faint)" }}>
          Horario laboral
        </div>
        <div
          className="flex items-center justify-between rounded-2xl px-4 py-3.5"
          style={{ background: "var(--ahora-chip-bg)" }}
        >
          <div className="text-sm" style={{ color: "var(--ahora-text)" }}>
            Avisos entre
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="time"
              value={settings.work_start}
              onChange={(e) => updateSettings({ work_start: e.target.value })}
              className="font-display font-bold text-sm bg-transparent outline-none"
              style={{ color: "var(--ahora-text)" }}
            />
            <span style={{ color: "var(--ahora-text-faint)" }}>–</span>
            <input
              type="time"
              value={settings.work_end}
              onChange={(e) => updateSettings({ work_end: e.target.value })}
              className="font-display font-bold text-sm bg-transparent outline-none"
              style={{ color: "var(--ahora-text)" }}
            />
          </div>
        </div>
        <div className="flex gap-1.5">
          {DAY_LETTERS.map((letra, i) => {
            const dayNum = i + 1;
            const active = activeDays.has(dayNum);
            return (
              <button
                key={letra + i}
                onClick={() => toggleDay(dayNum)}
                className="flex-1 text-center py-2 rounded-[10px] text-xs font-bold"
                style={{
                  background: active ? "var(--ahora-accent)" : "var(--ahora-bg-elevated)",
                  color: active ? "var(--ahora-accent-text)" : "var(--ahora-text-faint)",
                }}
              >
                {letra}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--ahora-text-faint)" }}>
          Insistencia
        </div>
        <div className="flex flex-col rounded-2xl overflow-hidden" style={{ background: "var(--ahora-chip-bg)" }}>
          <div
            className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: "1px solid var(--ahora-border)" }}
          >
            <div className="text-sm" style={{ color: "var(--ahora-text)" }}>
              Pospón por defecto
            </div>
            <input
              type="number"
              min={1}
              {...snoozeField}
              className="w-14 text-right text-sm bg-transparent outline-none"
              style={{ color: "var(--ahora-text-muted)" }}
            />
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="text-sm" style={{ color: "var(--ahora-text)" }}>
              Vencida reintenta cada
            </div>
            <div className="flex items-center gap-1 text-sm" style={{ color: "var(--ahora-text-muted)" }}>
              <input
                type="number"
                min={1}
                {...retryMinField}
                className="w-10 text-right bg-transparent outline-none"
              />
              min · máx
              <input
                type="number"
                min={1}
                {...retryMaxField}
                className="w-8 text-right bg-transparent outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--ahora-text-faint)" }}>
          Apariencia
        </div>
        <div className="flex rounded-xl p-1" style={{ background: "var(--ahora-chip-bg)" }}>
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setChoice(opt.value)}
              className="flex-1 text-center py-2 rounded-[9px] text-[13px]"
              style={
                choice === opt.value
                  ? { background: "var(--ahora-bg-elevated)", fontWeight: 700, color: "var(--ahora-text)" }
                  : { color: "var(--ahora-text-muted)" }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div
          className="flex items-center justify-between rounded-2xl px-4 py-3.5"
          style={{ background: "var(--ahora-chip-bg)" }}
        >
          <div className="text-sm" style={{ color: "var(--ahora-text)" }}>
            Color de acento
          </div>
          <div
            className="rounded-full"
            style={{
              width: 22,
              height: 22,
              background: "var(--ahora-accent)",
              boxShadow: "0 0 0 1.5px var(--ahora-border)",
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--ahora-text-faint)" }}>
          Sistema
        </div>
        <button
          onClick={toggleAutostart}
          className="flex items-center justify-between rounded-2xl px-4 py-3.5"
          style={{ background: "var(--ahora-chip-bg)" }}
        >
          <div className="text-sm" style={{ color: "var(--ahora-text)" }}>
            Iniciar con el sistema
          </div>
          <div
            className="rounded-full flex-shrink-0 flex"
            style={{
              width: 34,
              height: 20,
              padding: 2,
              background: autostart ? "var(--ahora-accent)" : "var(--ahora-border)",
              justifyContent: autostart ? "flex-end" : "flex-start",
              transition: "background 0.15s",
            }}
          >
            <div className="rounded-full" style={{ width: 16, height: 16, background: "var(--ahora-bg-elevated)" }} />
          </div>
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--ahora-text-faint)" }}>
          Datos
        </div>
        <button
          onClick={() => archiveCompleted()}
          disabled={completedCount === 0}
          className="flex items-center justify-between rounded-2xl px-4 py-3.5 disabled:opacity-50"
          style={{ background: "var(--ahora-chip-bg)" }}
        >
          <div className="text-sm" style={{ color: "var(--ahora-text)" }}>
            Vaciar completadas
          </div>
          <div className="text-xs" style={{ color: "var(--ahora-text-faint)" }}>
            {completedCount}
          </div>
        </button>
      </div>

      <div
        className="mt-auto text-xs text-center leading-relaxed"
        style={{ color: "var(--ahora-text-faint)" }}
      >
        Ahora es personal — sin cuentas, sin nube, sin compartir.
      </div>
    </div>
  );
}
