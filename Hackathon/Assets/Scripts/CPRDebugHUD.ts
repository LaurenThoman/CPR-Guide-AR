/**
 * CPR Debug HUD
 *
 * Reads from CPRSignalBus every frame and writes a formatted debug string
 * to a Text component. Attach this to a ScreenText or World Text SceneObject.
 *
 * Hackathon build — does not depend on SnapDecorators.lspkg.
 */
import { CPRSignalBus } from "./CPRSignalBus";
import { CPRBodyEnvironment } from "./CPRBodyEnvironment";

@component
export class CPRDebugHUD extends BaseScriptComponent {
  @input
  @hint("Text component to write debug info into")
  debugText: Text | null = null;

  @input
  @hint("Optional: body environment to show chest position")
  bodyEnvironment: CPRBodyEnvironment | null = null;

  private compressionCount: number = 0;

  onAwake(): void {
    CPRSignalBus.onCompressionEvent(() => {
      this.compressionCount++;
    });
    this.createEvent("UpdateEvent").bind(() => this.onUpdate());
  }

  private onUpdate(): void {
    if (!this.debugText) return;

    const bpm = CPRSignalBus.currentBPM;
    const depth = CPRSignalBus.compressionDepth;
    const centered = CPRSignalBus.handsCentered;

    let chestInfo = "";
    if (this.bodyEnvironment) {
      const cp = this.bodyEnvironment.chestWorldPosition;
      chestInfo = "\nChest: (" + cp.x.toFixed(1) + ", " + cp.y.toFixed(1) + ", " + cp.z.toFixed(1) + ")";
    }

    this.debugText.text =
      "BPM: " + bpm + "  Depth: " + depth + "\n" +
      "Centered: " + centered + "  Compressions: " + this.compressionCount +
      chestInfo;
  }
}
