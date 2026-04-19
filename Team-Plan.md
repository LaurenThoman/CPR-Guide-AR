CPR Spectacles App — Team Build Plan
Event: RealityShift USC hackathon Platform: Snap Spectacles (Lens Studio) Team: 4 people

Fill in names next to each role before sending.


What we're building
An AR CPR training app that uses Spectacles' hands-free advantage to teach, coach, and assess CPR — in any real environment, not just a classroom.

Why it matters: Bystander CPR roughly doubles survival rates for out-of-hospital cardiac arrest, but most people freeze because they can't remember what to do. We're closing the gap between "I took a class in 2019" and "someone is dying in front of me right now."

Why it earns the glasses: Hands-free overlays, live feedback on actual hand motion, full-scenario practice in real environments — none of this works on a phone or in a video.


Three modes
Learn — guided walkthrough, full overlays, one skill at a time
Practice — scenario mode, overlays fade out, you run the whole sequence in a real space
Quiz (stretch goal) — timed assessment with performance scoring


The signal contract (do this together, first)
Before anyone writes code, the whole team agrees on the signals that the detection system publishes. Everyone else subscribes to these. This is what lets us build in parallel without stepping on each other.

Signal
Type
Description
currentBPM
number
Live compression rate
compressionDepth
enum
tooShallow / good / tooDeep
handsCentered
bool
Are hands in the correct position
currentMode
enum
Learn / Practice / Quiz
compressionEvent
event
Fires on each detected compression


Rule: no silent changes to this contract. If we need to add or change a signal mid-build, we talk about it first.


Roles
Person 1 — Scene Lead & Integrator [Lauren]
You own the Lens Studio project file, scene hierarchy, and mode switching between Learn/Practice/Quiz. After hour 1, you're the only person editing the main scene.

Deliverables:

Hour 1: Working skeleton — empty scene with mode switching and stubbed signals
Hour 4: Person 2's detection integrated
Hour 6: Person 3's UI prefab integrated
Hour 8: Person 4's audio and content wired up

Person 2 — Detection Engineer [Sai]
You own hand tracking and compression detection. Your output is the signal bus.

Deliverables:

Hour 1: Standalone test scene with hand tracking visible and debug readout
Hour 3: Compressions detected, BPM calculated
Hour 5: Depth estimation and placement check working
Hour 6: Handed to Person 1 for integration

Known risk — de-risk in hour 1: Spectacles hand tracking can break when hands stack on top of each other (which they do in CPR). Test this specific scenario immediately. If tracking is unreliable with stacked hands, fall back to tracking the top hand only and inferring the rest.

Person 3 — Visuals & UI [Sriya]
You own everything the user sees: BPM meter, hand placement overlays, depth indicator, tutorial panels, feedback states.

Deliverables:

Hour 2: BPM meter component working with hardcoded test values
Hour 4: Hand placement overlay and depth indicator
Hour 6: Tutorial panels for Learn mode
Hour 8: Polish pass

Build your components as a prefab/sub-scene so you don't conflict with Person 1's scene edits. Mock the signals with hardcoded values while developing — don't block on Person 2.
'
Person 4 — Audio, Content & Pitch [Preston]
You own the metronome, coach voice prompts, tutorial content, and the pitch deck.

Deliverables:

Hour 2: Metronome loop at 110 BPM working
Hour 4: Coach voice prompts recorded (phone + Audacity is fine for hackathon)
Hour 6: Learn mode script finalized, quiz scenarios written as JSON
Ongoing: Pitch deck


Timeline
Hour 0–1 — Sync. Whole team defines the signal contract together. Person 1 starts the skeleton. Everyone else starts their piece in isolation.

Hour 1–4 — Heads-down parallel build. Each person de-risks their biggest unknown first. Check in at hour 2.

Hour 4–6 — First integration. Goal: hands go over the mannequin, BPM number updates on the meter, metronome plays. That's the minimum viable demo.

Hour 6 – end — Polish and expand. Finish Learn mode, add Practice scenarios, add Quiz if time allows.


Cut list (if we run out of time)
Cut in this order, last-first:

Quiz mode
Additional Practice scenarios beyond one
Audio polish / additional coach lines

Do not cut: a rock-solid Learn flow with working BPM detection and visual feedback. That is the demo.


Logistics
Mannequin — lock this down day 1. We need something firm to compress on. Options, best to worst:

CPR mannequin from USC aquatics, ROTC, or Keck School of Medicine
Rented mannequin from a Red Cross training center
Firm couch cushion with a taped target (dev only — looks bad on video)

Content sources for the pitch. American Heart Association 2020 guidelines (check whether 2025 update has dropped). Makes the project look rigorous.

Legal framing for the pitch. This is a training and skill-refresh tool, NOT a medical device. Any just-in-time guidance mode prompts 911 first. Judges will ask about liability — have the answer ready.


Communication
Shared Slack or Discord channel for the team
Quick stand-up every 2 hours: what I finished, what I'm doing next, what I'm blocked on
No silent changes to the signal contract — ask in chat first

