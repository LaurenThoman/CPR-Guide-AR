// PracticeMode.js
var TARGET_COMPRESSIONS = 30;
var TARGET_RATE_MIN = 100; // per minute
var TARGET_RATE_MAX = 120;

var count = 0;
var timestamps = [];
var isActive = false;

function start() {
    count = 0;
    timestamps = [];
    isActive = true;
    print("Practice started");

    if (global.PracticeMode.onCountUpdated) {
        global.PracticeMode.onCountUpdated(count, TARGET_COMPRESSIONS);
    }
}

function stop() {
    isActive = false;
    print("Practice stopped");
}

// Person 2 calls this when they detect a compression
function registerCompression() {
    if (!isActive) return;

    count++;
    timestamps.push(Date.now());

    // Calculate rate from last 5 compressions
    var rate = 0;
    if (timestamps.length >= 2) {
        var recent = timestamps.slice(-5);
        var elapsed = (recent[recent.length - 1] - recent[0]) / 1000;
        rate = Math.round(((recent.length - 1) / elapsed) * 60);
    }

    // Feedback signal for Person 3's UI
    var feedback = "good";
    if (rate > 0 && rate < TARGET_RATE_MIN) feedback = "too slow";
    if (rate > TARGET_RATE_MAX) feedback = "too fast";

    if (global.PracticeMode.onCountUpdated) {
        global.PracticeMode.onCountUpdated(count, TARGET_COMPRESSIONS);
    }
    if (global.PracticeMode.onFeedback) {
        global.PracticeMode.onFeedback(feedback, rate);
    }

    print("Compression " + count + " | Rate: " + rate + " bpm | " + feedback);

    // Round complete
    if (count >= TARGET_COMPRESSIONS) {
        if (global.PracticeMode.onRoundComplete) {
            global.PracticeMode.onRoundComplete();
        }
        print("Round complete!");
    }
}

global.PracticeMode = {
    start: start,
    stop: stop,
    registerCompression: registerCompression, // ← Person 2 calls this

    // Person 3 overwrites these
    onCountUpdated: null,
    onFeedback: null,
    onRoundComplete: null
};

// Also hook into ModeController's stub
global.ModeController.onCompressionDetected = registerCompression;

var onEnabled = script.createEvent("OnEnableEvent");
onEnabled.bind(function() { start(); });

var onDisabled = script.createEvent("OnDisableEvent");
onDisabled.bind(function() { stop(); });