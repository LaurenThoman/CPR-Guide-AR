// CompressionDetector.js
// Detects CPR compressions via wrist Y-position tracking

// @input float sensitivity = 1.5
// @input float debounceMs = 300

var handTracking = global.scene.createSceneObject("_handTrack");
var hand = handTracking.createComponent("Component.HandTracking");
hand.hand = HandTracking.Hand.Right;

// State
var baselineY = null;
var lastY = null;
var isDown = false;
var lastCompressionTime = 0;
var calibrating = true;
var calibrationSamples = [];
var CALIBRATION_FRAMES = 30;

// How far down counts as a compression (in world units)
var PRESS_THRESHOLD = script.sensitivity * 0.015;

function calibrate(currentY) {
    calibrationSamples.push(currentY);
    if (calibrationSamples.length >= CALIBRATION_FRAMES) {
        // Average the first 30 frames as the resting baseline
        var sum = calibrationSamples.reduce(function(a, b) { return a + b; }, 0);
        baselineY = sum / calibrationSamples.length;
        calibrating = false;
        print("Baseline Y set: " + baselineY.toFixed(4));

        if (global.CompressionDetector.onCalibrated) {
            global.CompressionDetector.onCalibrated();
        }
    }
}

function checkCompression(currentY) {
    var delta = baselineY - currentY; // positive = hand moved DOWN

    if (!isDown && delta > PRESS_THRESHOLD) {
        // Hand crossed the threshold going DOWN
        isDown = true;
    }

    if (isDown && delta < PRESS_THRESHOLD * 0.3) {
        // Hand came back UP — compression complete
        var now = Date.now();
        var timeSinceLast = now - lastCompressionTime;

        if (timeSinceLast > script.debounceMs) {
            lastCompressionTime = now;
            isDown = false;

            // Fire to PracticeMode
            if (global.PracticeMode && global.PracticeMode.registerCompression) {
                global.PracticeMode.registerCompression();
            }
            print("Compression detected! delta: " + delta.toFixed(4));
        } else {
            isDown = false; // debounced, don't count
        }
    }

    lastY = currentY;
}

// Update every frame
var update = script.createEvent("UpdateEvent");
update.bind(function() {
    if (!hand.isTracked()) return;

    var wristPos = hand.getWristPosition();
    if (!wristPos) return;

    var currentY = wristPos.y;

    if (calibrating) {
        calibrate(currentY);
    } else {
        checkCompression(currentY);
    }
});

// Expose for debugging / manual reset
global.CompressionDetector = {
    recalibrate: function() {
        calibrating = true;
        calibrationSamples = [];
        baselineY = null;
        print("Recalibrating...");
    },
    getBaseline: function() { return baselineY; },
    onCalibrated: null // Person 3 can hook this to show "ready" UI
};