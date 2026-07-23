import { useEffect, useRef, useState } from "react";
import { petBus } from "../core/petBus";
import type { PetMood } from "../core/petBus";

const PULSE_MS = 2000;

export function AxolotlMascot() {
  const [mood, setMood] = useState<PetMood>("idle");
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether a stream is currently active so a happy/concerned pulse
  // reverts to "thinking" instead of "idle" if the pet gets a new signal
  // mid-pulse while a run is still going.
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

  return (
    <div className="axiom-axolotl" data-mood={mood} title="AXIOM">
      <svg viewBox="0 0 120 100" className="axiom-axolotl-svg" aria-hidden="true">
        <ellipse className="axiom-axolotl-shadow" cx="60" cy="88" rx="30" ry="5" />

        {/* tail */}
        <path className="axiom-axolotl-tail" d="M 88 62 Q 108 58 112 70 Q 106 66 90 70 Z" />

        {/* gills */}
        <g className="axiom-axolotl-gill axiom-axolotl-gill-left">
          <path d="M 34 34 Q 16 28 12 16" />
          <path d="M 32 40 Q 12 38 6 28" />
          <path d="M 32 46 Q 14 48 8 40" />
        </g>
        <g className="axiom-axolotl-gill axiom-axolotl-gill-right">
          <path d="M 86 34 Q 104 28 108 16" />
          <path d="M 88 40 Q 108 38 114 28" />
          <path d="M 88 46 Q 106 48 112 40" />
        </g>

        {/* legs */}
        <ellipse className="axiom-axolotl-leg" cx="38" cy="76" rx="7" ry="5" />
        <ellipse className="axiom-axolotl-leg" cx="82" cy="76" rx="7" ry="5" />
        <ellipse className="axiom-axolotl-leg" cx="46" cy="80" rx="6" ry="4" />
        <ellipse className="axiom-axolotl-leg" cx="74" cy="80" rx="6" ry="4" />

        {/* body */}
        <ellipse className="axiom-axolotl-body" cx="60" cy="52" rx="34" ry="26" />
        <ellipse className="axiom-axolotl-belly" cx="60" cy="62" rx="20" ry="13" />

        {/* blush */}
        <ellipse className="axiom-axolotl-blush" cx="38" cy="52" rx="5" ry="3" />
        <ellipse className="axiom-axolotl-blush" cx="82" cy="52" rx="5" ry="3" />

        {/* eyes: idle/thinking pair */}
        <g className="axiom-axolotl-eyes-default">
          <circle className="axiom-axolotl-eye" cx="48" cy="44" r="4.5" />
          <circle className="axiom-axolotl-eye" cx="72" cy="44" r="4.5" />
        </g>
        {/* eyes: happy (curved ^ ^) */}
        <g className="axiom-axolotl-eyes-happy">
          <path d="M 43 45 Q 48 39 53 45" />
          <path d="M 67 45 Q 72 39 77 45" />
        </g>
        {/* eyes: concerned (worried slant) */}
        <g className="axiom-axolotl-eyes-concerned">
          <path d="M 44 42 Q 48 46 52 43" />
          <path d="M 68 43 Q 72 46 76 42" />
        </g>

        {/* mouth: default small smile */}
        <path className="axiom-axolotl-mouth-default" d="M 54 58 Q 60 62 66 58" />
        {/* mouth: happy big smile */}
        <path className="axiom-axolotl-mouth-happy" d="M 50 56 Q 60 68 70 56" />
        {/* mouth: concerned small o */}
        <ellipse className="axiom-axolotl-mouth-concerned" cx="60" cy="59" rx="4" ry="5" />
      </svg>
    </div>
  );
}
