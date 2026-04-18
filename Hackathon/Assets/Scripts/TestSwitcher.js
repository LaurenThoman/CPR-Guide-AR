// TestSwitcher.js — DELETE BEFORE SUBMIT
var onTap = script.createEvent("TapEvent");
onTap.bind(function() {
    if (global.ModeController) {
        global.ModeController.switchMode("practice");
    }
});