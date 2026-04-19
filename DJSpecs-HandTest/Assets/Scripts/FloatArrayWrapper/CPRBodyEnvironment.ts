/**
 * CPR Body Environment
 *
 * Attaches a chest target marker to a tracked person via ObjectTracking3D +
 * BodyTrackingAsset. Exposes the chest SceneObject world position so
 * CPRHandDetection can measure hand position relative to it.
 *
 * Setup in Lens Studio:
 *   1. Add a SceneObject, attach ObjectTracking3D component to it.
 *   2. In ObjectTracking3D, set Tracking Asset to a BodyTrackingAsset
 *      (add via Add Object > Body Tracking in the scene panel).
 *   3. Drag that SceneObject into the "trackingObject" input below.
 *   4. Optionally assign a visual mesh to "chestMarkerVisual" so you can
 *      see where the chest anchor is (a small sphere works).
 */
import { Logger } from "Utilities.lspkg/Scripts/Utils/Logger";
import { bindUpdateEvent } from "SnapDecorators.lspkg/decorators";

@component
export class CPRBodyEnvironment extends BaseScriptComponent {
  @ui.label('<span style="color: #34D399;">CPRBodyEnvironment — chest anchor from body tracking</span>')
  @ui.separator

  @input
  @hint("SceneObject that has the ObjectTracking3D component attached. Leave empty to use chestAnchor as a static target (e.g. a Sphere).")
  trackingObject: SceneObject | null = null;

  @input
  @hint("Chest anchor SceneObject. If trackingObject is set, this is attached to Spine2. If not, its world position is used directly (e.g. drop in a Sphere here to practice on a static target).")
  chestAnchor: SceneObject | null = null;

  @input
  @hint("Optional: visual mesh on the chest anchor for debug viewing")
  showChestMarker: boolean = true;

  @input
  enableLogging: boolean = false;

  private logger: Logger;
  private tracking3D: ObjectTracking3D | null = null;
  private isBodyTracked: boolean = false;

  /** World position of the chest anchor — read by CPRHandDetection. */
  chestWorldPosition: vec3 = vec3.zero();

  onAwake(): void {
    this.logger = new Logger("CPRBodyEnvironment", this.enableLogging, true);

    if (!this.trackingObject) {
      this.logger.debug(
        "trackingObject not set — using chestAnchor as a static target (sphere/mannequin mode)"
      );
      return;
    }

    this.tracking3D = this.trackingObject.getComponent(
      "Component.ObjectTracking3D"
    ) as ObjectTracking3D;

    if (!this.tracking3D) {
      this.logger.debug("No ObjectTracking3D found on trackingObject");
      return;
    }

    // Attach the chest anchor to the mid-sternum (Spine1 = lower chest,
    // Spine2 = upper chest). Spine2 is closest to the CPR compression point.
    if (this.chestAnchor) {
      this.tracking3D.addAttachmentPoint(
        BodyTrackingAsset.Spine2,
        this.chestAnchor
      );
      this.logger.debug("Chest anchor attached to Spine2");
    } else {
      this.chestAnchor = this.tracking3D.createAttachmentPoint(
        BodyTrackingAsset.Spine2
      );
      this.logger.debug("Chest anchor created at Spine2");
    }
  }

  @bindUpdateEvent
  onUpdate(): void {
    if (!this.chestAnchor) return;
    this.chestWorldPosition = this.chestAnchor
      .getTransform()
      .getWorldPosition();
  }
}
