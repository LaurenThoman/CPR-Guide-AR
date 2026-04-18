/**
 * CPR Sphere Test
 *
 * Drop this on a SceneObject alongside a sphere mesh. Wire the sphere as the
 * demoChestAnchor in CPRBodyEnvironment so hand detection knows where the
 * "chest" is. This script handles visual feedback on the sphere itself:
 *
 *   - Squish animation on every detected compression
 *   - Material color: white (idle) | green (good depth) | yellow (too shallow) | red (too deep)
 *   - HUD text showing BPM, depth quality, compression count, and hand centering
 *
 * Scene setup:
 *   1. Create a Sphere SceneObject — set it as CPRBodyEnvironment.demoChestAnchor
 *   2. Add this script to the same or any SceneObject
 *   3. Wire sphereObject → the Sphere, feedbackText → a Text component (optional)
 *   4. Make sure CPRBodyEnvironment + CPRHandDetection are active in the scene
 */
import { bindUpdateEvent } from "SnapDecorators.lspkg/decorators";
import { CPRSignalBus } from "./CPRSignalBus";

// AHA 2020 BPM targets
const BPM_TARGET_MIN = 100;
const BPM_TARGET_MAX = 120;

// Squish animation
const SQUISH_DURATION = 0.2;   // seconds for one compress-and-release cycle
const SQUISH_SCALE = 0.82;     // scale at maximum compression

@component
export class CPRSphereTest extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">CPRSphereTest — sphere dummy visual feedback</span>')
  @ui.separator

  @input
  @hint("The sphere SceneObject used as the chest dummy")
  sphereObject: SceneObject;

  @input
  @hint("Optional Text component for BPM / depth HUD (leave empty to skip)")
  feedbackText: Text;

  @input
  @hint("Index of the material slot on the sphere's RenderMeshVisual (usually 0)")
  materialSlot: number = 0;

  @input
  enableLogging: boolean = false;

  // ── Internal state ────────────────────────────────────────────────────────
  private sphereTransform: Transform;
  private sphereMaterial: Material;
  private baseScale: vec3;

  private compressionCount: number = 0;
  private lastDepth: "tooShallow" | "good" | "tooDeep" | "none" = "none";

  // Squish animation
  private squishTimer: number = 0;
  private isSquishing: boolean = false;

  // ── Colors ────────────────────────────────────────────────────────────────
  private static readonly COLOR_IDLE    = new vec4(0.9, 0.9, 0.9, 1.0); // light grey
  private static readonly COLOR_GOOD    = new vec4(0.2, 0.85, 0.4, 1.0); // green
  private static readonly COLOR_SHALLOW = new vec4(1.0, 0.85, 0.1, 1.0); // yellow
  private static readonly COLOR_DEEP    = new vec4(0.95, 0.25, 0.25, 1.0); // red

  onAwake(): void {
    if (!this.sphereObject) {
      print("CPRSphereTest: sphereObject not set — nothing to animate");
      return;
    }

    this.sphereTransform = this.sphereObject.getTransform();
    this.baseScale = this.sphereTransform.getLocalScale();

    const mesh = this.sphereObject.getComponent(
      "Component.RenderMeshVisual"
    ) as RenderMeshVisual;

    if (mesh) {
      // Clone so we don't mutate the shared asset material
      this.sphereMaterial = mesh.getMaterial(this.materialSlot);
      if (this.sphereMaterial) {
        this.setColor(CPRSphereTest.COLOR_IDLE);
      }
    } else {
      print("CPRSphereTest: no RenderMeshVisual found on sphereObject — color feedback disabled");
    }

    CPRSignalBus.onCompressionEvent(() => {
      this.compressionCount++;
      this.lastDepth = CPRSignalBus.compressionDepth;
      this.triggerSquish();
      this.updateColor();

      if (this.enableLogging) {
        print(
          `CPRSphereTest: #${this.compressionCount} | ` +
          `BPM: ${CPRSignalBus.currentBPM} | ` +
          `Depth: ${this.lastDepth}`
        );
      }
    });
  }

  @bindUpdateEvent
  onUpdate(): void {
    this.updateSquish(getDeltaTime());
    this.updateHUD();
  }

  // ── Squish animation ──────────────────────────────────────────────────────

  private triggerSquish(): void {
    this.squishTimer = 0;
    this.isSquishing = true;
  }

  private updateSquish(dt: number): void {
    if (!this.isSquishing || !this.sphereTransform) return;

    this.squishTimer += dt;
    const progress = this.squishTimer / SQUISH_DURATION;

    if (progress >= 1.0) {
      this.sphereTransform.setLocalScale(this.baseScale);
      this.isSquishing = false;
      return;
    }

    // Sine arc: compress down then spring back
    const s = Math.sin(progress * Math.PI); // 0 → 1 → 0
    const uniformScale = 1.0 - (1.0 - SQUISH_SCALE) * s;

    // Squish: shrink Y, expand XZ slightly to conserve volume feel
    const scaleXZ = 1.0 + (1.0 - uniformScale) * 0.4;
    this.sphereTransform.setLocalScale(
      new vec3(
        this.baseScale.x * scaleXZ,
        this.baseScale.y * uniformScale,
        this.baseScale.z * scaleXZ
      )
    );
  }

  // ── Color feedback ────────────────────────────────────────────────────────

  private updateColor(): void {
    if (!this.sphereMaterial) return;
    switch (this.lastDepth) {
      case "good":       this.setColor(CPRSphereTest.COLOR_GOOD);    break;
      case "tooShallow": this.setColor(CPRSphereTest.COLOR_SHALLOW); break;
      case "tooDeep":    this.setColor(CPRSphereTest.COLOR_DEEP);    break;
      default:           this.setColor(CPRSphereTest.COLOR_IDLE);
    }
  }

  private setColor(color: vec4): void {
    this.sphereMaterial.mainPass.baseColor = color;
  }

  // ── HUD text ──────────────────────────────────────────────────────────────

  private updateHUD(): void {
    if (!this.feedbackText) return;

    const bpm = CPRSignalBus.currentBPM;
    const depth = CPRSignalBus.compressionDepth;
    const centered = CPRSignalBus.handsCentered;

    const bpmStr  = bpm > 0 ? `${bpm}` : "--";
    const bpmNote = bpm <= 0           ? ""
                  : bpm < BPM_TARGET_MIN ? " (speed up)"
                  : bpm > BPM_TARGET_MAX ? " (slow down)"
                  : " (on target)";

    const depthLabel = depth === "good"       ? "Good (5-6.5 cm)"
                     : depth === "tooShallow" ? "Too Shallow"
                     : depth === "tooDeep"    ? "Too Deep"
                     : "--";

    this.feedbackText.text =
      `BPM: ${bpmStr}${bpmNote}\n` +
      `Depth: ${depthLabel}\n` +
      `Compressions: ${this.compressionCount}\n` +
      `Hands: ${centered ? "Centered" : "Move over sphere"}`;
  }
}
