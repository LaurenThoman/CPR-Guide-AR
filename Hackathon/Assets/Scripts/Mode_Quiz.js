// Mode_Quiz.js — Quiz flow: instructions → 15 questions → feedback (7s, auto) → … → results (7s, auto) → mode select.
// Attach to a SceneObject under your quizMode root (enabled when quiz starts).
//
// Answer buttons: A1 = index 0, A2 = 1, A3 = 2, A4 = 3.
// Correct sequence (15): A2, A3, A2, A3, A1, A4, A3, A4, A3, A2, A3, A4, A2, A1, A2
//
// @input SceneObject quizInstructions
// @input SceneObject questionPanel1
// @input SceneObject questionPanel2
// @input SceneObject questionPanel3
// @input SceneObject questionPanel4
// @input SceneObject questionPanel5
// @input SceneObject questionPanel6
// @input SceneObject questionPanel7
// @input SceneObject questionPanel8
// @input SceneObject questionPanel9
// @input SceneObject questionPanel10
// @input SceneObject questionPanel11
// @input SceneObject questionPanel12
// @input SceneObject questionPanel13
// @input SceneObject questionPanel14
// @input SceneObject questionPanel15
// @input SceneObject quizResultsPanel
// @input Component.Text resultsScoreText
//
// @input SceneObject instructionsNextButton
// Put QuizAnswerButton.js on each A1–A4 control (answerIndex 0–3), or call global.QuizMode.submitAnswer(n) from your UI.
//
// @input SceneObject feedbackPanel1
// @input SceneObject feedbackPanel2
// @input SceneObject feedbackPanel3
// @input SceneObject feedbackPanel4
// @input SceneObject feedbackPanel5
// @input SceneObject feedbackPanel6
// @input SceneObject feedbackPanel7
// @input SceneObject feedbackPanel8
// @input SceneObject feedbackPanel9
// @input SceneObject feedbackPanel10
// @input SceneObject feedbackPanel11
// @input SceneObject feedbackPanel12
// @input SceneObject feedbackPanel13
// @input SceneObject feedbackPanel14
// @input SceneObject feedbackPanel15

var TOTAL_QUESTIONS = 15;
var FEEDBACK_SECONDS = 7;

/**
 * Correct choice per question (button labels). Index in array is 0-based button: A1=0, A2=1, A3=2, A4=3.
 * Q1..Q15: A2, A3, A2, A3, A1, A4, A3, A4, A3, A2, A3, A4, A2, A1, A2
 */
var CORRECT_INDEX = [1, 2, 1, 2, 0, 3, 2, 3, 2, 1, 2, 3, 1, 0, 1];

var STATE_INSTRUCTIONS = "instructions";
var STATE_QUESTION = "question";
var STATE_FEEDBACK = "feedback";
var STATE_RESULTS = "results";

var state = STATE_INSTRUCTIONS;
var currentQuestionIndex = 0;
var score = 0;
var selectedIndex = -1;
var delayedTimerEvent = null;
var uiBound = false;
/** Prevents double-submit if two answer buttons fire the same frame */
var hasAnsweredCurrentQuestion = false;

function getQuestionPanels() {
    return [
        script.questionPanel1, script.questionPanel2, script.questionPanel3, script.questionPanel4, script.questionPanel5,
        script.questionPanel6, script.questionPanel7, script.questionPanel8, script.questionPanel9, script.questionPanel10,
        script.questionPanel11, script.questionPanel12, script.questionPanel13, script.questionPanel14, script.questionPanel15
    ];
}

function getFeedbackPanels() {
    return [
        script.feedbackPanel1, script.feedbackPanel2, script.feedbackPanel3, script.feedbackPanel4, script.feedbackPanel5,
        script.feedbackPanel6, script.feedbackPanel7, script.feedbackPanel8, script.feedbackPanel9, script.feedbackPanel10,
        script.feedbackPanel11, script.feedbackPanel12, script.feedbackPanel13, script.feedbackPanel14, script.feedbackPanel15
    ];
}

function cancelDelayedTimer() {
    if (delayedTimerEvent) {
        delayedTimerEvent.cancel();
        delayedTimerEvent = null;
    }
}

function setObjEnabled(obj, on) {
    if (obj) {
        obj.enabled = !!on;
    }
}

function hideAllQuestionPanels() {
    var list = getQuestionPanels();
    for (var i = 0; i < list.length; i++) {
        setObjEnabled(list[i], false);
    }
}

function hideAllFeedbackPanels() {
    var list = getFeedbackPanels();
    for (var i = 0; i < list.length; i++) {
        setObjEnabled(list[i], false);
    }
}

function updatePanels() {
    setObjEnabled(script.quizInstructions, state === STATE_INSTRUCTIONS);

    hideAllQuestionPanels();
    if (state === STATE_QUESTION) {
        var qlist = getQuestionPanels();
        if (currentQuestionIndex >= 0 && currentQuestionIndex < qlist.length) {
            setObjEnabled(qlist[currentQuestionIndex], true);
        }
    }

    hideAllFeedbackPanels();
    if (state === STATE_FEEDBACK) {
        var list = getFeedbackPanels();
        if (currentQuestionIndex >= 0 && currentQuestionIndex < list.length) {
            setObjEnabled(list[currentQuestionIndex], true);
        }
    }

    setObjEnabled(script.quizResultsPanel, state === STATE_RESULTS);
}

