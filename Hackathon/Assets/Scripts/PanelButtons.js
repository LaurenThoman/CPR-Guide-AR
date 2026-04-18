// PanelButtons.js
// @input SceneObject backButton
// @input SceneObject nextButton
// @input SceneObject repeatButton

function findScriptWithCallback(obj) {
    if (!obj) return null;
    var comps = obj.getComponents("Component.ScriptComponent");
    for (var i = 0; i < comps.length; i++) {
        if (comps[i].onStateChanged && typeof comps[i].onStateChanged.add === "function") {
            return comps[i];
        }
    }
    var parent = obj.getParent();
    if (parent) {
        var pcomps = parent.getComponents("Component.ScriptComponent");
        for (var j = 0; j < pcomps.length; j++) {
            if (pcomps[j].onStateChanged && typeof pcomps[j].onStateChanged.add === "function") {
                return pcomps[j];
            }
        }
    }
    return null;
}

function bindButton(obj, callback) {
    var btn = findScriptWithCallback(obj);
    if (!btn) {
        print("PanelButtons: no onStateChanged on " + (obj ? obj.name : "null"));
        return;
    }
    var wasPressed = false; // per-button state tracker
    btn.onStateChanged.add(function(state) {
        var isPressed = (state === "triggered" || state === "pinched" || state === 2);
        // Only fire on the transition from not-pressed to pressed
        if (isPressed && !wasPressed) {
            callback();
        }
        wasPressed = isPressed;
    });
    print("PanelButtons: bound " + obj.name);
}

var onStart = script.createEvent("OnStartEvent");
onStart.bind(function() {
    if (!global.LearnMode) { print("ERROR: LearnMode not ready"); return; }

    bindButton(script.backButton,   function() { global.LearnMode.back(); });
    bindButton(script.nextButton,   function() { global.LearnMode.next(); });
    bindButton(script.repeatButton, function() { global.LearnMode.repeat(); });

    print("PanelButtons wired on " + script.getSceneObject().name);
});