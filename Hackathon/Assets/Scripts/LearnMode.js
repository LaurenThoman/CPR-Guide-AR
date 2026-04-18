// LearnMode.js
// @input SceneObject panel1
// @input SceneObject panel2
// @input SceneObject panel3
// @input SceneObject panel4
// @input SceneObject panel5
// @input SceneObject panel6
// @input Component.AudioComponent learnAudio {"hint":"Audio component used for Learn step narration"}
// @input Asset.AudioTrackAsset step1Audio
// @input Asset.AudioTrackAsset step2Audio
// @input Asset.AudioTrackAsset step3Audio
// @input Asset.AudioTrackAsset step4Audio
// @input Asset.AudioTrackAsset step5Audio
// @input Asset.AudioTrackAsset step6Audio

var panels = [];
var stepAudios = [];
var currentStep = 0;

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

function playStepAudio(stepIdx) {
    if (!script.learnAudio) {
        return;
    }

    var track = stepAudios[stepIdx];
    if (!track) {
        return;
    }

    safeAudioStop(script.learnAudio);
    script.learnAudio.audioTrack = track;
    script.learnAudio.volume = 1;

    // Delay slightly to avoid edge cases when enabling Learn hierarchy
    var delayed = script.createEvent("DelayedCallbackEvent");
    delayed.bind(function() {
        if (!script.learnAudio) {
            return;
        }
        try {
            script.learnAudio.play(1);
        } catch (e) {
            // no-op
        }
    });
    delayed.reset(0.01);
}

function goToStep(index) {
    currentStep = Math.max(0, Math.min(index, panels.length - 1));
    for (var i = 0; i < panels.length; i++) {
        if (panels[i]) panels[i].enabled = (i === currentStep);
    }
    print("LearnMode: showing step " + (currentStep + 1));
    playStepAudio(currentStep);
}

function hideAllPanels() {
    for (var i = 0; i < panels.length; i++) {
        if (panels[i]) panels[i].enabled = false;
    }
}

global.LearnMode = {
    next: function() {
        if (currentStep < panels.length - 1) {
            goToStep(currentStep + 1);
        } else {
            print("LearnMode: complete — returning to mode select");
            hideAllPanels();
            currentStep = 0;
            if (global.ModeController) global.ModeController.returnToModeSelect();
        }
    },
    back: function() {
        if (currentStep > 0) {
            goToStep(currentStep - 1);
        } else {
            print("LearnMode: back from step 1 — returning to mode select");
            hideAllPanels();
            if (global.ModeController) global.ModeController.returnToModeSelect();
        }
    },
    repeat: function() {
        playStepAudio(currentStep);
    },
    getStep: function() { return currentStep; }
};

var onEnabled = script.createEvent("OnEnableEvent");
onEnabled.bind(function() {
    panels = [script.panel1, script.panel2, script.panel3, script.panel4, script.panel5, script.panel6];
    stepAudios = [script.step1Audio, script.step2Audio, script.step3Audio, script.step4Audio, script.step5Audio, script.step6Audio];
    goToStep(0);
});