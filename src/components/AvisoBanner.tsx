import { useEffect, useState } from "react";
import { MorphIcon } from "morphicons/react";
import { Clock, Check } from "lucide";
import { useAvisoEngine } from "../hooks/useAvisoEngine";
import { formatHM } from "../lib/formatTime";

export function AvisoBanner() {
  const { activeItem, respond, snoozeMinutes } = useAvisoEngine();
  const [resolving, setResolving] = useState(false);

  // Dispara el sonido justo cuando aparece un aviso NUEVO (activeItem pasa
  // de null a un ítem) — no en cada re-render del banner. También reinicia
  // `resolving`: sin esto, después de un "Hecho" el próximo aviso heredaba
  // el ícono de check en vez del reloj.
  useEffect(() => {
    if (!activeItem) return;
    setResolving(false);
    const audio = new Audio("/sounds/banner_sound.mp3");
    audio.play().catch(() => {
      // El navegador puede bloquear el autoplay si todavía no hubo ninguna
      // interacción del usuario en la ventana. No hay mucho más que hacer —
      // el banner visual se ve igual.
    });
  }, [activeItem]);

  if (!activeItem) return null;

  const time = activeItem.fixed_time ?? activeItem.due_time;

  async function handle(action: "hecho" | "pospon" | "hoyno") {
    if (action === "hecho") setResolving(true);
    await respond(action);
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 flex items-end justify-center p-6 z-50 pointer-events-none"
    >
      <div
        className="flex flex-col gap-4 w-full max-w-[372px] rounded-[22px] p-5 pointer-events-auto"
        style={{
          background: "var(--ahora-bg-elevated)",
          boxShadow: "0 12px 30px -8px rgba(0,0,0,0.25)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-full"
            style={{
              width: 38,
              height: 38,
              background: `color-mix(in oklch, var(--ahora-accent) 20%, var(--ahora-bg-elevated))`,
            }}
          >
            <MorphIcon icon={resolving ? Check : Clock} size={18} color="var(--ahora-accent)" spring="snappy" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="font-bold text-[15px]" style={{ color: "var(--ahora-text)" }}>
              {activeItem.title}
            </div>
            <div className="text-xs" style={{ color: "var(--ahora-text-muted)" }}>
              {time ? `es la hora · ${formatHM(time)}` : "es la hora"}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handle("hecho")}
            className="flex-[1.3] text-center py-3 rounded-2xl text-sm font-bold"
            style={{ background: "var(--ahora-accent)", color: "var(--ahora-accent-text)" }}
          >
            Hecho
          </button>
          <button
            onClick={() => handle("pospon")}
            className="flex-[1.6] text-center py-3 rounded-2xl text-[13px] font-semibold"
            style={{ color: "var(--ahora-text)", border: "1.5px solid var(--ahora-border)" }}
          >
            Pospón {snoozeMinutes} min
          </button>
          <button
            onClick={() => handle("hoyno")}
            className="flex-1 text-center py-3 rounded-2xl text-[13px]"
            style={{ color: "var(--ahora-text-faint)" }}
          >
            Hoy no
          </button>
        </div>
      </div>
    </div>
  );
}
