// ModeController.js
// @input SceneObject learnMode
// @input SceneObject practiceMode
// @input SceneObject quizMode

var currentMode = "learn";

function switchMode(mode) {
    script.learnMode.enabled   = (mode === "learn");
    script.practiceMode.enabled = (mode === "practice");
    script.quizMode.enabled    = (mode === "quiz");
    currentMode = mode;
    print("Mode switched to: " + mode);
}

// Stubbed signals for teammates to hook into
var onCompressionDetected = function() {
    // Person 2 will trigger this
    print("STUB: compression detected");
};

var onUIReady = function() {
    // Person 3 will trigger this
    print("STUB: UI ready");
};

var onAudioTrigger = function(clipName) {
    // Person 4 will trigger this
    print("STUB: audio trigger - " + clipName);
};

// Expose globally so other scripts can call these
global.ModeController = {
    switchMode: switchMode,
    onCompressionDetected: onCompressionDetected,
    onUIReady: onUIReady,
    onAudioTrigger: onAudioTrigger
};

// Start in Learn mode
switchMode("learn");