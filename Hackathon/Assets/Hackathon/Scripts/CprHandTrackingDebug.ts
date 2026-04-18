import {SIK} from "SpectaclesInteractionKit.lspkg/SIK"
import TrackedHand from "SpectaclesInteractionKit.lspkg/Providers/HandInputData/TrackedHand"
import {CompressionDepth, CprSignalBus} from "./CprSignalBus"

@component
export class CprHandTrackingDebug extends BaseScriptComponent {
  @input
  signalBus: CprSignalBus | null = null

  @input
  debugText: Text | null = null

  @input
  chestTarget: SceneObject | null = null

  @input
  handMarker: SceneObject | null = null

  @input
  placementMaxDistanceCm: number = 10

  @input
  compressionDownThresholdCm: number = 3

  @input
  compressionReleaseThresholdCm: number = 1.25

  @input
  goodDepthMinCm: number = 4

  @input
  goodDepthMaxCm: number = 6

  @input
  baselineFollowSpeed: number = 0.08

  private leftHand!: TrackedHand
  private rightHand!: TrackedHand
  private compressionActive: boolean = false
  private baselineHeightCm: number | null = null
  private lastCompressionTimesMs: number[] = []
  private trackingModeLabel: string = "none"

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => this.onStart())
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  private onStart() {
    this.leftHand = SIK.HandInputData.getHand("left")
    this.rightHand = SIK.HandInputData.getHand("right")
  }

  private onUpdate() {
    const representativePosition = this.getRepresentativeHandPosition()
    if (representativePosition === null) {
      this.compressionActive = false
      this.updateDebugText("No hand tracked")
      return
    }

    this.updateMarker(representativePosition)

    const handsCentered = this.getHandsCentered(representativePosition)
    const currentHeightCm = representativePosition.y

    if (this.baselineHeightCm === null) {
      this.baselineHeightCm = currentHeightCm
    }

    const compressionDistanceCm = Math.max(0, this.baselineHeightCm - currentHeightCm)
    const depth = this.classifyDepth(compressionDistanceCm)

    if (!this.compressionActive && compressionDistanceCm >= this.compressionDownThresholdCm) {
      this.compressionActive = true
      const bpm = this.recordCompression(compressionDistanceCm, depth, handsCentered)
      if (this.signalBus) {
        this.signalBus.publishCompression(bpm, depth, handsCentered, compressionDistanceCm)
      }
    } else if (this.compressionActive && compressionDistanceCm <= this.compressionReleaseThresholdCm) {
      this.compressionActive = false
    }

    if (!this.compressionActive) {
      this.baselineHeightCm = this.lerp(this.baselineHeightCm, currentHeightCm, this.baselineFollowSpeed)
    }

    if (this.signalBus) {
      this.signalBus.setHandsCentered(handsCentered)
      this.signalBus.setCompressionDepth(depth)
    }
    this.updateDebugText(
      this.buildDebugLines({
        handsCentered,
        compressionDistanceCm,
        depth
      })
    )
  }

  private getRepresentativeHandPosition(): vec3 | null {
    const leftTracked = this.leftHand && this.leftHand.isTracked()
    const rightTracked = this.rightHand && this.rightHand.isTracked()

    if (leftTracked && rightTracked) {
      const leftPalm = this.getPalmEstimate(this.leftHand)
      const rightPalm = this.getPalmEstimate(this.rightHand)
      const handSeparationCm = leftPalm.distance(rightPalm)

      if (this.chestTarget) {
        const targetPosition = this.chestTarget.getTransform().getWorldPosition()
        const leftDistanceToTarget = leftPalm.distance(targetPosition)
        const rightDistanceToTarget = rightPalm.distance(targetPosition)

        if (handSeparationCm <= 12) {
          this.trackingModeLabel = "stacked-target-nearest"
        } else {
          this.trackingModeLabel = "dual-target-nearest"
        }

        return leftDistanceToTarget <= rightDistanceToTarget ? leftPalm : rightPalm
      }

      if (handSeparationCm <= 12) {
        this.trackingModeLabel = "stacked-both"
        return this.average(leftPalm, rightPalm)
      }

      this.trackingModeLabel = "top-hand-fallback"
      return leftPalm.y <= rightPalm.y ? leftPalm : rightPalm
    }

    if (leftTracked) {
      this.trackingModeLabel = "left-only"
      return this.getPalmEstimate(this.leftHand)
    }

    if (rightTracked) {
      this.trackingModeLabel = "right-only"
      return this.getPalmEstimate(this.rightHand)
    }

    this.trackingModeLabel = "none"
    return null
  }

  private getPalmEstimate(hand: TrackedHand): vec3 {
    return this.average(hand.wrist.position, hand.middleKnuckle.position)
  }

  private getHandsCentered(position: vec3): boolean {
    if (!this.chestTarget) {
      return false
    }

    const targetPosition = this.chestTarget.getTransform().getWorldPosition()
    return position.sub(targetPosition).length <= this.placementMaxDistanceCm
  }

  private classifyDepth(compressionDistanceCm: number): CompressionDepth {
    if (compressionDistanceCm < this.goodDepthMinCm) {
      return "tooShallow"
    }

    if (compressionDistanceCm > this.goodDepthMaxCm) {
      return "tooDeep"
    }

    return "good"
  }

  private recordCompression(
    _compressionDistanceCm: number,
    depth: CompressionDepth,
    handsCentered: boolean
  ): number {
    const nowMs = getTime() * 1000
    this.lastCompressionTimesMs.push(nowMs)

    while (this.lastCompressionTimesMs.length > 8) {
      this.lastCompressionTimesMs.shift()
    }

    if (this.lastCompressionTimesMs.length < 2) {
      return 0
    }

    const first = this.lastCompressionTimesMs[0]
    const last = this.lastCompressionTimesMs[this.lastCompressionTimesMs.length - 1]
    const intervals = this.lastCompressionTimesMs.length - 1
    const bpm = Math.round((intervals * 60000) / Math.max(1, last - first))

    if (this.signalBus) {
      this.signalBus.currentBPM = bpm
      this.signalBus.setCompressionDepth(depth)
      this.signalBus.setHandsCentered(handsCentered)
    }

    return bpm
  }

  private updateMarker(position: vec3) {
    if (!this.handMarker) {
      return
    }

    this.handMarker.getTransform().setWorldPosition(position)
  }

  private buildDebugLines(data: {
    handsCentered: boolean
    compressionDistanceCm: number
    depth: CompressionDepth
  }): string {
    const bpm = this.signalBus ? this.signalBus.currentBPM : 0
    const count = this.signalBus ? this.signalBus.compressionCount : 0

    return [
      `Tracking: ${this.trackingModeLabel}`,
      `Centered: ${data.handsCentered}`,
      `Depth: ${data.depth}`,
      `Travel(cm): ${data.compressionDistanceCm.toFixed(1)}`,
      `BPM: ${bpm}`,
      `Compressions: ${count}`
    ].join("\n")
  }

  private updateDebugText(value: string) {
    if (this.debugText) {
      this.debugText.text = value
    }
  }

  private average(a: vec3, b: vec3): vec3 {
    return new vec3((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, (a.z + b.z) * 0.5)
  }

  private lerp(from: number, to: number, t: number): number {
    return from + (to - from) * t
  }
}
