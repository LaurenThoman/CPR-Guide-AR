// TestSwitcher.js — no longer needs to bind ToggleGroup directly
// ModeController handles all button binding now

var startEvent = script.createEvent("OnStartEvent");
startEvent.bind(function() {
    if (global.ModeController) {
        print("TestSwitcher: ModeController is live, current mode: " + global.ModeController.getCurrentMode());
    } else {
        print("TestSwitcher: WARNING — ModeController not found");
    }
});