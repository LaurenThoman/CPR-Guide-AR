// ModeButton.js
// Attach this script to a tappable button SceneObject.
// @input string mode = "learn" {"widget":"combobox", "values":[{"label":"Learn","value":"learn"},{"label":"Practice","value":"practice"},{"label":"Quiz","value":"quiz"}]}

var onTap = script.createEvent("TapEvent");
onTap.bind(function() {
    if (!global.ModeController || !global.ModeController.switchMode) {
        print("ModeController not found. Make sure ModeController.js is active in the scene.");
        return;
    }

    global.ModeController.switchMode(script.mode);
});
