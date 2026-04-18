import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"

export type CprMode = "Learn" | "Practice" | "Quiz"
export type CompressionDepth = "tooShallow" | "good" | "tooDeep"

export type CompressionEventData = {
  bpm: number
  compressionDistanceCm: number
  timestampMs: number
}

@component
export class CprSignalBus extends BaseScriptComponent {
  currentBPM: number = 0
  compressionDepth: CompressionDepth = "tooShallow"
  handsCentered: boolean = false
  currentMode: CprMode = "Learn"
  compressionCount: number = 0
  lastCompressionTimestampMs: number = 0

  private compressionEvent = new Event<CompressionEventData>()
  readonly onCompressionEvent: PublicApi<CompressionEventData> = this.compressionEvent.publicApi()

  onAwake() {
    ;(global as any).cprSignalBus = this
  }

  setCurrentMode(mode: CprMode) {
    this.currentMode = mode
  }

  setHandsCentered(centered: boolean) {
    this.handsCentered = centered
  }

  setCompressionDepth(depth: CompressionDepth) {
    this.compressionDepth = depth
  }

  publishCompression(bpm: number, depth: CompressionDepth, handsCentered: boolean, compressionDistanceCm: number) {
    const timestampMs = getTime() * 1000

    this.currentBPM = bpm
    this.compressionDepth = depth
    this.handsCentered = handsCentered
    this.compressionCount += 1
    this.lastCompressionTimestampMs = timestampMs

    this.compressionEvent.invoke({
      bpm,
      compressionDistanceCm,
      timestampMs
    })
  }

  resetSignals() {
    this.currentBPM = 0
    this.compressionDepth = "tooShallow"
    this.handsCentered = false
    this.compressionCount = 0
    this.lastCompressionTimestampMs = 0
  }
}
