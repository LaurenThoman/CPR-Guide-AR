// CompressionDetector.js
// Detects CPR compressions via wrist Y-position tracking

// @input Component.HandTracking hand
// @input float sensitivity = 1.5
// @input float debounceMs = 300

// State
var baselineY = null;
var lastY = null;
var isDown = false;
var lastCompressionTime = 0;
var calibrating = true;
var calibrationSamples = [];
var CALIBRATION_FRAMES = 30;

var PRESS_THRESHOLD = script.sensitivity * 0.015;

function calibrate(currentY) {
    calibrationSamples.push(currentY);
    if (calibrationSamples.length >= CALIBRATION_FRAMES) {
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
    var delta = baselineY - currentY;

    if (!isDown && delta > PRESS_THRESHOLD) {
        isDown = true;
    }

    if (isDown && delta < PRESS_THRESHOLD * 0.3) {
        var now = Date.now();
        var timeSinceLast = now - lastCompressionTime;

        if (timeSinceLast > script.debounceMs) {
            lastCompressionTime = now;
            isDown = false;

            if (global.PracticeMode && global.PracticeMode.registerCompression) {
                global.PracticeMode.registerCompression();
            }
            print("Compression detected! delta: " + delta.toFixed(4));
        } else {
            isDown = false;
        }
    }

    lastY = currentY;
}

var update = script.createEvent("UpdateEvent");
update.bind(function() {
    if (!script.hand || !script.hand.isTracked()) return;

    var wristPos = script.hand.getJointPosition(0);
    if (!wristPos) return;

    var currentY = wristPos.y;

    if (calibrating) {
        calibrate(currentY);
    } else {
        checkCompression(currentY);
    }
});

global.CompressionDetector = {
    recalibrate: function() {
        calibrating = true;
        calibrationSamples = [];
        baselineY = null;
        print("Recalibrating...");
    },
    getBaseline: function() { return baselineY; },
    onCalibrated: null
};