// CprBeatVisual.js — pulses a 3D object on each beat. No Canvas / Screen UI required.
//
// Two modes:
// - Leave "syncAudio" empty: uses frame time only (can drift vs real audio).
// - Assign the SAME Audio Component that plays your CPR track: pulse locks to playback time.
//
// @input SceneObject target {"hint":"SceneObject whose Transform will scale (e.g. your beat indicator mesh)"}
// @input float bpm = 110 {"hint":"Must match the song tempo (average BPM) for alignment"}
// @input Component.AudioComponent syncAudio {"hint":"Optional — same beat audio as Practice; uses playback clock"}
// @input float beatPhaseOffset = 0 {"hint":"Seconds — nudge until pulse matches what you hear (+/-)"}
// @input float pulseScale = 1.14 {"hint":"Scale multiplier right on each beat"}
// @input float decay = 16 {"hint":"Higher = shorter, snappier pulse"}

var tInBeat = 0;
var baseS = 1;

function modPositive(x, m) {
    return ((x % m) + m) % m;
}

var onEnable = script.createEvent("OnEnableEvent");
onEnable.bind(function() {
    tInBeat = 0;
    if (script.target) {
        var sc = script.target.getTransform().getLocalScale();
        baseS = (sc.x + sc.y + sc.z) / 3;
        if (baseS < 1e-4) {
            baseS = 1;
        }
    }
});

var updateEvent = script.createEvent("UpdateEvent");
updateEvent.bind(function() {
    if (!script.target) {
        return;
    }

    var period = 60 / script.bpm;
    if (period <= 0) {
        return;
    }

    if (script.syncAudio) {
        if (!script.syncAudio.isPlaying()) {
            script.target.getTransform().setLocalScale(new vec3(baseS, baseS, baseS));
            return;
        }
    }

    var t;
    if (script.syncAudio) {
        t = modPositive(script.syncAudio.position + script.beatPhaseOffset, period);
    } else {
        tInBeat += getDeltaTime();
        while (tInBeat >= period) {
            tInBeat -= period;
        }
        t = tInBeat;
    }

    var kick = Math.exp(-t * script.decay);
    var s = baseS * (1 + (script.pulseScale - 1) * kick);
    script.target.getTransform().setLocalScale(new vec3(s, s, s));
});
