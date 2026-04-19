/**
 * CPR Hand Detection
 *
 * Tracks hand position relative to the chest anchor provided by
 * CPRBodyEnvironment (or a direct SceneObject override). Detects compression
 * events, calculates BPM, estimates depth, publishes to CPRSignalBus, and
 * bridges into the JS global.PracticeMode.registerCompression() so
 * PracticeMode.js round/metronome flow keeps working.
 *
 * Detection strategy:
 *   - "Centered" = dominant hand within xzRadiusCm of chest and within
 *     yHoverMaxCm above / yHoverMinCm below chest. The below-chest slack
 *     must accommodate a full compression (≥6cm), not just the surface.
 *   - Baseline is the highest Y reached while hovering, captured
 *     continuously — so a slow descent doesn't under-report depth.
 *   - A compression starts when smoothed downward velocity crosses the
 *     threshold, and ends at the velocity sign flip (lowest point).
 *
 * AHA 2020 targets: 100–120 BPM, 5–6 cm depth.
 *
 * Hackathon build — does not depend on Utilities.lspkg or SnapDecorators.lspkg.
 */
import { SIK } from "SpectaclesInteractionKit.lspkg/SIK";
import TrackedHand from "SpectaclesInteractionKit.lspkg/Providers/HandInputData/TrackedHand";
import { CPRBodyEnvironment } from "./CPRBodyEnvironment";
import { CPRSignalBus } from "./CPRSignalBus";

const XZ_RADIUS = 20;
const Y_HOVER_MAX = 25;
const Y_HOVER_MIN = -20;
const COMPRESSION_MIN_DEPTH = 2.5;
const DEPTH_GOOD_MIN = 5.0;
const DEPTH_GOOD_MAX = 6.5;
const BPM_WINDOW = 8;
const DT_SMOOTH = 0.15;
const VELOCITY_DOWN_THRESHOLD = -2;
const VELOCITY_UP_THRESHOLD = 1;

@component
export class CPRHandDetection extends BaseScriptComponent {
  @ui.label('<span style="color: #F87171;">CPRHandDetection — compression detection & BPM</span>')
  @ui.separator

  @input
  @hint("The CPRBodyEnvironment script component on the scene")
  bodyEnvironment: CPRBodyEnvironment | null = null;

  @input
  @hint("Optional: drag a SceneObject here (e.g. a Sphere) to use it as the chest target. Takes precedence over bodyEnvironment.")
  chestTargetOverride: SceneObject | null = null;

  @input
  @hint("Horizontal radius (cm) around the chest target that counts as 'centered'. Increase for a larger sphere/mannequin.")
  xzRadiusCm: number = XZ_RADIUS;

  @input
  @hint("Max cm the hand can hover ABOVE the chest target and still count as 'centered'.")
  yHoverMaxCm: number = Y_HOVER_MAX;

  @input
  @hint("Max cm the hand can go BELOW the chest target and still count as 'centered'. Must fit a full compression (default -20).")
  yHoverMinCm: number = Y_HOVER_MIN;

  @input
  @hint("When true, calls global.PracticeMode.registerCompression() on every compression so the Practice round counter + metronome react.")
  bridgeToPracticeMode: boolean = true;

  @input
  enableLogging: boolean = false;

  @input
  @hint("Print chest/hand positions once per second while logging is on. Useful for calibration.")
  debugPositions: boolean = false;

  private leftHand: TrackedHand;
  private rightHand: TrackedHand;

  private inStroke: boolean = false;
  private strokeBaseline: number = 0;
  private strokePeak: number = 0;
  private prevHandY: number = 0;
  private hasValidPrevY: boolean = false;
  private smoothedVelocityY: number = 0;
  private prevTime: number = 0;

  private hoverHighY: number = 0;
  private hasHoverHighY: boolean = false;

  private compressionTimestamps: number[] = [];

