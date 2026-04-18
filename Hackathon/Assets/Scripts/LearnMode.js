// LearnMode.js
var steps = [
    "Check the scene — is it safe?",
    "Call 911 or tell someone to call",
    "Tilt head back, lift chin",
    "Give 30 chest compressions",
    "Give 2 rescue breaths",
    "Repeat until help arrives"
];

var currentStep = 0;

function goToStep(index) {
    currentStep = Math.max(0, Math.min(index, steps.length - 1));
    
    // Person 3 binds to this to update their UI text
    if (global.LearnMode.onStepChanged) {
        global.LearnMode.onStepChanged(currentStep, steps[currentStep]);
    }
    print("Learn step " + currentStep + ": " + steps[currentStep]);
}

function next() {
    if (currentStep < steps.length - 1) {
        goToStep(currentStep + 1);
    } else {
        // Last step — signal that Learn is complete
        if (global.LearnMode.onLearnComplete) {
            global.LearnMode.onLearnComplete();
        }
        print("Learn complete — ready for Practice");
    }
}

function back() {
    goToStep(currentStep - 1);
}

function reset() {
    goToStep(0);
}

global.LearnMode = {
    next: next,
    back: back,
    reset: reset,
    getStep: function() { return currentStep; },
    getTotalSteps: function() { return steps.length; },
    
    // Person 3 overwrites these to connect their UI
    onStepChanged: null,
    onLearnComplete: null
};

// Initialize
var onEnabled = script.createEvent("OnEnableEvent");
onEnabled.bind(function() { reset(); });