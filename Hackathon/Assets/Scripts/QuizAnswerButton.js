// QuizAnswerButton.js — Put on each answer control (Pinch / Script with onStateChanged).
// Set answerIndex: 0 = A1, 1 = A2, 2 = A3, 3 = A4.
// @input int answerIndex = 0 {"widget":"slider","min":0,"max":3}

function bindOnce() {
    var obj = script.getSceneObject();
    var comps = obj.getComponents("Component.ScriptComponent");
    for (var i = 0; i < comps.length; i++) {
        var comp = comps[i];
        if (comp === script) {
            continue;
        }
        var cb = comp.onStateChanged;
        if (cb && typeof cb.add === "function") {
            var idx = Math.round(Number(script.answerIndex));
            if (idx < 0 || idx > 3 || isNaN(idx)) {
                idx = 0;
            }
            cb.add(
                (function(capturedIdx) {
                    var wasPressed = false;
                    return function(st) {
                        var isPressed = (st === "triggered" || st === "pinched" || st === 2);
                        if (isPressed && !wasPressed && global.QuizMode && global.QuizMode.submitAnswer) {
                            global.QuizMode.submitAnswer(capturedIdx);
                        }
                        wasPressed = isPressed;
                    };
                })(idx)
            );
            return;
        }
    }
    print("QuizAnswerButton: no onStateChanged on " + obj.name);
}

var onStart = script.createEvent("OnStartEvent");
onStart.bind(function() {
    bindOnce();
});
