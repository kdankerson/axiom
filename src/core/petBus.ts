export type PetMood = "idle" | "thinking" | "happy" | "concerned";

// A singleton outside the React tree: modules are independent, lazy-loaded,
// route-based components with no shared parent state (see Shell.tsx), but
// the mascot lives in the always-mounted Sidebar and needs to hear about
// activity happening in whichever module is currently routed in.
class PetBus extends EventTarget {
  setMood(mood: PetMood) {
    this.dispatchEvent(new CustomEvent("mood", { detail: mood }));
  }
}

export const petBus = new PetBus();
