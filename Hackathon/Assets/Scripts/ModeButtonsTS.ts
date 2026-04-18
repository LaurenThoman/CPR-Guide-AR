@component
export class ModeButtonsTS extends BaseScriptComponent {
  @input learnButton: InteractionComponent
  @input practiceButton: InteractionComponent
  @input quizButton: InteractionComponent

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => {
      this.bindButton(this.learnButton, "learn")
      this.bindButton(this.practiceButton, "practice")
      this.bindButton(this.quizButton, "quiz")
    })
  }

  private bindButton(button: InteractionComponent, mode: string): void {
    if (!button) {
      print("Missing InteractionComponent for mode: " + mode)
      return
    }

    button.onTap.add(() => {
      this.switchMode(mode)
    })
  }

  private switchMode(mode: string): void {
    const controller = (global as any).ModeController
    if (!controller || !controller.switchMode) {
      print("ModeController not found. Ensure ModeController.js is active.")
      return
    }

    controller.switchMode(mode)
  }
}
