/**
 * CPR Signal Bus — shared state between detection and UI layers.
 * All values here match the team signal contract in Team-Plan.md.
 *
 * Also published to `global.CPRSignalBus` on module load so plain-JS scripts
 * (PracticeMode.js, PracticeFeedbackAudio.js, etc.) can read the same values
 * without needing to import the TS module.
 */
export const CPRSignalBus = {
  currentBPM: 0,
  compressionDepth: "tooShallow" as "tooShallow" | "good" | "tooDeep",
  handsCentered: false,
  currentMode: "Learn" as "Learn" | "Practice" | "Quiz",

  compressionCallbacks: [] as (() => void)[],

  onCompressionEvent(cb: () => void): void {
    this.compressionCallbacks.push(cb);
  },

  fireCompressionEvent(): void {
    for (const cb of this.compressionCallbacks) {
      cb();
    }
  },
};

// Expose to plain JS at global.CPRSignalBus so PracticeFeedbackAudio.js etc.
// can read the same live state without an import.
(global as any).CPRSignalBus = CPRSignalBus;
