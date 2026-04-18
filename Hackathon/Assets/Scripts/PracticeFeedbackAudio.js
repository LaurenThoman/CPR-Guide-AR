// PracticeFeedbackAudio.js
// During Practice only: if the player stays in a bad state for ~BAD_SECONDS, plays a one-shot cue.
// Put this script on the same SceneObject as PracticeMode.js (the practiceMode root), or any child of it,
// so OnEnable/OnDisable match Practice mode.
//
// @input Component.AudioComponent feedbackAudio {"hint":"Voice / cue clips — not the CPR beat track"}
// @input Asset.AudioTrackAsset clipBpmTooHigh
// @input Asset.AudioTrackAsset clipBpmTooLow
// @input Asset.AudioTrackAsset clipTooShallow
// @input Asset.AudioTrackAsset clipTooDeep
// @input Asset.AudioTrackAsset clipHandsNotCentered

var BAD_SECONDS = 5;
var BPM_TOO_HIGH = 130;
var BPM_TOO_LOW = 95;
var COOLDOWN_AFTER_CUE = 1.5;
/** Set true while wiring clips — cues fire after 0.5s so you do not wait 5s each time. */
var USE_QUICK_TEST = false;
/** Prints why a cue did or did not play (disable once everything works). */
var DEBUG_LOG = true;

var PLAY_DELAY_SEC = 0.05;

// --- Edit for local testing (later: call global.PracticeFeedbackAudio.setMetrics(...)) ---
// CompressionDepth: "tooShallow" | "good" | "tooDeep"
var compressionDepth = "good";
var currentBPM = 110;
var handsCentered = true;
// ---

var tHigh = 0;
var tLow = 0;
var tShallow = 0;
var tDeep = 0;
var tHands = 0;
var cooldown = 0;
var monitoring = false;

function effectiveBadSeconds() {
    return USE_QUICK_TEST ? 0.5 : BAD_SECONDS;
}

function resetTimers() {
    tHigh = 0;
    tLow = 0;
    tShallow = 0;
    tDeep = 0;
    tHands = 0;
}

/** Avoid InternalError when practice subtree disables: Audio may already be torn down. */
function safeAudioStop(ac) {
    if (!ac) {
        return;
    }
    if (!ac.isEnabledInHierarchy) {
        return;
    }
    try {
        ac.stop(false);
    } catch (e) {
        // no-op
    }
}

function depthKind() {
    var d = String(compressionDepth).toLowerCase().replace(/[\s_-]/g, "");
    if (d === "tooshallow") {
        return "shallow";
    }
    if (d === "toodeep") {
        return "deep";
    }
    if (d === "good") {
        return "good";
    }
    if (d.indexOf("shallow") >= 0) {
        return "shallow";
    }
    if (d.indexOf("deep") >= 0) {
        return "deep";
    }
    return "good";
}

function playCue(track, label) {
    if (!script.feedbackAudio) {
        if (DEBUG_LOG) {
            print("[PracticeFeedback] Missing feedbackAudio in Inspector.");
        }
        return false;
    }
    if (!track) {
        if (DEBUG_LOG) {
            print("[PracticeFeedback] No AudioTrack assigned for: " + label);
        }
        return false;
    }
    safeAudioStop(script.feedbackAudio);
    script.feedbackAudio.audioTrack = track;
    script.feedbackAudio.volume = 1;

    var delayed = script.createEvent("DelayedCallbackEvent");
    delayed.bind(function() {
        if (!script.feedbackAudio) {
            return;
        }
        try {
            script.feedbackAudio.play(1);
            if (DEBUG_LOG) {
                print("[PracticeFeedback] Playing cue: " + label);
            }
        } catch (e) {
            if (DEBUG_LOG) {
                print("[PracticeFeedback] play failed: " + e);
            }
        }
    });
    delayed.reset(PLAY_DELAY_SEC);
    return true;
}

function fireIfNeeded() {
    if (cooldown > 0) {
        return;
    }
    var need = effectiveBadSeconds();

    if (tHigh >= need) {
        if (playCue(script.clipBpmTooHigh, "bpmTooHigh")) {
            resetTimers();
            cooldown = COOLDOWN_AFTER_CUE;
        }
        return;
    }
    if (tLow >= need) {
        if (playCue(script.clipBpmTooLow, "bpmTooLow")) {
            resetTimers();
            cooldown = COOLDOWN_AFTER_CUE;
        }
        return;
    }
    if (tShallow >= need) {
        if (playCue(script.clipTooShallow, "tooShallow")) {
            resetTimers();
            cooldown = COOLDOWN_AFTER_CUE;
        }
        return;
    }
    if (tDeep >= need) {
        if (playCue(script.clipTooDeep, "tooDeep")) {
            resetTimers();
            cooldown = COOLDOWN_AFTER_CUE;
        }
        return;
    }
    if (tHands >= need) {
        if (playCue(script.clipHandsNotCentered, "handsNotCentered")) {
            resetTimers();
            cooldown = COOLDOWN_AFTER_CUE;
        }
    }
}

var onEnabled = script.createEvent("OnEnableEvent");
onEnabled.bind(function() {
    monitoring = true;
    resetTimers();
    cooldown = 0;
    if (DEBUG_LOG) {
        var ac = script.feedbackAudio;
        var acOk = ac ? ac.getSceneObject().name : "none";
        var hier = ac ? ac.isEnabledInHierarchy : false;
        print("[PracticeFeedback] Monitoring ON (" + script.getSceneObject().name + ") feedbackAudio on: " + acOk + " enabledInHierarchy: " + hier);
    }
});

var onDisabled = script.createEvent("OnDisableEvent");
onDisabled.bind(function() {
    monitoring = false;
    resetTimers();
    cooldown = 0;
    safeAudioStop(script.feedbackAudio);
    if (DEBUG_LOG) {
        print("[PracticeFeedback] Monitoring OFF");
    }
});

var updateEvent = script.createEvent("UpdateEvent");
updateEvent.bind(function() {
    if (!monitoring) {
        return;
    }

    var dt = getDeltaTime();
    cooldown = Math.max(0, cooldown - dt);

    var bpmOk = typeof currentBPM === "number" && !isNaN(currentBPM) && currentBPM > 0;
    if (bpmOk && currentBPM >= BPM_TOO_HIGH) {
        tHigh += dt;
    } else {
        tHigh = 0;
    }
    if (bpmOk && currentBPM <= BPM_TOO_LOW) {
        tLow += dt;
    } else {
        tLow = 0;
    }
    var dk = depthKind();
    if (dk === "shallow") {
        tShallow += dt;
    } else {
        tShallow = 0;
    }
    if (dk === "deep") {
        tDeep += dt;
    } else {
        tDeep = 0;
    }
    if (!handsCentered) {
        tHands += dt;
    } else {
        tHands = 0;
    }

    fireIfNeeded();
});

global.PracticeFeedbackAudio = {
    setMetrics: function(depth, bpm, centered) {
        compressionDepth = depth;
        currentBPM = bpm;
        handsCentered = !!centered;
    },
    /** Call from Logger to verify audio path: global.PracticeFeedbackAudio.debugPlayShallow() */
    debugPlayShallow: function() {
        playCue(script.clipTooShallow, "debug-tooShallow");
    }
};
