/**
 * CPR Body Environment
 *
 * Two modes:
 *   DEMO MODE  — set "demoChestAnchor" to a manually-placed SceneObject in the
 *                scene (no body tracking needed). Use this when working on a CPR
 *                manikin that has no tracked skeleton.
 *   LIVE MODE  — leave demoChestAnchor empty and wire up trackingObject instead.
 *                Attaches the chest anchor to the real person's Spine2 joint via
 *                ObjectTracking3D + BodyTrackingAsset.
 *
 * In both modes, chestWorldPosition is updated every frame so CPRHandDetection
 * can measure hand position relative to it.
 *
 * DEMO setup (for recording with a manikin):
 *   1. Add an empty SceneObject, name it "ChestAnchor", position it at the
 *      manikin's sternum in world space.
 *   2. Drag that SceneObject into the "demoChestAnchor" input below.
 *   3. Leave trackingObject empty.
 *
 * LIVE setup (real person body tracking):
 *   1. Add a SceneObject, attach ObjectTracking3D component to it.
 *   2. Set its Tracking Asset to a BodyTrackingAsset.
 *   3. Drag it into "trackingObject". Leave demoChestAnchor empty.
 */
import { Logger } from "Utilities.lspkg/Scripts/Utils/Logger";
import { bindUpdateEvent } from "SnapDecorators.lspkg/decorators";

@component
export class CPRBodyEnvironment extends BaseScriptComponent {
  @ui.label('<span style="color: #34D399;">CPRBodyEnvironment — chest anchor</span>')
  @ui.separator

  // ── DEMO MODE ────────────────────────────────────────────────────────────
  @input
  @hint("DEMO MODE: manually-placed SceneObject at manikin sternum. If set, body tracking is skipped.")
  demoChestAnchor: SceneObject;

  // ── LIVE MODE ─────────────────────────────────────────────────────────────
  @input
  @hint("LIVE MODE: SceneObject with ObjectTracking3D component attached")
  trackingObject: SceneObject = null;

  @input
  @hint("LIVE MODE: child SceneObject to pin to Spine2 (leave empty to auto-create)")
  chestAnchor: SceneObject = null;

  // ── SHARED ────────────────────────────────────────────────────────────────
  @input
  enableLogging: boolean = false;

  private logger: Logger;
  private tracking3D: ObjectTracking3D;
  private activeAnchor: SceneObject;

  /** World position of the chest anchor — read by CPRHandDetection each frame. */
  chestWorldPosition: vec3 = vec3.zero();

  onAwake(): void {
    this.logger = new Logger("CPRBodyEnvironment", this.enableLogging, true);

    if (this.demoChestAnchor) {
      // ── DEMO MODE ──
      this.activeAnchor = this.demoChestAnchor;
      this.logger.debug("Demo mode: using fixed chest anchor");
      return;
    }

    // ── LIVE MODE ──
    if (!this.trackingObject) {
      this.logger.debug("No trackingObject and no demoChestAnchor — chest position fixed at origin");
      return;
    }

    this.tracking3D = this.trackingObject.getComponent(
      "Component.ObjectTracking3D"
    ) as ObjectTracking3D;

    if (!this.tracking3D) {
      this.logger.debug("No ObjectTracking3D found on trackingObject");
      return;
    }

    if (this.chestAnchor) {
      this.tracking3D.addAttachmentPoint(BodyTrackingAsset.Spine2, this.chestAnchor);
      this.activeAnchor = this.chestAnchor;
      this.logger.debug("Chest anchor attached to Spine2");
    } else {
      this.activeAnchor = this.tracking3D.createAttachmentPoint(BodyTrackingAsset.Spine2);
      this.logger.debug("Chest anchor auto-created at Spine2");
    }
  }

  @bindUpdateEvent
  onUpdate(): void {
    if (!this.activeAnchor) return;
    this.chestWorldPosition = this.activeAnchor.getTransform().getWorldPosition();
  }
}
