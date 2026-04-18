// LearnMode.js
// @input SceneObject panel1
// @input SceneObject panel2
// @input SceneObject panel3
// @input SceneObject panel4
// @input SceneObject panel5
// @input SceneObject panel6

var panels = [];
var currentStep = 0;

function goToStep(index) {
    if (panels.length === 0) {
        print("LearnMode: no panels bound");
        return;
    }
    currentStep = Math.max(0, Math.min(index, panels.length - 1));
    for (var i = 0; i < panels.length; i++) {
        if (panels[i]) panels[i].enabled = (i === currentStep);
    }
    print("LearnMode: showing step " + (currentStep + 1) + " of " + panels.length);
}

function hideAllPanels() {
    for (var i = 0; i < panels.length; i++) {
        if (panels[i]) panels[i].enabled = false;
    }
}

function exitToModeSelect(reason) {
    print("LearnMode: " + reason + " — returning to mode select");
    hideAllPanels();
    currentStep = 0;
    if (global.ModeController) global.ModeController.returnToModeSelect();
}

global.LearnMode = {
    next: function() {
        if (currentStep < panels.length - 1) {
            goToStep(currentStep + 1);
        } else {
            exitToModeSelect("complete");
        }
    },
    back: function() {
        if (currentStep > 0) {
            goToStep(currentStep - 1);
        } else {
            exitToModeSelect("back from step 1");
        }
    },
    repeat: function() {
        print("STUB: repeat audio for step " + (currentStep + 1));
    },
    getStep: function() { return currentStep; },
    getTotalSteps: function() { return panels.length; }
};

var onEnabled = script.createEvent("OnEnableEvent");
onEnabled.bind(function() {
    panels = [script.panel1, script.panel2, script.panel3, script.panel4, script.panel5, script.panel6];
    goToStep(0);
});

var onDisabled = script.createEvent("OnDisableEvent");
onDisabled.bind(function() {
    hideAllPanels();
    currentStep = 0;
    print("LearnMode: disabled — all panels closed");
});