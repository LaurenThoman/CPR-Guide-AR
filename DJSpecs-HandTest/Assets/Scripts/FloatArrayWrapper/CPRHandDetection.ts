/**
 * CPR Hand Detection
 *
 * Tracks hand position relative to the chest anchor provided by
 * CPRBodyEnvironment. Detects compression events, calculates BPM,
 * estimates compression depth, and publishes everything to CPRSignalBus.
 *
 * Compression detection strategy:
 *   - "Centered" = dominant hand within XZ_RADIUS of chest and within
 *     Y_HOVER_MAX above chest (hand is hovering over the body).
 *   - A compression starts when the hand moves downward past Y_PRESS_THRESHOLD
 *     relative to the hover baseline.
 *   - The compression event fires at the lowest point (velocity sign flip).
 *   - Depth is the magnitude of that downward excursion in cm.
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
const Y_HOVER_MIN = -2;        // a little below chest surface is ok
const COMPRESSION_MIN_DEPTH = 2.5;  // cm — minimum to register as a compression
const DEPTH_GOOD_MIN = 5.0;    // cm — AHA lower bound
const DEPTH_GOOD_MAX = 6.5;    // cm — AHA upper bound + small margin
const BPM_WINDOW = 8;          // number of intervals used for rolling BPM average
const DT_SMOOTH = 0.15;        // lerp factor for smoothing hand Y velocity

@component
export class CPRHandDetection extends BaseScriptComponent {
  @ui.label('<span style="color: #F87171;">CPRHandDetection — compression detection & BPM</span>')
  @ui.separator

  @input
  @hint("The CPRBodyEnvironment script component on the scene")
  bodyEnvironment: CPRBodyEnvironment;

  @input
  enableLogging: boolean = false;

  private logger: Logger;

  private leftHand: TrackedHand;
  private rightHand: TrackedHand;

  // State machine for a single compression stroke
  private inStroke: boolean = false;
  private strokeBaseline: number = 0;    // hand Y at stroke entry (world cm)
  private strokePeak: number = 0;        // lowest Y reached in this stroke
  private prevHandY: number = 0;
  private smoothedVelocityY: number = 0;
  private prevTime: number = 0;

  // BPM rolling window
  private compressionTimestamps: number[] = [];

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

    const chestPos = this.bodyEnvironment
      ? this.bodyEnvironment.chestWorldPosition
      : vec3.zero();

    const handPos = this.getDominantHandPosition(chestPos);
    if (!handPos) {
      CPRSignalBus.handsCentered = false;
      this.inStroke = false;
      return;
    }

    const dx = handPos.x - chestPos.x;
    const dz = handPos.z - chestPos.z;
    const xzDist = Math.sqrt(dx * dx + dz * dz);
    const dy = handPos.y - chestPos.y;  // positive = hand above chest

    const centered =
      xzDist < XZ_RADIUS && dy >= Y_HOVER_MIN && dy <= Y_HOVER_MAX;
    CPRSignalBus.handsCentered = centered;

    if (!centered) {
      this.inStroke = false;
      return;
    }

    // Smooth velocity to reduce noise
    const rawVelY = (handPos.y - this.prevHandY) / dt;
    this.smoothedVelocityY =
      this.smoothedVelocityY * (1 - DT_SMOOTH) + rawVelY * DT_SMOOTH;
    this.prevHandY = handPos.y;

    if (!this.inStroke && this.smoothedVelocityY < -2) {
      // Hand started moving downward — enter stroke
      this.inStroke = true;
      this.strokeBaseline = handPos.y;
      this.strokePeak = handPos.y;
      this.logger.debug("Compression stroke started");
    }

    if (this.inStroke) {
      if (handPos.y < this.strokePeak) {
        this.strokePeak = handPos.y;
      }

      // Compression completes when hand starts moving up again
      if (this.smoothedVelocityY > 1) {
        const depthCm = this.strokeBaseline - this.strokePeak;
        if (depthCm >= COMPRESSION_MIN_DEPTH) {
          this.registerCompression(depthCm, now);
        }
        this.inStroke = false;
      }
    }
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
      `Compression: depth=${depthCm.toFixed(1)}cm, BPM=${CPRSignalBus.currentBPM}, depth=${CPRSignalBus.compressionDepth}`
    );
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