  private lastDebugLog: number = 0;

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => this.onStart());
    this.createEvent("UpdateEvent").bind(() => this.onUpdate());
  }

  private onStart(): void {
    this.leftHand = SIK.HandInputData.getHand("left");
    this.rightHand = SIK.HandInputData.getHand("right");
    this.prevTime = getTime();
  }

  private onUpdate(): void {
    const now = getTime();
    const dt = Math.max(now - this.prevTime, 0.001);
    this.prevTime = now;

    const chestPos = this.getChestPosition();

    const handPos = this.getDominantHandPosition(chestPos);
    if (!handPos) {
      CPRSignalBus.handsCentered = false;
      this.resetStrokeState();
      return;
    }

    const dx = handPos.x - chestPos.x;
    const dz = handPos.z - chestPos.z;
    const xzDist = Math.sqrt(dx * dx + dz * dz);
    const dy = handPos.y - chestPos.y;

    const centered =
      xzDist < this.xzRadiusCm &&
      dy >= this.yHoverMinCm &&
      dy <= this.yHoverMaxCm;
    CPRSignalBus.handsCentered = centered;

    if (this.debugPositions && now - this.lastDebugLog > 1.0) {
      this.log(
        "chest.y=" + chestPos.y.toFixed(1) +
        " hand.y=" + handPos.y.toFixed(1) +
        " dy=" + dy.toFixed(1) +
        " xz=" + xzDist.toFixed(1) +
        " centered=" + centered
      );
      this.lastDebugLog = now;
    }

    if (!centered) {
      this.resetStrokeState();
      return;
    }

    // On re-entry to the centered zone, seed prevHandY and skip velocity
    // calc this frame to avoid a huge fake dY triggering a false stroke.
    if (!this.hasValidPrevY) {
      this.prevHandY = handPos.y;
      this.smoothedVelocityY = 0;
      this.hasValidPrevY = true;
      return;
    }

    const rawVelY = (handPos.y - this.prevHandY) / dt;
    this.smoothedVelocityY =
      this.smoothedVelocityY * (1 - DT_SMOOTH) + rawVelY * DT_SMOOTH;
    this.prevHandY = handPos.y;

    // Track highest Y while hovering → true stroke baseline.
    if (!this.inStroke) {
      if (!this.hasHoverHighY || handPos.y > this.hoverHighY) {
        this.hoverHighY = handPos.y;
        this.hasHoverHighY = true;
      }
    }

    if (!this.inStroke && this.smoothedVelocityY < VELOCITY_DOWN_THRESHOLD) {
      this.inStroke = true;
      this.strokeBaseline = this.hasHoverHighY ? this.hoverHighY : handPos.y;
      this.strokePeak = handPos.y;
      this.hasHoverHighY = false;
      this.log("Compression stroke started (baseline=" + this.strokeBaseline.toFixed(2) + ")");
    }

    if (this.inStroke) {
      if (handPos.y < this.strokePeak) {
        this.strokePeak = handPos.y;
      }

      if (this.smoothedVelocityY > VELOCITY_UP_THRESHOLD) {
        const depthCm = this.strokeBaseline - this.strokePeak;
        this.log("Stroke ended: depth=" + depthCm.toFixed(2) + "cm (min=" + COMPRESSION_MIN_DEPTH + ")");
        if (depthCm >= COMPRESSION_MIN_DEPTH) {
          this.registerCompression(depthCm, now);
        }
        this.inStroke = false;
      }
    }
  }

  private resetStrokeState(): void {
    this.inStroke = false;
    this.hasValidPrevY = false;
    this.hasHoverHighY = false;
  }

  private registerCompression(depthCm: number, now: number): void {
    if (depthCm < DEPTH_GOOD_MIN) {
      CPRSignalBus.compressionDepth = "tooShallow";
    } else if (depthCm > DEPTH_GOOD_MAX) {
      CPRSignalBus.compressionDepth = "tooDeep";
    } else {
      CPRSignalBus.compressionDepth = "good";
    }

    this.compressionTimestamps.push(now);
    if (this.compressionTimestamps.length > BPM_WINDOW + 1) {
      this.compressionTimestamps.shift();
    }
    if (this.compressionTimestamps.length >= 2) {
      const intervals = this.compressionTimestamps.length - 1;
      const span =
        this.compressionTimestamps[this.compressionTimestamps.length - 1] -
        this.compressionTimestamps[0];
      CPRSignalBus.currentBPM = Math.round((intervals / span) * 60);
    }

    CPRSignalBus.fireCompressionEvent();

    // Bridge into the existing JS PracticeMode round flow.
    if (this.bridgeToPracticeMode) {
      const g: any = global as any;
      if (g.PracticeMode && typeof g.PracticeMode.registerCompression === "function") {
        g.PracticeMode.registerCompression();
      }
    }

    this.log(
      "Compression: depth=" + depthCm.toFixed(1) +
      "cm, BPM=" + CPRSignalBus.currentBPM +
      ", class=" + CPRSignalBus.compressionDepth
    );
  }

  /**
   * Priority: chestTargetOverride > bodyEnvironment > origin.
   */
  private getChestPosition(): vec3 {
    if (this.chestTargetOverride) {
      return this.chestTargetOverride.getTransform().getWorldPosition();
    }
    if (this.bodyEnvironment) {
      return this.bodyEnvironment.chestWorldPosition;
    }
    return vec3.zero();
  }

  private getDominantHandPosition(chestPos: vec3): vec3 | null {
    const leftTracked = this.leftHand && this.leftHand.isTracked();
    const rightTracked = this.rightHand && this.rightHand.isTracked();

    if (!leftTracked && !rightTracked) return null;

    if (leftTracked && rightTracked) {
      const lp = this.leftHand.wrist.position;
      const rp = this.rightHand.wrist.position;
      const ldxz = Math.sqrt(
        Math.pow(lp.x - chestPos.x, 2) + Math.pow(lp.z - chestPos.z, 2)
      );
      const rdxz = Math.sqrt(
        Math.pow(rp.x - chestPos.x, 2) + Math.pow(rp.z - chestPos.z, 2)
      );
      return ldxz < rdxz ? lp : rp;
    }

    return leftTracked
      ? this.leftHand.wrist.position
      : this.rightHand.wrist.position;
  }

  private log(msg: string): void {
    if (this.enableLogging) print("[CPRHandDetection] " + msg);
  }
}
