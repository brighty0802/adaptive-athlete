# Product Requirements

## 1. Product Vision
The Athlete Performance Engine is a training platform designed to help a football player complete structured gym training alongside a variable football schedule.

The app should make it easy to:

- know which gym session to complete next
- view the proposed workout for the day
- log completed exercises quickly
- compare actual performance to the recommendation
- track consistency and long-term progression
- eventually adapt the training plan based on completed work and football load


## Primary User
The initial user is a football player completing a 4-day gym split alongside football training and matches.

The user needs a fast, mobile-friendly workflow that can be used during real gym sessions.


## Core User Journey
1. Athlete opens the app.
2. Athlete sees the four gym sessions.
3. Athlete sees which session was last completed.
4. Athlete is shown the recommended session for today.
5. Athlete clicks into a workout tab.
6. Athlete sees the proposed 1-hour workout.
7. Athlete presses **Start Workout**.
8. Athlete sees each exercise with:
   - the last weight completed
   - the proposed weight for today
   - a place to enter actual performance
9. Athlete logs what was actually completed.
10. Athlete can mark an exercise as completed exactly as prescribed.
11. Exercises can be completed in any order.
12. It is acceptable for some exercises to be skipped or not completed.
13. The app stores the completed session.
14. The athlete can later review consistency and performance history.
## Functional Requirements


### REQ-01 — View Four Gym Sessions
**Priority:** Must

The athlete must be able to see the four different gym sessions in the app, and be able to switch between them. 


### REQ-02 — View Workout Details
**Priority:** Must

When a workout session is selected, the athlete must be able to view the proposed workout for that day.

The workout view should include:
- session name
- exercise list
- expected duration
- a **Start Workout** button

---

### REQ-03 — Start Workout Mode
**Priority:** Must

When the athlete presses **Start Workout**, the app must display the live workout logging view.

---

### REQ-04 — Show Previous and Proposed Exercise Loads
**Priority:** Must

For each exercise, the athlete must be able to see:
- the previous load completed
- the proposed load for today

---

### REQ-05 — Log Actual Exercise Performance
**Priority:** Must

The athlete must be able to record what was actually completed for each exercise.

This should allow input of:
- weight
- reps
- sets
- notes (optional)

---

### REQ-06 — Quick Complete-As-Prescribed Button
**Priority:** Should

The athlete should be able to press a button that marks the exercise as completed exactly as recommended.

This is intended to make workout logging faster.

---

### REQ-07 — Flexible Exercise Order
**Priority:** Must

The app must allow exercises to be completed in a different order from the original plan.

This is important in real gym use when equipment or machines are occupied.

---

### REQ-08 — Partial Workout Completion
**Priority:** Must

The app must allow a workout session to be saved even if not all exercises are completed.

---

### REQ-9 — Save Session History
**Priority:** Must

Completed workouts must be stored so the athlete can review them later.

---

### REQ-10 — Monthly Training Adherence Graphic
**Priority:** Must

The app should provide a monthly visual graphic showing each day of the month as a box.

Each box should indicate whether the athlete trained that day.

Boxes should be colour-coded based on the workout completed.

Example:
- no fill = no gym session completed
- one colour = upper session
- another colour = lower session
- another colour = power session
- another colour = accessory/recovery session

This graphic should help the athlete quickly review training consistency.

---

### REQ-11 — Clean Minimal Interface
**Priority:** Must

The app should use a clean black-and-white aesthetic.

The interface should feel simple, uncluttered, and easy to use during a workout.


## Non-Functional Requirements

### NFR-01 — Mobile Usability
The app must be practical to use on a mobile phone during training. Important to note here that Mobile-first web app / PWA is documented as the initial delivery approach. So we are not building an app for iphone or android. 

### NFR-02 — Fast Interaction
Logging a set or exercise should require minimal clicks.

### NFR-03 — Data Persistence
Completed workouts must remain saved after the app is closed.

### NFR-04 — Flexibility
The app should support non-linear workout execution, including exercise reordering and incomplete sessions.

### NFR-05 — Maintainability
The system should be built so training logic, UI, and analytics can be developed separately.

## MVP Definition

## MVP Scope

The first usable version of Adaptive Athlete must support:

- Today screen
- Recommended next workout
- Manual workout selection
- Workout Detail screen
- Active Workout screen
- Logging weight, repetitions and RIR
- Previous exercise performance
- Recommended exercise load
- Quick "completed as prescribed" input
- Flexible exercise order
- Skipped exercises
- Partial workout completion
- Persistent workout history
- Deterministic double-progression rules
- Monthly training adherence calendar


### MVP Session Recommendation Rule

The initial application will recommend sessions using a fixed four-session rotation:

Session A → Session B → Session C → Session D → repeat.

A completed workout advances the rotation.

A workout intentionally finished as `partial` also advances the rotation.

An unfinished `in_progress` workout does not advance the rotation.

The athlete may manually select a different workout at any time. This is important as gives user freedom to choose. 

Football-aware scheduling will replace or modify this simple rotation in a later version.

## Out of Scope for Initial MVP

The following are intentionally deferred:

- Automatic football-load adaptation
- Recovery/readiness modelling
- Garmin or wearable integration
- Advanced performance dashboards
- Power BI integration
- AI-generated coaching
- Machine learning
- Multi-athlete accounts
- Coach accounts
- Automatic 146-day phase transitions
- PWA installation features
