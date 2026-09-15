import { useState } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { parseQuickCapture } from "../lib/parseQuickCapture";
import { toDateStr } from "../lib/recurrence";
import { Freq, FREQS, Priority } from "../lib/types";

interface CapturaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRIORITIES: Priority[] = ["baja", "media", "alta"];
const PRIORITY_LABEL: Record<Priority, string> = { baja: "Baja", media: "Media", alta: "Alta" };

const FREQ_LABEL: Record<Freq, string> = { diaria: "Diaria", semanal: "Semanal", mensual: "Mensual" };
const UNIT_LABEL: Record<Freq, string> = { diaria: "día(s)", semanal: "semana(s)", mensual: "mes(es)" };
const DAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

const activeChip = {
  border: "1.5px solid var(--ahora-accent)",
  background: `color-mix(in oklch, var(--ahora-accent) 16%, var(--ahora-bg-elevated))`,
  fontWeight: 600,
  color: "var(--ahora-text)",
};
const inactiveChip = { border: "1.5px solid var(--ahora-border)", color: "var(--ahora-text-muted)" };

const fieldStyle = {
  background: "var(--ahora-bg-elevated)",
  border: "1.5px solid var(--ahora-border)",
  color: "var(--ahora-text)",
};

export function CapturaModal({ isOpen, onClose }: CapturaModalProps) {
  const addItem = useAppStore((s) => s.addItem);
  const addRecurrenceRule = useAppStore((s) => s.addRecurrenceRule);

  const [text, setText] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<Priority>("media");
  const [remindBefore, setRemindBefore] = useState<number | null>(10);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Repetir: si está activo, el ítem no se crea directo — se crea una
  // `recurrence_rule` y las fechas puntuales se calculan solas (ver
  // src-tauri/src/lib.rs `expand_recurrences`).
  const [repeat, setRepeat] = useState(false);

  // "En seguimiento" (docs/FILOSOFIA.md): sin fixed_time/due_time, con
  // waiting_on relleno. Excluyente con Repetir — no tiene sentido repetir
  // algo que no tiene ni hora ni fecha.
  const [seguimiento, setSeguimiento] = useState(false);
  const [waitingOn, setWaitingOn] = useState("");
  const [freq, setFreq] = useState<Freq>("diaria");
  const [intervalN, setIntervalN] = useState(1);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [monthDay, setMonthDay] = useState(1);
  const [atTime, setAtTime] = useState("09:00");
  const [startsOn, setStartsOn] = useState(() => toDateStr(new Date()));
  const [endsOn, setEndsOn] = useState("");
  const [isDue, setIsDue] = useState(false);

  if (!isOpen) return null;

  const parsed =
    repeat || seguimiento
      ? { title: "", fixed_time: undefined, due_time: undefined, label: "" }
      : parseQuickCapture(text || "");

  function reset() {
    setText("");
    setNotes("");
    setPriority("media");
    setRemindBefore(10);
    setDetailsOpen(false);
    setRepeat(false);
    setSeguimiento(false);
    setWaitingOn("");
    setFreq("diaria");
    setIntervalN(1);
    setWeekdays([]);
    setMonthDay(1);
    setAtTime("09:00");
    setStartsOn(toDateStr(new Date()));
    setEndsOn("");
    setIsDue(false);
  }

  function toggleWeekday(n: number) {
    setWeekdays((prev) => (prev.includes(n) ? prev.filter((d) => d !== n) : [...prev, n]));
  }

  function toggleRepeat() {
    setRepeat((v) => {
      const next = !v;
      if (next) setSeguimiento(false);
      return next;
    });
  }

  function toggleSeguimiento() {
    setSeguimiento((v) => {
      const next = !v;
      if (next) setRepeat(false);
      return next;
    });
  }

  async function handleSave() {
    if (!text.trim() || saving) return;
    if (repeat && freq === "semanal" && weekdays.length === 0) {
      alert("Elegí al menos un día de la semana");
      return;
    }
    if (seguimiento && !waitingOn.trim()) {
      alert("Contanos qué estás esperando");
      return;
    }

    setSaving(true);
    try {
      if (repeat) {
        await addRecurrenceRule({
          title: text.trim(),
          notes: notes || null,
          freq,
          interval_n: intervalN,
          weekdays: freq === "semanal" ? [...weekdays].sort((a, b) => a - b).join(",") : null,
          month_day: freq === "mensual" ? monthDay : null,
          at_time: atTime,
          is_due: isDue ? 1 : 0,
          priority,
          remind_before_min: remindBefore,
          starts_on: startsOn,
          ends_on: endsOn || null,
          active: 1,
        });
      } else if (seguimiento) {
        await addItem({
          title: text.trim(),
          notes: notes || null,
          fixed_time: null,
          due_time: null,
          waiting_on: waitingOn.trim(),
          priority,
          status: "pendiente",
          remind_before_min: null,
        });
      } else {
        await addItem({
          title: parsed.title || text.trim(),
          notes: notes || null,
          fixed_time: parsed.fixed_time ?? null,
          due_time: parsed.due_time ?? null,
          priority,
          status: "pendiente",
          remind_before_min: remindBefore,
        });
      }
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    reset();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6 z-50"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={handleCancel}
    >
      <div
        className="flex flex-col gap-4 w-full max-w-[400px] max-h-[85vh] overflow-y-auto rounded-3xl p-5"
        style={{ background: "var(--ahora-bg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-display font-extrabold text-[18px]" style={{ color: "var(--ahora-text)" }}>
          Nuevo ítem
        </div>

        <div
          className="flex flex-col gap-2 rounded-2xl p-4"
          style={{ background: "var(--ahora-bg-elevated)", border: "1.5px solid var(--ahora-border)" }}
        >
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              repeat
                ? "Título (ej. Tomar agua)"
                : seguimiento
                  ? "Verificar el reembolso"
                  : "Llamar a Juan mañana 15:00"
            }
            className="text-[16px] font-medium bg-transparent outline-none"
            style={{ color: "var(--ahora-text)" }}
          />
          {!repeat && !seguimiento && parsed.label && (
            <div className="text-xs" style={{ color: "var(--ahora-accent)" }}>
              se entiende como: {parsed.label}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 px-1">
          <button onClick={toggleRepeat} className="flex items-center gap-2.5">
            <div
              className="rounded-full flex-shrink-0 flex"
              style={{
                width: 30,
                height: 18,
                padding: 2,
                background: repeat ? "var(--ahora-accent)" : "var(--ahora-chip-bg)",
                justifyContent: repeat ? "flex-end" : "flex-start",
                transition: "background 0.15s",
              }}
            >
              <div className="rounded-full" style={{ width: 14, height: 14, background: "var(--ahora-bg)" }} />
            </div>
            <div
              className="text-xs font-semibold"
              style={{ color: repeat ? "var(--ahora-text)" : "var(--ahora-text-faint)" }}
            >
              Repetir
            </div>
          </button>

          <button onClick={toggleSeguimiento} className="flex items-center gap-2.5">
            <div
              className="rounded-full flex-shrink-0 flex"
              style={{
                width: 30,
                height: 18,
                padding: 2,
                background: seguimiento ? "var(--ahora-seguimiento)" : "var(--ahora-chip-bg)",
                justifyContent: seguimiento ? "flex-end" : "flex-start",
                transition: "background 0.15s",
              }}
            >
              <div className="rounded-full" style={{ width: 14, height: 14, background: "var(--ahora-bg)" }} />
            </div>
            <div
              className="text-xs font-semibold"
              style={{ color: seguimiento ? "var(--ahora-seguimiento)" : "var(--ahora-text-faint)" }}
            >
              En seguimiento
            </div>
          </button>
        </div>

        {seguimiento && (
          <div
            className="flex flex-col gap-2 rounded-2xl p-4"
            style={{ background: `color-mix(in oklch, var(--ahora-seguimiento) 9%, var(--ahora-chip-bg))` }}
          >
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--ahora-seguimiento)" }}>
              Esperando a
            </div>
            <input
              value={waitingOn}
              onChange={(e) => setWaitingOn(e.target.value)}
              placeholder="respuesta de Soporte, envío del paquete…"
              className="text-sm bg-transparent outline-none rounded-lg px-2.5 py-1.5"
              style={{ ...fieldStyle, border: "1.5px solid var(--ahora-seguimiento)" }}
            />
            <div className="text-xs" style={{ color: "var(--ahora-text-faint)" }}>
              Sin hora ni fecha límite — queda en "En seguimiento" hasta que lo marques Resuelto.
            </div>
          </div>
        )}

        {repeat && (
          <div className="flex flex-col gap-3.5 rounded-2xl p-4" style={{ background: "var(--ahora-chip-bg)" }}>
            <div className="flex flex-col gap-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--ahora-text-faint)" }}>
                Frecuencia
              </div>
              <div className="flex gap-2">
                {FREQS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFreq(f)}
                    className="text-xs px-3.5 py-1.5 rounded-full"
                    style={f === freq ? activeChip : inactiveChip}
                  >
                    {FREQ_LABEL[f]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="text-sm flex-1" style={{ color: "var(--ahora-text)" }}>
                Cada
              </div>
              <input
                type="number"
                min={1}
                value={intervalN}
                onChange={(e) => setIntervalN(Math.max(1, Number(e.target.value) || 1))}
                className="w-14 text-right text-sm bg-transparent outline-none rounded-lg px-2 py-1"
                style={fieldStyle}
              />
              <div className="text-sm" style={{ color: "var(--ahora-text-muted)" }}>
                {UNIT_LABEL[freq]}
              </div>
            </div>

            {freq === "semanal" && (
              <div className="flex flex-col gap-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--ahora-text-faint)" }}>
                  Días
                </div>
                <div className="flex gap-1.5">
                  {DAY_LETTERS.map((letra, i) => {
                    const n = i + 1;
                    const active = weekdays.includes(n);
                    return (
                      <button
                        key={n}
                        onClick={() => toggleWeekday(n)}
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
            )}

            {freq === "mensual" && (
              <div className="flex items-center gap-2.5">
                <div className="text-sm flex-1" style={{ color: "var(--ahora-text)" }}>
                  Día del mes
                </div>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={monthDay}
                  onChange={(e) => setMonthDay(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-14 text-right text-sm bg-transparent outline-none rounded-lg px-2 py-1"
                  style={fieldStyle}
                />
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <div className="text-sm flex-1" style={{ color: "var(--ahora-text)" }}>
                Hora
              </div>
              <input
                type="time"
                value={atTime}
                onChange={(e) => setAtTime(e.target.value)}
                className="text-sm bg-transparent outline-none rounded-lg px-2 py-1"
                style={fieldStyle}
              />
            </div>

            <div className="flex items-center gap-2.5">
              <div className="text-sm flex-1" style={{ color: "var(--ahora-text)" }}>
                Empieza
              </div>
              <input
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
                className="text-sm bg-transparent outline-none rounded-lg px-2 py-1"
                style={fieldStyle}
              />
            </div>

            <div className="flex items-center gap-2.5">
              <div className="text-sm flex-1" style={{ color: "var(--ahora-text)" }}>
                Termina
              </div>
              <input
                type="date"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
                className="text-sm bg-transparent outline-none rounded-lg px-2 py-1"
                style={fieldStyle}
              />
              <div className="text-xs" style={{ color: "var(--ahora-text-faint)" }}>
                opcional
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--ahora-text-faint)" }}>
                Tipo
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsDue(false)}
                  className="flex-1 text-xs px-3.5 py-1.5 rounded-full"
                  style={!isDue ? activeChip : inactiveChip}
                >
                  Cita (hora fija)
                </button>
                <button
                  onClick={() => setIsDue(true)}
                  className="flex-1 text-xs px-3.5 py-1.5 rounded-full"
                  style={isDue ? activeChip : inactiveChip}
                >
                  Tarea (vencimiento)
                </button>
              </div>
            </div>
          </div>
        )}

        <button onClick={() => setDetailsOpen((v) => !v)} className="flex items-center gap-2 px-1">
          <ChevronDown
            size={14}
            color="var(--ahora-text-faint)"
            style={{ transform: detailsOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
          />
          <div className="text-xs" style={{ color: "var(--ahora-text-faint)" }}>
            notas, prioridad, recordatorio (opcional)
          </div>
        </button>

        {detailsOpen && (
          <div className="flex flex-col gap-3.5 rounded-2xl p-4" style={{ background: "var(--ahora-chip-bg)" }}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas (opcional)"
              rows={2}
              className="text-[13px] bg-transparent outline-none resize-none"
              style={{ color: "var(--ahora-text)" }}
            />

            <div className="flex flex-col gap-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--ahora-text-faint)" }}>
                Prioridad
              </div>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className="text-xs px-3.5 py-1.5 rounded-full"
                    style={p === priority ? activeChip : inactiveChip}
                  >
                    {PRIORITY_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>

            {!seguimiento && (
            <div className="flex flex-col gap-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--ahora-text-faint)" }}>
                Recordatorio
              </div>
              <div
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                style={{ background: "var(--ahora-bg-elevated)", border: "1.5px solid var(--ahora-border)" }}
              >
                <Clock size={14} color="var(--ahora-text-muted)" />
                <select
                  value={remindBefore ?? ""}
                  onChange={(e) => setRemindBefore(e.target.value ? Number(e.target.value) : null)}
                  className="text-[13px] bg-transparent outline-none"
                  style={{ color: "var(--ahora-text)" }}
                >
                  <option value="">Sin recordatorio</option>
                  <option value="5">5 minutos antes</option>
                  <option value="10">10 minutos antes</option>
                  <option value="30">30 minutos antes</option>
                </select>
              </div>
            </div>
            )}
          </div>
        )}

        <div className="flex gap-2.5 mt-auto">
          <button
            onClick={handleCancel}
            className="flex-1 text-center py-3 rounded-2xl text-sm font-semibold"
            style={{ color: "var(--ahora-text-muted)" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!text.trim() || saving}
            className="flex-[2] text-center py-3 rounded-2xl text-sm font-bold disabled:opacity-50"
            style={{ background: "var(--ahora-accent)", color: "var(--ahora-accent-text)" }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
