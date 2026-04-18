/**
 * CPR Dummy Simulator
 *
 * Drives CPRSignalBus with synthetic compressions so you can test BPM meters,
 * depth indicators, and audio feedback in Lens Studio preview without needing
 * real Spectacles hand tracking.
 *
 * Disable this script (or set enabled = false) before handing off to Person 1
 * for integration — CPRHandDetection takes over in the real build.
 *
 * Scene setup (takes ~2 minutes):
 *   1. Add a Sphere SceneObject, name it "ChestDummy". Position it in front of
 *      the camera at roughly chest height.
 *   2. Add CPRBodyEnvironment to any SceneObject → drag ChestDummy into
 *      "demoChestAnchor".
 *   3. Add this script to any SceneObject. No inputs required — defaults work.
 *   4. Add CPRSphereTest to the same or another SceneObject → wire ChestDummy
 *      into "sphereObject" and a Text component into "feedbackText".
 *   5. Hit Play. Sphere squishes, text updates, BPM reads ~110.
 *
 * Optional: add CPRDebugHUD to a Screen Text for full signal readout.
 */
import { bindUpdateEvent } from "SnapDecorators.lspkg/decorators";
import { CPRSignalBus } from "./CPRSignalBus";

// Depth sequence cycles through these values to exercise all UI states
const DEPTH_CYCLE: Array<"tooShallow" | "good" | "tooDeep"> = [
  "tooShallow",
  "good",
  "good",
  "good",
  "tooDeep",
  "good",
  "tooShallow",
  "good",
];

@component
export class CPRDummySimulator extends BaseScriptComponent {
  @ui.label('<span style="color: #A78BFA;">CPRDummySimulator — synthetic test signal generator</span>')
  @ui.separator

  @input
  @hint("Compressions per minute to simulate. AHA target: 100-120. Default: 110.")
  simulatedBPM: number = 110;

  @input
  @hint("Cycle through shallow/good/deep depth values to test all UI states. If off, always emits 'good'.")
  cycleThroughDepths: boolean = true;

  @input
  @hint("Simulate hands being off-center for the first N seconds, then center them.")
  offCenterWarmupSeconds: number = 2;

  @input
  @hint("Disable this to freeze the simulator (lets you test the 'no compression' idle state).")
  simulatorEnabled: boolean = true;

  private timer: number = 0;
  private elapsed: number = 0;
  private depthIndex: number = 0;
  private compressionCount: number = 0;

  onAwake(): void {
    // Pre-warm signal bus so subscribers see a valid state immediately
    CPRSignalBus.currentBPM = 0;
    CPRSignalBus.compressionDepth = "tooShallow";
    CPRSignalBus.handsCentered = false;
  }

  @bindUpdateEvent
  onUpdate(): void {
    if (!this.simulatorEnabled) return;

    const dt = getDeltaTime();
    this.elapsed += dt;

    // Hands centered after warmup
    CPRSignalBus.handsCentered = this.elapsed >= this.offCenterWarmupSeconds;

    if (!CPRSignalBus.handsCentered) return;

    const interval = 60 / Math.max(this.simulatedBPM, 1);
    this.timer += dt;

    if (this.timer >= interval) {
      this.timer -= interval;
      this.fireCompression();
    }
  }

  private fireCompression(): void {
    this.compressionCount++;

    // Pick depth
    if (this.cycleThroughDepths) {
      CPRSignalBus.compressionDepth =
        DEPTH_CYCLE[this.depthIndex % DEPTH_CYCLE.length];
      this.depthIndex++;
    } else {
      CPRSignalBus.compressionDepth = "good";
    }

    // Update BPM — use actual simulated value so HUD shows the right number
    CPRSignalBus.currentBPM = Math.round(this.simulatedBPM);

    CPRSignalBus.fireCompressionEvent();
  }
}
