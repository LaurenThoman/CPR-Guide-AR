// ModeController.js
// @input SceneObject learnMode
// @input SceneObject practiceMode
// @input SceneObject quizMode
// @input SceneObject modeSwitcher
// @input SceneObject learnButton
// @input SceneObject practiceButton
// @input SceneObject quizButton

var currentMode = "";
var bound = false;

function bindButton(obj, mode) {
    if (!obj) { print("ModeController: missing button for " + mode); return; }
    var comps = obj.getComponents("Component.ScriptComponent");

    for (var i = 0; i < comps.length; i++) {
        var cb = comps[i].onStateChanged;
        if (cb && typeof cb.add === "function") {
            var wasPressed = false; // per-button state tracker
            cb.add(function(capturedMode) {
                return function(state) {
                    var isPressed = (state === "triggered" || state === "pinched" || state === 2);
                    if (isPressed && !wasPressed) {
                        print("BUTTON PRESSED: " + capturedMode);
                        switchMode(capturedMode);
                    }
                    wasPressed = isPressed;
                };
            }(mode));
            print("ModeController: bound " + mode);
            return;
        }
    }
    print("ModeController: no onStateChanged found on " + obj.name);
}

function switchMode(mode) {
    if (mode === currentMode) return;
    currentMode = mode;

    script.modeSwitcher.enabled  = false;
    script.learnMode.enabled     = (mode === "learn");
    script.practiceMode.enabled  = (mode === "practice");
    script.quizMode.enabled      = (mode === "quiz");

    print("Mode switched to: " + mode);
    global.ModeController.onModeChanged(mode);
}

function returnToModeSelect() {
    currentMode = "";
    script.modeSwitcher.enabled  = true;
    script.learnMode.enabled     = false;
    script.practiceMode.enabled  = false;
    script.quizMode.enabled      = false;
    print("Returned to mode select");
}

var onModeChanged         = function(mode)     { print("STUB: mode changed to " + mode); };
var onCompressionDetected = function()         { print("STUB: compression detected"); };
var onUIReady             = function()         { print("STUB: UI ready"); };
var onAudioTrigger        = function(clipName) { print("STUB: audio trigger - " + clipName); };

global.ModeController = {
    switchMode:            switchMode,
    returnToModeSelect:    returnToModeSelect,
    getCurrentMode:        function() { return currentMode; },
    onModeChanged:         onModeChanged,
    onCompressionDetected: onCompressionDetected,
    onUIReady:             onUIReady,
    onAudioTrigger:        onAudioTrigger
};

var startEvent = script.createEvent("OnStartEvent");
startEvent.bind(function() {
    if (bound) return;
    bound = true;

    if (!script.modeSwitcher || !script.learnMode || !script.practiceMode || !script.quizMode) {
        print("ERROR: missing SceneObject slots");
        return;
    }

    script.modeSwitcher.enabled  = true;
    script.learnMode.enabled     = false;
    script.practiceMode.enabled  = false;
    script.quizMode.enabled      = false;

    bindButton(script.learnButton,    "learn");
    bindButton(script.practiceButton, "practice");
    bindButton(script.quizButton,     "quiz");
});