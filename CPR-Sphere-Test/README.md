# CPR Sphere Test

A minimal Lens Studio project for testing CPR compression detection — BPM, depth, and hand centering — using a sphere as the dummy chest.

**Requires:** Lens Studio 5.15.4 · Snap Spectacles

---

## Scripts included

| File | Purpose |
|---|---|
| `CPRSignalBus.ts` | Shared state — BPM, depth, hand centering, compression events |
| `CPRBodyEnvironment.ts` | Tracks chest anchor position (demo mode: fixed sphere) |
| `CPRHandDetection.ts` | Reads hand tracking, detects compressions, fires events |
| `CPRSphereTest.ts` | Animates the sphere + updates HUD text on each compression |
| `CPRDebugHUD.ts` | Optional debug overlay (BPM, depth, count, chest position) |

---

## Setup (one-time, ~5 minutes)

### 1. Open the project

Open `CPRSphereTest.esproj` in Lens Studio 5.15.4.  
Lens Studio will generate the scene and Cache folder automatically on first open.

### 2. Create the Sphere

- **Hierarchy → Add Object → Sphere**
- Rename it `ChestSphere`
- **Position:** `(0, 0, 0)` or wherever feels natural
- **Scale:** `(10, 10, 10)` (cm — roughly chest-sized)

### 3. Add a material to the sphere

- **Asset Browser → + → Material** → choose **PBR** shader
- Drag the material onto `ChestSphere` in the Inspector under **Mesh Visual → Materials [0]**
- Leave Base Color white (the script will change it dynamically)

### 4. Create an empty manager object

- **Hierarchy → Add Object → Empty Object**, name it `CPRManager`

### 5. Add CPRBodyEnvironment

- Select `CPRManager` → Inspector → **Add Component → Script**
- Drag `CPRBodyEnvironment.ts` into the script slot
- Set **Demo Chest Anchor** → `ChestSphere`
- Leave `trackingObject` empty

### 6. Add CPRHandDetection

- Select `CPRManager` → Inspector → **Add Component → Script**
- Drag `CPRHandDetection.ts` into the script slot
- Set **Body Environment** → the `CPRBodyEnvironment` component on `CPRManager`
- Enable **Logging** while testing

### 7. Add CPRSphereTest

- Select `CPRManager` → Inspector → **Add Component → Script**
- Drag `CPRSphereTest.ts` into the script slot
- Set **Sphere Object** → `ChestSphere`
- Set **Feedback Text** → (see step 8, or leave empty to skip)
- Enable **Logging** while testing

### 8. Add HUD text (optional but recommended)

- **Hierarchy → Add Object → Screen Text** (or World Text), name it `CPRHud`
- Position it somewhere visible (top of screen or above sphere)
- Back on `CPRManager`, set **CPRSphereTest → Feedback Text** → `CPRHud`

### 9. (Optional) Add CPRDebugHUD

- Select `CPRManager` → **Add Component → Script** → drag `CPRDebugHUD.ts`
- Set **Debug Text** → a second Screen Text object
- Set **Body Environment** → the `CPRBodyEnvironment` component

---

## What to expect when running

| Action | Result |
|---|---|
| Hand over sphere, push down | Sphere squishes (Y shrinks, XZ expands) and springs back |
| Good depth (5–6.5 cm) | Sphere turns **green** |
| Too shallow (< 5 cm) | Sphere turns **yellow** |
| Too deep (> 6.5 cm) | Sphere turns **red** |
| HUD text | BPM · depth label · compression count · hand centering status |

**AHA 2020 targets:** 100–120 BPM, 5–6 cm depth.

---

## Troubleshooting

**Sphere doesn't react to compressions**
- Check Logger panel — enable `enableLogging` on `CPRHandDetection`
- Make sure `CPRBodyEnvironment.demoChestAnchor` is set to `ChestSphere`
- Make sure `CPRHandDetection.bodyEnvironment` is set

**Color doesn't change**
- Sphere needs a material with a `baseColor` property (PBR or Flat shader)
- `materialSlot` on `CPRSphereTest` must match the slot index (default: 0)

**BPM reads 0**
- Needs at least 2 compressions to calculate. Do a few before reading.

**Hand not detected**
- SIK (SpectaclesInteractionKit) must be active — it's included in the Packages folder
- Run on device or use the Spectacles simulator in Lens Studio

---

## Signal contract (CPRSignalBus)

```ts
CPRSignalBus.currentBPM          // number — live rolling average
CPRSignalBus.compressionDepth    // "tooShallow" | "good" | "tooDeep"
CPRSignalBus.handsCentered       // boolean
CPRSignalBus.currentMode         // "Learn" | "Practice" | "Quiz"
CPRSignalBus.onCompressionEvent(cb)  // register callback
CPRSignalBus.fireCompressionEvent()  // fired automatically by CPRHandDetection
```

Any new UI script can import `CPRSignalBus` and subscribe to events without touching the detection layer.
