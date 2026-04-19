/**
 * CPR Hand Detection
 *
 * Tracks hand position relative to the chest anchor provided by
 * CPRBodyEnvironment. Detects compression events, calculates BPM,
 * estimates compression depth, and publishes everything to CPRSignalBus.
 *
 * Compression detection strategy:
 *   - "Centered" = dominant hand within XZ_RADIUS of chest and within
 *     Y_HOVER_MAX above / Y_HOVER_MIN below chest. The below-chest slack
 *     must accommodate a full compression (≥6cm), not just the surface.
 *   - Baseline is the highest Y reached while hovering, captured
 *     continuously — so a slow descent doesn't under-report depth.
 *   - A compression starts when smoothed downward velocity crosses the
 *     threshold, and ends at the velocity sign flip (lowest point).
 *   - Depth is the magnitude of the downward excursion in cm.
 *
 * AHA 2020 targets: 100–120 BPM, 5–6 cm depth.
 */
import { Logger } from "Utilities.lspkg/Scripts/Utils/Logger";
import { bindUpdateEvent } from "SnapDecorators.lspkg/decorators";
import { SIK } from "SpectaclesInteractionKit.lspkg/SIK";
import TrackedHand from "SpectaclesInteractionKit.lspkg/Providers/HandInputData/TrackedHand";
import { CPRBodyEnvironment } from "./CPRBodyEnvironment";
import { CPRSignalBus } from "./CPRSignalBus";

// Tuning constants (in Lens Studio world units = cm)
const XZ_RADIUS = 20;          // max horizontal distance to count as "over chest"
const Y_HOVER_MAX = 25;        // max cm above chest to be in hover zone
const Y_HOVER_MIN = -20;       // max cm BELOW chest — must accommodate full compression
const COMPRESSION_MIN_DEPTH = 2.5;  // cm — minimum to register as a compression
const DEPTH_GOOD_MIN = 5.0;    // cm — AHA lower bound
const DEPTH_GOOD_MAX = 6.5;    // cm — AHA upper bound + small margin
const BPM_WINDOW = 8;          // number of intervals used for rolling BPM average
const DT_SMOOTH = 0.15;        // lerp factor for smoothing hand Y velocity
const VELOCITY_DOWN_THRESHOLD = -2;  // cm/s (smoothed) — stroke entry
const VELOCITY_UP_THRESHOLD = 1;     // cm/s (smoothed) — stroke exit

@component
export class CPRHandDetection extends BaseScriptComponent {
  @ui.label('<span style="color: #F87171;">CPRHandDetection — compression detection & BPM</span>')
  @ui.separator

  @input
  @hint("The CPRBodyEnvironment script component on the scene")
  bodyEnvironment: CPRBodyEnvironment | null = null;

  @input
  @hint("Optional: drag a SceneObject here (e.g. a Sphere) to use it as the chest target instead of body tracking. When set, takes precedence over bodyEnvironment.")
  chestTargetOverride: SceneObject | null = null;

  @input
  @hint("Horizontal radius (cm) around the chest target that counts as 'centered'. Increase this when practicing on a larger sphere/mannequin.")
  xzRadiusCm: number = XZ_RADIUS;

  @input
  @hint("Max cm the hand can hover ABOVE the chest target and still count as 'centered'.")
  yHoverMaxCm: number = Y_HOVER_MAX;

  @input
  @hint("Max cm the hand can go BELOW the chest target and still count as 'centered'. Must be large enough to fit a full compression (default -20).")
  yHoverMinCm: number = Y_HOVER_MIN;

  @input
  enableLogging: boolean = false;

  @input
  @hint("Print chest/hand positions once per second while logging is on. Useful for first-time calibration.")
  debugPositions: boolean = false;

  private logger: Logger;

  private leftHand: TrackedHand;
  private rightHand: TrackedHand;

  // State machine for a single compression stroke
  private inStroke: boolean = false;
  private strokeBaseline: number = 0;    // hand Y at stroke entry (world cm)
  private strokePeak: number = 0;        // lowest Y reached in this stroke
  private prevHandY: number = 0;
  private hasValidPrevY: boolean = false;
  private smoothedVelocityY: number = 0;
  private prevTime: number = 0;

  // Highest Y seen while hovering — used as baseline when a stroke starts
  private hoverHighY: number = 0;
  private hasHoverHighY: boolean = false;

  // BPM rolling window
  private compressionTimestamps: number[] = [];

