import { AxolotlMascot } from "../../../src/pet/AxolotlMascot";
import { usePetMood } from "../../../src/pet/usePetMood";
import type { PetMood } from "../../../src/core/petBus";

const MOOD_LABEL: Record<PetMood, string> = {
  idle: "Resting",
  thinking: "Thinking…",
  happy: "Happy!",
  concerned: "Concerned",
};

const MOOD_BLURB: Record<PetMood, string> = {
  idle: "Nothing going on right now — just hanging out.",
  thinking: "Working on something over in Chat or Agents.",
  happy: "A chat reply or agent run just finished successfully.",
  concerned: "Something just errored out in Chat or Agents.",
};

export function PetPanel() {
  const mood = usePetMood();

  return (
    <div className="axiom-pet">
      <h1>Pet</h1>
      <div className="axiom-pet-stage">
        <AxolotlMascot size="lg" />
      </div>
      <p className="axiom-pet-mood" data-mood={mood}>
        {MOOD_LABEL[mood]}
      </p>
      <p className="axiom-pet-blurb">{MOOD_BLURB[mood]}</p>
    </div>
  );
}
