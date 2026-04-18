// LazyFollow.js — gently keeps a UI element in view without being head-locked
// @input SceneObject camera
// @input vec3 offset = {0.2, -0.15, -0.6}  // right, down, forward (meters)
// @input float deadZoneAngle = 20.0        // degrees — how far you can look before it follows
// @input float smoothing = 0.06            // 0 = frozen, 1 = instant. Lower = lazier
// @input bool faceCamera = true

var cameraT;
var selfT;

var startEvent = script.createEvent("OnStartEvent");
startEvent.bind(function() {
    if (!script.camera) {
        print("LazyFollow: no camera assigned");
        return;
    }
    cameraT = script.camera.getTransform();
    selfT = script.getTransform();

    // Snap to target on start so it doesn't fly in from origin
    var startPos = computeTargetPos();
    selfT.setWorldPosition(startPos);
});

function computeTargetPos() {
    var camPos = cameraT.getWorldPosition();
    var camRot = cameraT.getWorldRotation();
    var worldOffset = camRot.multiplyVec3(script.offset);
    return camPos.add(worldOffset);
}

var updateEvent = script.createEvent("UpdateEvent");
updateEvent.bind(function() {
    if (!cameraT || !selfT) return;

    var camPos = cameraT.getWorldPosition();
    var currentPos = selfT.getWorldPosition();

    // Vector from camera to button, and camera's forward
    var toButton = currentPos.sub(camPos).normalize();
    var camForward = cameraT.forward.uniformScale(-1); // Lens Studio cameras face -Z

    // Angle between where you're looking and where the button is
    var dot = Math.max(-1, Math.min(1, toButton.dot(camForward)));
    var angle = Math.acos(dot) * (180 / Math.PI);

    // Only follow if button has drifted outside the dead zone
    if (angle > script.deadZoneAngle) {
        var targetPos = computeTargetPos();
        var newPos = vec3.lerp(currentPos, targetPos, script.smoothing);
        selfT.setWorldPosition(newPos);
    }

    // Always gently face the camera
    if (script.faceCamera) {
        var camRot = cameraT.getWorldRotation();
        var currentRot = selfT.getWorldRotation();
        var newRot = quat.slerp(currentRot, camRot, script.smoothing * 2);
        selfT.setWorldRotation(newRot);
    }
});