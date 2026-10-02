import { useEffect, useState } from "react";
import { MorphIcon } from "morphicons/react";
import { Clock, Check } from "lucide";
import { isSeguimiento, useAvisoEngine, type AvisoAction } from "../hooks/useAvisoEngine";
import { formatHM } from "../lib/formatTime";
import { notifyNative } from "../lib/nativeNotify";
import { diasAbiertos } from "../lib/zones";
import { itemKey, type Item } from "../lib/types";

/**
 * Disparador de sonido y notificación. Vive en el componente de afuera, que es
 * el que existe durante toda la sesión de la app.
 */
export function AvisoBanner() {
  const { activeItem, respond, snoozeMinutes } = useAvisoEngine();

  useEffect(() => {
    if (!activeItem) return;
    const audio = new Audio("/sounds/banner_sound.mp3");
    audio.play().catch(() => {
      // El navegador puede bloquear el autoplay si todavía no hubo ninguna
      // interacción del usuario en la ventana. No hay mucho más que hacer —
      // el banner visual se ve igual.
    });
    // Notificación nativa del SO — la única forma de enterarte si la
    // ventana está minimizada/oculta en bandeja. Independiente del sonido de
    // arriba: si el SO no la puede mostrar, esto no hace nada y el resto
    // sigue igual. Un seguimiento no tiene hora: el cuerpo es el contexto
    // de a qué se espera, no "es la hora".
    void notifyNative(
      activeItem.title,
      isSeguimiento(activeItem)
        ? `Sigue en seguimiento · ${activeItem.waiting_on}`
        : "Ahora · es la hora",
    );
  }, [activeItem]);

  if (!activeItem) return null;

  // El `key` es lo que reinicia el ícono de "check" entre avisos: al cambiar
  // de ítem, React desmonta el banner anterior y monta uno nuevo, así que
  // `resolving` arranca en false solo. La alternativa — un setState dentro del
  // efecto de arriba para reiniciarlo — dispara un render en cascada.
  return (
    <Aviso
      key={itemKey(activeItem)}
      item={activeItem}
      respond={respond}
      snoozeMinutes={snoozeMinutes}
    />
  );
}

interface AvisoProps {
  item: Item;
  respond: (action: AvisoAction) => Promise<void>;
  snoozeMinutes: number;
}

/** Un aviso concreto. Se remonta por ítem, así que su estado es por-aviso. */
function Aviso({ item, respond, snoozeMinutes }: AvisoProps) {
  const [resolving, setResolving] = useState(false);
  const seguimiento = isSeguimiento(item);
  const time = item.fixed_time ?? item.due_time;

  async function handle(action: AvisoAction) {
    if (action === "hecho") setResolving(true);
    await respond(action);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 flex items-end justify-center p-6 z-50 pointer-events-none">
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
            <MorphIcon
              icon={resolving ? Check : Clock}
              size={18}
              color="var(--ahora-accent)"
              spring="snappy"
            />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="font-bold text-[15px]" style={{ color: "var(--ahora-text)" }}>
              {item.title}
            </div>
            <div className="text-xs" style={{ color: "var(--ahora-text-muted)" }}>
              {seguimiento
                ? `${item.waiting_on} · llevas ${diasAbiertos(item)} días`
                : time
                  ? `es la hora · ${formatHM(time)}`
                  : "es la hora"}
            </div>
          </div>
        </div>

        {seguimiento ? (
          // "Ítems en seguimiento" (docs/FILOSOFIA.md): una sola acción,
          // nunca "Pospón" ni "Hoy no" — no es algo que se reprograma.
          <div className="flex gap-2">
            <button
              onClick={() => handle("hecho")}
              className="flex-1 text-center py-3 rounded-2xl text-sm font-bold"
              style={{ background: "var(--ahora-accent)", color: "var(--ahora-accent-text)" }}
            >
              Resuelto
            </button>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
