/**
 * CPR Body Environment
 *
 * Attaches a chest target marker to a tracked person via ObjectTracking3D +
 * BodyTrackingAsset. Exposes the chest SceneObject world position so
 * CPRHandDetection can measure hand position relative to it.
 *
 * Two modes:
 *   1. Body-tracking mode: set `trackingObject` to a SceneObject that has
 *      ObjectTracking3D + a BodyTrackingAsset. `chestAnchor` is attached to
 *      Spine2 (mid-sternum).
 *   2. Static-target mode: leave `trackingObject` empty and point
 *      `chestAnchor` at any SceneObject (e.g. a Sphere, a marker on a
 *      cushion). Its world position is used directly.
 *
 * Hackathon build — does not depend on Utilities.lspkg or SnapDecorators.lspkg.
 */
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

  private tracking3D: ObjectTracking3D | null = null;

  /** World position of the chest anchor — read by CPRHandDetection. */
  chestWorldPosition: vec3 = vec3.zero();

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => this.onStart());
    this.createEvent("UpdateEvent").bind(() => this.onUpdate());
  }

  private onStart(): void {
    if (!this.trackingObject) {
      this.log(
        "trackingObject not set — using chestAnchor as a static target (sphere/mannequin mode)"
      );
      return;
    }

    this.tracking3D = this.trackingObject.getComponent(
      "Component.ObjectTracking3D"
    ) as ObjectTracking3D;

    if (!this.tracking3D) {
      this.log("No ObjectTracking3D found on trackingObject");
      return;
    }

    // Spine2 is the mid-sternum — the CPR compression point.
    if (this.chestAnchor) {
      this.tracking3D.addAttachmentPoint(
        BodyTrackingAsset.Spine2,
        this.chestAnchor
      );
      this.log("Chest anchor attached to Spine2");
    } else {
      this.chestAnchor = this.tracking3D.createAttachmentPoint(
        BodyTrackingAsset.Spine2
      );
      this.log("Chest anchor created at Spine2");
    }
  }

  private onUpdate(): void {
    if (!this.chestAnchor) return;
    this.chestWorldPosition = this.chestAnchor
      .getTransform()
      .getWorldPosition();
  }

  private log(msg: string): void {
    if (this.enableLogging) print("[CPRBodyEnvironment] " + msg);
  }
}
