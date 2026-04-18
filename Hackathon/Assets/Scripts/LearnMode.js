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
    currentStep = Math.max(0, Math.min(index, panels.length - 1));
    for (var i = 0; i < panels.length; i++) {
        if (panels[i]) panels[i].enabled = (i === currentStep);
    }
    print("LearnMode: showing step " + (currentStep + 1));
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
        print("STUB: repeat audio for step " + (currentStep + 1));
    },
    getStep: function() { return currentStep; }
};

var onEnabled = script.createEvent("OnEnableEvent");
onEnabled.bind(function() {
    panels = [script.panel1, script.panel2, script.panel3, script.panel4, script.panel5, script.panel6];
    goToStep(0);
});