// ModeController.js
// @input SceneObject learnMode
// @input SceneObject practiceMode
// @input SceneObject quizMode
// @input Component.ScriptComponent learnButton
// @input Component.ScriptComponent practiceButton
// @input Component.ScriptComponent quizButton

var currentMode = "";
var bound = false; // prevents rebinding on lens reset

function switchMode(mode) {
    if (mode === currentMode) return;
    currentMode = mode;

    script.learnMode.enabled    = (mode === "learn");
    script.practiceMode.enabled = (mode === "practice");
    script.quizMode.enabled     = (mode === "quiz");

    print("Mode switched to: " + mode);
    global.ModeController.onModeChanged(mode);
}

function bindButton(buttonScript, mode) {
    if (!buttonScript) {
        print("ModeController: missing button for " + mode);
        return;
    }

    if (buttonScript.onStateChanged && typeof buttonScript.onStateChanged.add === "function") {
        buttonScript.onStateChanged.add(function(state) {
            if (state === "triggered") {
                print("BUTTON PRESSED: " + mode);
                switchMode(mode);
            }
        });
        print("ModeController: bound " + mode);
    }
}

var onModeChanged         = function(mode)     { print("STUB: mode changed to " + mode); };
var onCompressionDetected = function()         { print("STUB: compression detected"); };
var onUIReady             = function()         { print("STUB: UI ready"); };
var onAudioTrigger        = function(clipName) { print("STUB: audio trigger - " + clipName); };

global.ModeController = {
    switchMode:            switchMode,
    getCurrentMode:        function() { return currentMode; },
    onModeChanged:         onModeChanged,
    onCompressionDetected: onCompressionDetected,
    onUIReady:             onUIReady,
    onAudioTrigger:        onAudioTrigger
};

var startEvent = script.createEvent("OnStartEvent");
startEvent.bind(function() {
    if (bound) return; // CRITICAL: only bind once
    bound = true;

    bindButton(script.learnButton,    "learn");
    bindButton(script.practiceButton, "practice");
    bindButton(script.quizButton,     "quiz");
    switchMode("learn");
});