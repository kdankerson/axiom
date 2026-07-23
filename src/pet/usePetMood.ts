import { useEffect, useRef, useState } from "react";
import { petBus } from "../core/petBus";
import type { PetMood } from "../core/petBus";

const PULSE_MS = 2000;

// Each caller (sidebar icon, Pet page) subscribes independently and computes
// the same value off the same bus events — no need to lift this into shared
// state, React just runs the identical effect twice.
export function usePetMood(): PetMood {
  const [mood, setMood] = useState<PetMood>("idle");
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether a stream is currently active so a happy/concerned pulse
  // reverts to "thinking" instead of "idle" if a new signal arrives mid-pulse
  // while a run is still going.
  const activeStream = useRef(false);

  useEffect(() => {
    function onMood(e: Event) {
      const next = (e as CustomEvent<PetMood>).detail;
      if (revertTimer.current) {
        clearTimeout(revertTimer.current);
        revertTimer.current = null;
      }

      if (next === "thinking") {
        activeStream.current = true;
        setMood("thinking");
        return;
      }
      if (next === "idle") {
        activeStream.current = false;
        setMood("idle");
        return;
      }

      // happy / concerned are transient pulses
      activeStream.current = false;
      setMood(next);
      revertTimer.current = setTimeout(() => {
        setMood(activeStream.current ? "thinking" : "idle");
      }, PULSE_MS);
    }

    petBus.addEventListener("mood", onMood);
    return () => {
      petBus.removeEventListener("mood", onMood);
      if (revertTimer.current) clearTimeout(revertTimer.current);
    };
  }, []);

  return mood;
}
