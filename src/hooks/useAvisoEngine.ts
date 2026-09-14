import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { computeActiveAviso, NotifiedLog } from "../lib/avisoEngine";
import { Item } from "../lib/types";

const TICK_MS = 20_000;

export type AvisoAction = "hecho" | "pospon" | "hoyno";

export function useAvisoEngine() {
  const items = useAppStore((s) => s.items);
  const settings = useAppStore((s) => s.settings);
  const completeItem = useAppStore((s) => s.completeItem);
  const skipItem = useAppStore((s) => s.skipItem);
  const snoozeItem = useAppStore((s) => s.snoozeItem);

  const logRef = useRef<NotifiedLog>(new Map());
  const [activeItem, setActiveItem] = useState<Item | null>(null);

  useEffect(() => {
    if (!settings) return;

    const tick = () => {
      const next = computeActiveAviso(items, settings, new Date(), logRef.current);
      if (next) setActiveItem(next);
    };

    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [items, settings]);

  const snoozeMinutes = settings?.snooze_min ?? 10;

  async function respond(action: AvisoAction) {
    if (!activeItem) return;
    const item = activeItem;
    setActiveItem(null);
    if (action === "hecho") await completeItem(item);
    else if (action === "hoyno") await skipItem(item);
    else if (action === "pospon") await snoozeItem(item, snoozeMinutes);
  }

  return { activeItem, respond, snoozeMinutes };
}
