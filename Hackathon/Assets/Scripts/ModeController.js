// ModeController.js
// @input SceneObject learnMode
// @input SceneObject practiceMode
// @input SceneObject quizMode
// @input SceneObject modeSwitcher
// @input SceneObject learnButton
// @input SceneObject practiceButton
// @input SceneObject quizButton
// @input SceneObject backButton
// @input SceneObject backButtonObject {"hint":"Optional wrapper to show/hide. Defaults to backButton."}

var currentMode = "";
var bound = false;

function getBackObj() {
    return script.backButtonObject || script.backButton;
}

function setBackVisible(visible) {
    var b = getBackObj();
    if (b) b.enabled = visible;
}

function bindButton(obj, mode) {
    if (!obj) { print("ModeController: missing button for " + mode); return; }
    var comps = obj.getComponents("Component.ScriptComponent");

    for (var i = 0; i < comps.length; i++) {
        var cb = comps[i].onStateChanged;
        if (cb && typeof cb.add === "function") {
            var wasPressed = false;
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

function bindBackButton(obj) {
    if (!obj) { print("ModeController: missing back button"); return; }
    var comps = obj.getComponents("Component.ScriptComponent");

    for (var i = 0; i < comps.length; i++) {
        var cb = comps[i].onStateChanged;
        if (cb && typeof cb.add === "function") {
            var wasPressed = false;
            cb.add(function(state) {
                var isPressed = (state === "triggered" || state === "pinched" || state === 2);
                if (isPressed && !wasPressed) {
                    print("BUTTON PRESSED: back");
                    returnToModeSelect();
                }
                wasPressed = isPressed;
            });
            print("ModeController: bound back");
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

    setBackVisible(true);

    print("Mode switched to: " + mode);
    global.ModeController.onModeChanged(mode);
}

function returnToModeSelect() {
    currentMode = "";
    script.modeSwitcher.enabled  = true;
    script.learnMode.enabled     = false;
    script.practiceMode.enabled  = false;
    script.quizMode.enabled      = false;

    setBackVisible(false);

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
    setBackVisible(false);

    bindButton(script.learnButton,    "learn");
    bindButton(script.practiceButton, "practice");
    bindButton(script.quizButton,     "quiz");
    bindBackButton(script.backButton);
});