  // Debug log throttle
  private lastDebugLog: number = 0;

  onAwake(): void {
    this.logger = new Logger("CPRHandDetection", this.enableLogging, true);
    this.leftHand = SIK.HandInputData.getHand("left");
    this.rightHand = SIK.HandInputData.getHand("right");
    this.prevTime = getTime();
  }

  @bindUpdateEvent
  onUpdate(): void {
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
    const dy = handPos.y - chestPos.y;  // positive = hand above chest

    const centered =
      xzDist < this.xzRadiusCm &&
      dy >= this.yHoverMinCm &&
      dy <= this.yHoverMaxCm;
    CPRSignalBus.handsCentered = centered;

    if (this.debugPositions && now - this.lastDebugLog > 1.0) {
      this.logger.debug(
        `chest.y=${chestPos.y.toFixed(1)} hand.y=${handPos.y.toFixed(1)} ` +
        `dy=${dy.toFixed(1)} xz=${xzDist.toFixed(1)} centered=${centered}`
      );
      this.lastDebugLog = now;
    }

    if (!centered) {
      this.resetStrokeState();
      return;
    }

    // On re-entry to the centered zone, seed prevHandY and skip velocity
    // calc this frame so a stale prevHandY doesn't produce a huge fake dY
    // that flows into the smoothing filter and triggers a false stroke.
    if (!this.hasValidPrevY) {
      this.prevHandY = handPos.y;
      this.smoothedVelocityY = 0;
      this.hasValidPrevY = true;
      return;
    }

    // Smooth velocity to reduce noise
    const rawVelY = (handPos.y - this.prevHandY) / dt;
    this.smoothedVelocityY =
      this.smoothedVelocityY * (1 - DT_SMOOTH) + rawVelY * DT_SMOOTH;
    this.prevHandY = handPos.y;

    // Track the highest Y reached while hovering so the baseline reflects
    // the true starting height — not wherever the hand happened to be the
    // frame the velocity filter finally crossed the threshold.
    if (!this.inStroke) {
      if (!this.hasHoverHighY || handPos.y > this.hoverHighY) {
        this.hoverHighY = handPos.y;
        this.hasHoverHighY = true;
      }
    }

    if (!this.inStroke && this.smoothedVelocityY < VELOCITY_DOWN_THRESHOLD) {
      // Hand started moving downward — enter stroke
      this.inStroke = true;
      this.strokeBaseline = this.hasHoverHighY ? this.hoverHighY : handPos.y;
      this.strokePeak = handPos.y;
      this.hasHoverHighY = false;
      this.logger.debug(
        `Compression stroke started (baseline=${this.strokeBaseline.toFixed(2)})`
      );
    }

    if (this.inStroke) {
      if (handPos.y < this.strokePeak) {
        this.strokePeak = handPos.y;
      }

      // Compression completes when hand starts moving up again
      if (this.smoothedVelocityY > VELOCITY_UP_THRESHOLD) {
        const depthCm = this.strokeBaseline - this.strokePeak;
        this.logger.debug(
          `Stroke ended: depth=${depthCm.toFixed(2)}cm (min=${COMPRESSION_MIN_DEPTH})`
        );
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
    // Depth classification
    if (depthCm < DEPTH_GOOD_MIN) {
      CPRSignalBus.compressionDepth = "tooShallow";
    } else if (depthCm > DEPTH_GOOD_MAX) {
      CPRSignalBus.compressionDepth = "tooDeep";
    } else {
      CPRSignalBus.compressionDepth = "good";
    }

    // Rolling BPM
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
    this.logger.debug(
      `Compression: depth=${depthCm.toFixed(1)}cm, BPM=${CPRSignalBus.currentBPM}, class=${CPRSignalBus.compressionDepth}`
    );
  }

  /**
   * Resolves the chest target position this frame.
   * Priority: explicit SceneObject override > CPRBodyEnvironment > origin.
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

  /**
   * Returns the wrist position of the hand closest to the chest.
   * If only one hand is tracked, uses that. Falls back to null if neither.
   */
  private getDominantHandPosition(chestPos: vec3): vec3 | null {
    const leftTracked = this.leftHand.isTracked();
    const rightTracked = this.rightHand.isTracked();

    if (!leftTracked && !rightTracked) return null;

    if (leftTracked && rightTracked) {
      const lp = this.leftHand.wrist.position;
      const rp = this.rightHand.wrist.position;
      // Pick whichever wrist is closer to the chest horizontally
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
}