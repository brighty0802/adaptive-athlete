# Application Flow — Adaptive Athlete

**Status:** MVP Design v0.1  
**Platform:** Mobile-first web app / PWA  
**Primary use case:** Logging and managing gym training alongside football

---

## 1. Purpose

The application should make it easy for an athlete to:

- know which gym session to complete next
- view the planned workout
- start and log a workout quickly
- compare actual performance against the prescribed target
- complete exercises in a flexible order
- save partial or complete workouts
- review previous training
- monitor long-term progression and adherence

The core experience should be simple enough to use between sets in the gym.

---

# 2. Primary User Flow

```text
Home / Today
      ↓
Select Recommended Workout
      ↓
Workout Detail
      ↓
Start Workout
      ↓
Active Workout
      ↓
Log Exercises and Sets
      ↓
Finish Workout
      ↓
Workout Complete
      ↓
Return to Home
      ↓
History / Progress

# 3. Main Navigation

The application should use a simple bottom navigation bar.

```text
[ Today ]   [ History ]   [ Progress ]   [ More ]
```

## Today

Primary training dashboard.

## History

Previous workouts and monthly training adherence.

## Progress

Strength and performance trends.

## More

Settings and future secondary functionality.

---

# 4. Screen 1 — Home / Today

## Purpose

Give the athlete an immediate answer to:

> What should I train today?

## Main Components

### Greeting / Header

Display:

- athlete name
- current date
- optional short training status

Example:

```text
Good morning, Lewis.

Ready to train?
```

### Recommended Workout Card

This should be the most prominent component on the screen.

Display:

- recommended session
- session type
- estimated duration
- number of exercises
- Start Workout button

Example:

```text
NEXT UP

Lower A
Strength + Power

5 exercises
~60 minutes

[ Start Workout ]
```

### Previous Session

Display the most recently completed workout.

Example:

```text
Last session

Upper B
Completed Monday
```

This helps the athlete understand why the next session has been recommended.

### Four Training Sessions

Display the four available gym sessions as cards.

```text
Lower A
Strength + Power

Upper A
Strength

Lower B
Robustness + Power

Upper B
Volume
```

Selecting a card opens the **Workout Detail** screen.

### Monthly Adherence Preview

Display a compact monthly training grid.

Each day is represented by a small square.

Example:

```text
September

□ □ ■ □ ■ □ □
■ □ □ ■ □ □ ■
□ ■ □ □ ■ □ □
...
```

Completed gym days should be visually differentiated by workout type.

The full version is available in History.

---

# 5. Screen 2 — Workout Detail

## Purpose

Allow the athlete to review a workout before beginning it.

## Header

Display:

- workout name
- workout category
- estimated duration
- number of exercises

Example:

```text
Lower A

Strength + Power
5 exercises
~60 minutes
```

## Exercise List

Display exercises in their default order.

Example:

```text
1. Countermovement Jump
   3 × 3

2. Back Squat
   3 × 4–6

3. Romanian Deadlift
   3 × 6–8

4. Weighted Lunges
   2 × 6–8 each leg

5. Standing Calf Raise
   2 × 8–12
```

The user should be able to inspect individual exercise details if required.

## Start Workout Button

Primary action:

```text
[ Start Workout ]
```

Selecting this opens the **Active Workout** screen and creates an active workout session.

---

# 6. Screen 3 — Active Workout

## Purpose

This is the main gym logging interface.

It must be fast and easy to use on a phone.

## Workout Header

Display:

- workout name
- exercise progress
- workout duration
- Finish Workout button

Example:

```text
Lower A

Exercise 2 of 5

[ Finish ]
```

## Exercise Card

Each exercise should show:

- exercise name
- planned sets
- rep range
- target RIR
- rest recommendation
- previous performance
- today's proposed load

Example:

```text
Back Squat

Target
3 × 4–6
RIR 1–2

Previous
75 kg × 6 / 6 / 5

Today
77.5 kg
```

## Set Logging

For each working set, the user should be able to enter:

- weight
- reps
- RIR

Example:

```text
SET 1

Weight: [ 77.5 ]
Reps:   [ 6 ]
RIR:    [ 2 ]

[ Complete Set ]
```

Completed sets should remain visible.

Example:

```text
Set 1   77.5 kg   6 reps   RIR 2   ✓
Set 2   77.5 kg   6 reps   RIR 2   ✓
Set 3   _______   ______   _____
```

## Quick Complete-As-Prescribed

If the athlete completes exactly what was recommended, provide a shortcut.

Example:

```text
[ Completed as Prescribed ]
```

This should automatically populate the planned values.

## Embedded Rest Timer

A dedicated rest screen is not required.

After completing a set, the Active Workout screen may show a small timer.

Example:

```text
Rest

01:47

Recommended: 3 minutes
```

The timer should not prevent the athlete from navigating around the workout.

## Flexible Exercise Order

Exercises should not be locked into a strict sequence.

The athlete must be able to:

- open another exercise
- complete exercises in a different order
- return to an unfinished exercise
- skip an exercise

This allows the workout to adapt to real gym conditions such as equipment availability.

## Exercise Status

Each exercise can have a status:

```text
Not Started
In Progress
Completed
Skipped
```

Example:

```text
✓ Back Squat