function updateResultsText() {
    if (script.resultsScoreText) {
        script.resultsScoreText.text = score + "/" + TOTAL_QUESTIONS + " — " + score + " out of " + TOTAL_QUESTIONS;
    }
}

function resetQuizToInstructions() {
    cancelDelayedTimer();
    state = STATE_INSTRUCTIONS;
    currentQuestionIndex = 0;
    score = 0;
    selectedIndex = -1;
    hasAnsweredCurrentQuestion = false;
    updatePanels();
    if (script.resultsScoreText) {
        script.resultsScoreText.text = "0/" + TOTAL_QUESTIONS + " — 0 out of " + TOTAL_QUESTIONS;
    }
}

function beginQuizFromInstructions() {
    if (state !== STATE_INSTRUCTIONS) {
        return;
    }
    cancelDelayedTimer();
    state = STATE_QUESTION;
    currentQuestionIndex = 0;
    score = 0;
    selectedIndex = -1;
    hasAnsweredCurrentQuestion = false;
    updatePanels();
    print("Quiz: started (Q1)");
}

function beginFeedbackForCurrentQuestion() {
    if (state !== STATE_QUESTION) {
        return;
    }
    if (selectedIndex < 0) {
        return;
    }

    cancelDelayedTimer();
    state = STATE_FEEDBACK;
    updatePanels();

    delayedTimerEvent = script.createEvent("DelayedCallbackEvent");
    delayedTimerEvent.bind(function() {
        delayedTimerEvent = null;
        onFeedbackTimerDone();
    });
    delayedTimerEvent.reset(FEEDBACK_SECONDS);
    print("Quiz: feedback Q" + (currentQuestionIndex + 1) + " (" + FEEDBACK_SECONDS + "s)");
}

function onPickAnswer(answerIndex) {
    if (state !== STATE_QUESTION) {
        return;
    }
    if (hasAnsweredCurrentQuestion) {
        return;
    }

    var idx = Math.round(Number(answerIndex));
    if (idx < 0 || idx > 3 || isNaN(idx)) {
        return;
    }

    hasAnsweredCurrentQuestion = true;
    selectedIndex = idx;
    if (idx === CORRECT_INDEX[currentQuestionIndex]) {
        score++;
    }
    print(
        "Quiz: Q" +
            (currentQuestionIndex + 1) +
            " picked A" +
            (idx + 1) +
            " (correct=A" +
            (CORRECT_INDEX[currentQuestionIndex] + 1) +
            ") score=" +
            score
    );

    beginFeedbackForCurrentQuestion();
}

function onFeedbackTimerDone() {
    hideAllFeedbackPanels();

    currentQuestionIndex++;
    if (currentQuestionIndex < TOTAL_QUESTIONS) {
        state = STATE_QUESTION;
        selectedIndex = -1;
        hasAnsweredCurrentQuestion = false;
        updatePanels();
        print("Quiz: next question Q" + (currentQuestionIndex + 1));
        return;
    }

    state = STATE_RESULTS;
    updateResultsText();
    updatePanels();
    print("Quiz: complete — " + score + " / " + TOTAL_QUESTIONS);

    cancelDelayedTimer();
    delayedTimerEvent = script.createEvent("DelayedCallbackEvent");
    delayedTimerEvent.bind(function() {
        delayedTimerEvent = null;
        finishResultsAndReturn();
    });
    delayedTimerEvent.reset(FEEDBACK_SECONDS);
    print("Quiz: results (" + FEEDBACK_SECONDS + "s) then mode select");
}

function finishResultsAndReturn() {
    if (state !== STATE_RESULTS) {
        return;
    }
    if (global.ModeController && global.ModeController.returnToModeSelect) {
        global.ModeController.returnToModeSelect();
    }
}

function bindPinchButton(obj, label, fn) {
    if (!obj) {
        print("Quiz: missing button object for " + label);
        return;
    }
    var comps = obj.getComponents("Component.ScriptComponent");
    for (var i = 0; i < comps.length; i++) {
        var cb = comps[i].onStateChanged;
        if (cb && typeof cb.add === "function") {
            cb.add(
                (function(capturedFn) {
                    var wasPressed = false;
                    return function(st) {
                        var isPressed = (st === "triggered" || st === "pinched" || st === 2);
                        if (isPressed && !wasPressed) {
                            capturedFn();
                        }
                        wasPressed = isPressed;
                    };
                })(fn)
            );
            print("Quiz: bound " + label);
            return;
        }
    }
    print("Quiz: no onStateChanged on " + obj.name + " (" + label + ")");
}

function bindUiOnce() {
    if (uiBound) {
        return;
    }
    uiBound = true;

    bindPinchButton(script.instructionsNextButton, "instructionsNext", beginQuizFromInstructions);
}

var onStart = script.createEvent("OnStartEvent");
onStart.bind(function() {
    bindUiOnce();
});

var onEnabled = script.createEvent("OnEnableEvent");
onEnabled.bind(function() {
    resetQuizToInstructions();
});

var onDisabled = script.createEvent("OnDisableEvent");
onDisabled.bind(function() {
    cancelDelayedTimer();
});

/** Legacy / teammate hooks */
global.QuizMode = {
    submitAnswer: function(selectedIndex) {
        onPickAnswer(selectedIndex);
    },
    next: function() {
        beginFeedbackForCurrentQuestion();
    },
    reset: function() {
        resetQuizToInstructions();
    },
    onQuestionLoaded: null,
    onAnswerResult: null,
    onQuizComplete: null
};
