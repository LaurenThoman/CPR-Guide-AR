/**
 * CPR Debug HUD
 *
 * Reads from CPRSignalBus every frame and writes a formatted debug string
 * to a Text component. Attach this to a ScreenText or World Text SceneObject.
 *
 * Setup: assign "debugText" to any Text component in the scene.
 */
import { bindUpdateEvent } from "SnapDecorators.lspkg/decorators";
import { CPRSignalBus } from "./CPRSignalBus";
import { CPRBodyEnvironment } from "./CPRBodyEnvironment";

@component
export class CPRDebugHUD extends BaseScriptComponent {
  @input
  @hint("Text component to write debug info into")
  debugText: Text;

  @input
  @hint("Optional: body environment to show chest position")
  bodyEnvironment: CPRBodyEnvironment;

  private compressionCount: number = 0;

  onAwake(): void {
    CPRSignalBus.onCompressionEvent(() => {
      this.compressionCount++;
    });
  }

  @bindUpdateEvent
  onUpdate(): void {
    if (!this.debugText) return;

    const bpm = CPRSignalBus.currentBPM;
    const depth = CPRSignalBus.compressionDepth;
    const centered = CPRSignalBus.handsCentered;

    const bpmColor =
      bpm >= 100 && bpm <= 120 ? "#34D399" : bpm === 0 ? "#94A3B8" : "#F87171";
    const depthColor =
      depth === "good"
        ? "#34D399"
        : depth === "tooDeep"
        ? "#F87171"
        : "#FBBF24";
    const centeredColor = centered ? "#34D399" : "#94A3B8";

    let chestInfo = "";
    if (this.bodyEnvironment) {
      const cp = this.bodyEnvironment.chestWorldPosition;
      chestInfo = `\nChest: (${cp.x.toFixed(1)}, ${cp.y.toFixed(1)}, ${cp.z.toFixed(1)})`;
    }

    this.debugText.text =
      `<color=${bpmColor}>BPM: ${bpm}</color>  ` +
      `<color=${depthColor}>Depth: ${depth}</color>\n` +
      `<color=${centeredColor}>Centered: ${centered}</color>  ` +
      `Compressions: ${this.compressionCount}` +
      chestInfo;
  }
}
