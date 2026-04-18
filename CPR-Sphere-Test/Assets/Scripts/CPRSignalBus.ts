/**
 * CPR Signal Bus — shared state between detection and UI layers.
 * All values here match the team signal contract in Team-Plan.md.
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
