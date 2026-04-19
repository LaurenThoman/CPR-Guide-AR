// QuizAnswerButton.js — Put on each answer control (A1, A2, A3, A4).
// Set answerIndex: 0 = A1, 1 = A2, 2 = A3, 3 = A4.
//
// Finds the interactable on this SceneObject, its parent, or its children
// (covers UIKit / pinch button layouts where onStateChanged lives on a child).
// Falls back to a plain TapEvent if no onStateChanged is found.
//
// @input int answerIndex = 0 {"widget":"slider","min":0,"max":3}

function getAnswerIndex() {
    var idx = Math.round(Number(script.answerIndex));
    if (isNaN(idx) || idx < 0 || idx > 3) {
        return 0;
    }
    return idx;
}

function submit(idx) {
    if (global.QuizMode && global.QuizMode.submitAnswer) {
        global.QuizMode.submitAnswer(idx);
    }
}

function findScriptsWithCallback(obj, out) {
    if (!obj) {
        return;
    }
    var comps = obj.getComponents("Component.ScriptComponent");
    for (var i = 0; i < comps.length; i++) {
        var c = comps[i];
        if (c === script) {
            continue;
        }
        if (c.onStateChanged && typeof c.onStateChanged.add === "function") {
            out.push(c);
        }
    }
}

function collectInteractables() {
    var found = [];
    var self = script.getSceneObject();

    findScriptsWithCallback(self, found);

    var parent = self.getParent();
    if (parent) {
        findScriptsWithCallback(parent, found);
    }

    for (var i = 0; i < self.getChildrenCount(); i++) {
        findScriptsWithCallback(self.getChild(i), found);
    }

    return found;
}

function bindOnce() {
    var idx = getAnswerIndex();
    var interactables = collectInteractables();

    if (interactables.length === 0) {
        var tap = script.createEvent("TapEvent");
        tap.bind(function() {
            submit(idx);
        });
        print("QuizAnswerButton[A" + (idx + 1) + "]: no onStateChanged found — using TapEvent fallback on " + script.getSceneObject().name);
        return;
    }

    for (var i = 0; i < interactables.length; i++) {
        var comp = interactables[i];
        comp.onStateChanged.add(
            (function(capturedIdx) {
                var wasPressed = false;
                return function(st) {
                    var isPressed = (st === "triggered" || st === "pinched" || st === 2);
                    if (isPressed && !wasPressed) {
                        submit(capturedIdx);
                    }
                    wasPressed = isPressed;
                };
            })(idx)
        );
    }

    print("QuizAnswerButton[A" + (idx + 1) + "]: bound " + interactables.length + " interactable(s) on " + script.getSceneObject().name);
}

var onStart = script.createEvent("OnStartEvent");
onStart.bind(function() {
    bindOnce();
});