● Romanian Deadlift

○ Weighted Lunges

— Calf Raise
```

---

# 7. Screen 4 — Workout Complete

## Purpose

Confirm that the workout has been saved and provide immediate feedback.

## Summary

Display:

- workout completed
- number of exercises completed
- number of sets
- total training volume
- workout duration

Example:

```text
Workout Complete

Lower A

5 exercises
13 working sets
4,320 kg total volume
58 minutes
```

## Progression Feedback

The application should show whether any exercises have earned progression.

Example:

```text
Standing Shoulder Press

Target achieved:
8 / 8 / 8 @ RIR 2

Next session:
Increase from 25 kg → 27.5 kg
```

Or:

```text
Back Squat

Target not yet achieved.

Next session:
Remain at 80 kg.
```

The recommendation should be explainable.

## Actions

```text
[ Back to Today ]

[ View Workout Summary ]
```

---

# 8. Screen 5 — History

## Purpose

Allow the athlete to inspect previous training.

## Monthly Adherence Calendar

Display the full monthly calendar.

Each day should be represented by a box.

Example:

```text
September 2026

Mon Tue Wed Thu Fri Sat Sun

    1   2   3   4   5   6
7   8   9  10  11  12  13
14 15  16  17  18  19  20
21 22  23  24  25  26  27
28 29  30
```

Visual state should indicate:

- no gym session
- Lower A
- Upper A
- Lower B
- Upper B

A future version may also indicate football training and matches.

Selecting a completed day should display the workout performed.

## Previous Sessions

Display recent sessions below the calendar.

Example:

```text
Monday 8 September

Lower A
18:24

5 exercises completed
```

Selecting the session opens the detailed workout record.

---

# 9. Screen 6 — Progress

## Purpose

Show whether the athlete is improving over time.

The first version should remain relatively simple.

## Metric Selection

The athlete should eventually be able to view:

- strength
- estimated 1RM
- training volume
- adherence
- bodyweight

## Exercise Progress

Example:

```text
Back Squat

Estimated 1RM

June        88 kg
July        94 kg
August     101 kg
September  106 kg
```

Display this as a graph.

## Current Performance Summary

Example:

```text
Current Load
80 kg

Estimated 1RM
~112 kg

3-Month Change
+24%
```

---

# 10. Screen 7 — Exercise Details

## Purpose

Explain what the athlete is doing and how progression works.

## Display

Example:

```text
Standing Shoulder Press

Sets
3

Rep Range
5–8

Target RIR
1–2

Current Load
25 kg

Load Increment
2.5 kg

Rest
2–3 minutes

Progression Method
Double Progression
```

## Progression Rule

Example:

```text
Remain at the current load until all
three sets reach 8 repetitions with
at least 1 RIR.

Once achieved:

25 kg → 27.5 kg

Rebuild from the lower end of the
rep range.
```

## Exercise History

Example:

```text
8 Sep
25 kg
8 / 8 / 8

2 Sep
25 kg
8 / 8 / 7

27 Aug
25 kg
7 / 7 / 6
```

---

# 11. Screen 8 — Settings / More

## Purpose

Store secondary configuration without cluttering the main training workflow.

Potential settings include:

- athlete profile
- kilograms / pounds
- appearance
- account
- export data
- notifications
- future integrations

This screen is not a priority for the first functional MVP.

---

# 12. Core MVP Flow

The most important path through the application is:

```text
Today
  ↓
Workout Detail
  ↓
Start Workout
  ↓
Active Workout
  ↓
Log Sets
  ↓
Finish Workout
  ↓
Workout Complete
  ↓
Today
```

If this flow works well, the first version of the application is useful.

Everything else should support this core loop rather than distract from it.

---

# 13. Design Principles

## Mobile First

The primary device is a phone.

Buttons, inputs and cards should be easy to use with one hand between sets.

## Minimal Interaction

Logging training should require as few taps as possible.

Avoid unnecessary menus, pop-ups or forms.

## Clean Visual Design

Initial design direction:

- black / dark background
- white text
- restrained accent colour
- large readable numbers
- minimal visual clutter
- consistent cards and spacing

## Important Information First

The athlete should not have to search for:

- today's workout
- today's target load
- previous performance
- current set
- progression recommendation

These should be immediately visible when relevant.

## Flexible Rather Than Rigid

Real workouts do not always follow the planned order.

The interface should support:

- reordered exercises
- skipped exercises
- partial workouts
- modified sets

without treating these as application errors.

---

# 14. Future UI Capabilities

Potential future additions include:

- football schedule view
- match-day indicators
- readiness / recovery input
- Garmin integration
- automatic session adaptation
- training-load dashboards
- sprint and jump tracking
- notifications
- coach view
- multi-athlete accounts

These should not interfere with delivering the first working MVP.