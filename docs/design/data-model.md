# Data Model — Adaptive Athlete

**Status:** MVP Design v0.1  
**Purpose:** Define the minimum data required to support workout planning, workout logging, progression and training history.

---

# 1. Purpose

The data model defines the information the application needs to store and the relationships between that information.

The first version should support the core training loop:

```text
Plan Workout
    ↓
Recommend Exercise Targets
    ↓
Athlete Trains
    ↓
Record Actual Performance
    ↓
Compare Planned vs Actual
    ↓
Determine Next Recommendation
```

The model should remain simple enough for the MVP while allowing future additions such as:

- football workload
- readiness
- bodyweight
- performance testing
- adaptive session volume
- multiple athletes
- Garmin integration

---

# 2. Core Design Principle

The application must clearly separate:

```text
WHAT WAS PLANNED
```

from:

```text
WHAT ACTUALLY HAPPENED
```

For example:

```text
Planned

Back Squat
3 × 4–6
80 kg
Target RIR: 1–2
```

may result in:

```text
Actual

Set 1
80 kg × 6 @ RIR 2

Set 2
80 kg × 6 @ RIR 1

Set 3
80 kg × 5 @ RIR 1
```

The adaptive engine can then compare these two states.

This distinction is essential.

---

# 3. Core Entities

The MVP will initially use six main entities:

```text
Exercise

WorkoutTemplate

PlannedExercise

WorkoutSession

ExercisePerformance

SetPerformance
```

Their basic relationship is:

```text
WorkoutTemplate
      │
      ├── PlannedExercise
      │       │
      │       └── Exercise
      │
      ↓
WorkoutSession
      │
      └── ExercisePerformance
               │
               ├── Exercise
               │
               └── SetPerformance
```

---

# 4. Exercise

## Purpose

Represents a single exercise that can be included in one or more workouts.

Examples:

```text
Back Squat
Bench Press
Standing Shoulder Press
Pull-Up
Romanian Deadlift
```

## Proposed Fields

| Field | Type | Description |
|---|---|---|
| `id` | UUID / integer | Unique exercise identifier |
| `name` | string | Exercise name |
| `category` | string | Broad movement or training category |
| `equipment` | string | Equipment required |
| `is_active` | boolean | Whether exercise is currently used |
| `notes` | text | Optional technique/programming notes |

## Example

```text
id:
exercise_001

name:
Back Squat

category:
lower_compound

equipment:
barbell

is_active:
true
```

---

# 5. Exercise Categories

Exercise categories may later help determine progression and fatigue rules.

Possible categories include:

```text
lower_compound
upper_compound
unilateral
vertical_push
horizontal_push
vertical_pull
horizontal_pull
isolation
plyometric
hamstring
adductor
calf
```

Examples:

| Exercise | Category |
|---|---|
| Back Squat | lower_compound |
| Leg Press | lower_compound |
| Weighted Lunge | unilateral |
| Bench Press | horizontal_push |
| Standing Shoulder Press | vertical_push |
| Pull-Up | vertical_pull |
| Weighted Row | horizontal_pull |
| Lateral Raise | isolation |
| Nordic Hamstring | hamstring |
| Broad Jump | plyometric |

These categories do not need to control behaviour in the first version, but storing them gives the adaptive engine useful information later.

---

# 6. WorkoutTemplate

## Purpose

Represents one of the planned gym sessions.

The initial programme contains four templates:

```text
Session A
Session B
Session C
Session D
```

A template defines the intended structure of the session.

It does not represent a completed workout.

## Proposed Fields

| Field | Type | Description |
|---|---|---|
| `id` | UUID / integer | Unique workout template |
| `name` | string | Workout name |
| `description` | string | Short workout description |
| `focus` | string | Main training purpose |
| `estimated_duration_minutes` | integer | Expected duration |
| `is_active` | boolean | Whether template is currently used |

## Example

```text
id:
workout_session_a

name:
Session A

description:
Lower Strength + Power

focus:
strength_power

estimated_duration_minutes:
60

is_active:
true
```

---

# 7. PlannedExercise

## Purpose

Represents how a specific exercise should be performed within a workout template.

This is where the training prescription lives.

For example:

```text
Back Squat

Workout:
Session A

Sets:
3

Rep Range:
4–6

Target RIR:
1–2

Rest:
180 seconds

Load Increment:
2.5 kg

Progression:
Double progression
```

## Proposed Fields

| Field | Type | Description |
|---|---|---|
| `id` | UUID / integer | Unique planned exercise |
| `workout_template_id` | foreign key | Associated workout |
| `exercise_id` | foreign key | Associated exercise |
| `default_order` | integer | Normal exercise position |
| `planned_sets` | integer | Number of working sets |
| `rep_min` | integer | Bottom of target rep range |
| `rep_max` | integer | Top of target rep range |
| `target_rir_min` | integer | Minimum acceptable RIR |
| `target_rir_max` | integer | Maximum target RIR |
| `rest_seconds` | integer | Recommended rest |
| `load_increment_kg` | decimal | Normal load increase |
| `progression_type` | string | Progression method |
| `priority` | integer/string | Importance within workout |
| `notes` | text | Optional training instructions |

## Example

```text
id:
planned_session_a_squat

workout_template_id:
workout_session_a

exercise_id:
exercise_back_squat

default_order:
2

planned_sets:
3

rep_min:
4

rep_max:
6

target_rir_min:
1

target_rir_max:
2

rest_seconds:
180

load_increment_kg:
2.5

progression_type:
double_progression

priority:
high
```

---

# 8. Progression Types

The MVP should support a small number of progression methods.

## Double Progression

Used for most resistance exercises.

Example:

```text
3 × 6–8
```

The athlete keeps the same load until:

```text
8 / 8 / 8
```

is achieved with the required RIR.

The load then increases and the athlete rebuilds from the lower end of the range.

---

## Bodyweight-to-Weighted Progression

Used for:

```text
Pull-Ups
Chin-Ups
Dips
```

Example:

```text
Bodyweight Pull-Up

5–8 reps
```

Once:

```text
8 / 8 / 8
```

is achieved:

```text
Add 2.5 kg
```

and return toward the bottom of the range.

---

## Quality Progression

Used for:

```text
Jumps
Nordics
Copenhagen work
```

Progression may involve:

- improved control
- increased range of motion
- better jump output
- reduced assistance
- harder variation

These should not use standard load/repetition progression logic blindly.

---

# 9. WorkoutSession

## Purpose

Represents an actual gym session performed by the athlete.

Example:

```text
Session A
8 September 2026
Started 17:03
Finished 18:01
```

A new `WorkoutSession` is created when the athlete presses:

```text
Start Workout
```

## Proposed Fields

| Field | Type | Description |
|---|---|---|
| `id` | UUID / integer | Unique session |
| `workout_template_id` | foreign key | Workout performed |
| `session_date` | date | Calendar date |
| `started_at` | datetime | Start time |
| `completed_at` | datetime | Finish time |
| `status` | string | Session status |
| `session_mode` | string | Full / reduced / maintenance |
| `notes` | text | Optional session notes |

## Session Status Values

Possible values:

```text
planned
in_progress
completed
partial
cancelled
```

Example:

```text
status:
partial
```

could mean:

> Workout was intentionally finished after four of six exercises.

This must not be treated as an application error.

---

# 10. Session Mode

Lower-body sessions may eventually be adapted around football load.

Possible values:

```text
full
reduced
maintenance
```

## Full

Normal planned session.

## Reduced

Approximately 25–40% reduced volume.

## Maintenance

Minimal effective strength stimulus during congested football periods.

The MVP does not initially need to calculate these automatically, but the data model should allow them to exist.

---

# 11. ExercisePerformance

## Purpose

Represents the performance of one exercise within one specific workout session.

Example:

```text
Workout:
Session A

Exercise:
Back Squat

Recommended Load:
80 kg

Status:
Completed
```

This entity connects the planned exercise with what happened in reality.

## Proposed Fields

| Field | Type | Description |
|---|---|---|
| `id` | UUID / integer | Unique exercise performance |
| `workout_session_id` | foreign key | Associated workout |
| `exercise_id` | foreign key | Exercise performed |
| `planned_exercise_id` | foreign key | Original prescription |
| `recommended_load_kg` | decimal | Suggested load |
| `actual_order` | integer | Order exercise was completed |
| `status` | string | Completion state |
| `started_at` | datetime | Optional exercise start time |
| `completed_at` | datetime | Optional completion time |
| `notes` | text | Optional notes |

---

# 12. Exercise Completion Status

The application should distinguish between:

```text
not_started
in_progress
completed
skipped
```

This distinction is important.

For example:

```text
SKIPPED
```

may mean:

> The leg press was occupied and the athlete ran out of time.

That does **not** mean:

> The athlete failed the prescribed leg press target.

The adaptive engine must therefore avoid using skipped exercises as evidence of performance regression.

---

# 13. SetPerformance

## Purpose

Represents one completed working set.

This is the most granular training record in the MVP.

Example:

```text
Back Squat

Set 1
80 kg
6 reps
RIR 2
```

## Proposed Fields

| Field | Type | Description |
|---|---|---|
| `id` | UUID / integer | Unique set |
| `exercise_performance_id` | foreign key | Associated exercise |
| `set_number` | integer | Set order |
| `actual_weight_kg` | decimal | Weight used |
| `actual_reps` | integer | Repetitions completed |
| `actual_rir` | decimal/integer | Repetitions in reserve |
| `completed` | boolean | Whether set was completed |
| `completed_at` | datetime | Set completion time |

## Example

```text
exercise_performance_id:
performance_0045

set_number:
1

actual_weight_kg:
80

actual_reps:
6

actual_rir:
2

completed:
true
```

---

# 14. Example Full Workout Record

## Workout Template

```text
Session A
```

## Planned Exercise

```text
Back Squat

Sets:
3

Reps:
4–6

Target RIR:
1–2

Recommended Load:
80 kg
```

## Completed Performance

```text
Set 1
80 kg × 6
RIR 2

Set 2
80 kg × 6
RIR 1

Set 3
80 kg × 5
RIR 1
```

## Result

```text
Target maximum was not achieved.

Next recommendation:
Remain at 80 kg.
```

The system does not require complicated analysis to reach this conclusion.

---

# 15. Progression Calculation

The first adaptive engine should use deterministic rules.

For a standard double-progression exercise:

```text
IF
all prescribed sets were completed

AND
every set reached rep_max

AND
minimum RIR requirement was satisfied

THEN
increase recommended load

ELSE
maintain current load
```

Example:

```text
Shoulder Press

Target:
3 × 5–8

Current Load:
25 kg
```

Result:

```text
8 / 8 / 8
RIR:
2 / 2 / 1
```

Next recommendation:

```text
27.5 kg
```

---

# 16. Performance Improvement Without Load Increase

The system should not treat load increase as the only form of progress.

Example:

```text
Session 1

25 kg

6 / 6 / 6

RIR:
1 / 1 / 1
```

Session 2:

```text
25 kg

7 / 7 / 6

RIR:
2 / 1 / 1
```

Performance has improved even though the load has not changed.

Possible improvement signals include:

```text
more repetitions

same repetitions with higher RIR

better technique

greater control

higher-quality power output
```

The first version may primarily use repetitions and RIR.

---

# 17. Previous Performance

The Active Workout screen should display the athlete's previous performance for the selected exercise.

Example:

```text
Previous

Back Squat

75 kg

6 / 6 / 5
```

This can be retrieved from the most recent completed `ExercisePerformance` associated with the same exercise.

Conceptually:

```text
Current Exercise
      ↓
Find most recent completed ExercisePerformance
      ↓
Retrieve associated SetPerformance records
      ↓
Display previous performance
```

---

# 18. Recommended Load

The recommended load should eventually come from:

```text
previous performance
+
exercise progression rule
```

Example:

```text
Previous:
25 kg
8 / 8 / 8
Target achieved
```

Therefore:

```text
Recommended:
27.5 kg
```

Whereas:

```text
Previous:
25 kg
8 / 8 / 7
```

produces:

```text
Recommended:
25 kg
```

The recommended load should be stored for the current workout so that the user can compare:

```text
Recommended

vs

Actual
```

---

# 19. Exercise Order

The workout template has a:

```text
default_order
```

but each performed exercise has an:

```text
actual_order
```

Example:

## Planned

```text
1. Jump
2. Squat
3. RDL
4. Lunge
5. Calf Raise
```

## Actual

```text
1. Jump
2. Squat
3. Lunge
4. RDL
5. Calf Raise
```

The system should accept this without error.

The planned programme should guide the athlete but not unnecessarily restrict real gym behaviour.

---

# 20. Partial Workouts

The application must support workouts where only part of the planned session was completed.

Example:

```text
Session A

Jump        completed
Squat       completed
RDL         completed
Lunge       skipped
Calf Raise  skipped
```

Workout status:

```text
partial
```

The completed work should still be stored.

Skipped exercises should remain visible in the history but should not automatically trigger progression regression.

---

# 21. Monthly Training Calendar

The History screen needs to determine whether a workout occurred on each date.

This can be calculated from `WorkoutSession`.

Example:

```text
8 September 2026

Workout:
Session A

Status:
completed
```

The adherence calendar can therefore display the day as:

```text
Session A completed
```

Different workout templates can be represented visually using different fill styles or accent colours.

The calendar does not require a separate database table in the MVP.

It can be generated from workout-session history.

---

# 22. Workout Completion Summary

The Workout Complete screen can calculate:

```text
Exercises completed
Working sets completed
Total volume
Workout duration
Progression decisions
```

## Total Volume

A simple initial calculation:

```text
Volume = weight × repetitions
```

Total workout volume:

```text
sum(weight × repetitions for all completed sets)
```

This metric should be treated as descriptive rather than as the main measure of football training quality.

---

# 23. Data Relationships

Conceptually:

```text
WorkoutTemplate
    1
    │
    │ has many
    ↓
PlannedExercise
    │
    │ belongs to
    ↓
Exercise
```

And:

```text
WorkoutSession
    1
    │
    │ has many
    ↓
ExercisePerformance
    1
    │
    │ has many
    ↓
SetPerformance
```

Additionally:

```text
ExercisePerformance
    │
    ├── references Exercise
    │
    └── optionally references PlannedExercise
```

---

# 24. Conceptual Relationship Diagram

```text
                    Exercise
                       ▲
                       │
                       │
WorkoutTemplate ──< PlannedExercise
       │
       │
       │ creates / references
       ▼
WorkoutSession
       │
       │
       └──< ExercisePerformance >── Exercise
                    │
                    │
                    └──< SetPerformance
```

`──<` means:

```text
one-to-many
```

Example:

```text
One WorkoutSession
can have many ExercisePerformance records.
```

---

# 25. Example Data Journey

The athlete opens:

```text
Session A
```

The system retrieves:

```text
WorkoutTemplate
```

and its:

```text
PlannedExercises
```

For Back Squat:

```text
planned_sets = 3
rep_min = 4
rep_max = 6
target_rir = 1–2
```

The system retrieves the athlete's latest Back Squat performance:

```text
75 kg

6 / 6 / 6
RIR 2
```

The progression rule determines:

```text
Recommended Load:
77.5 kg
```

The athlete starts the workout.

A new:

```text
WorkoutSession
```

is created.

The athlete opens Back Squat.

A new:

```text
ExercisePerformance
```

is created.

Each completed set creates a:

```text
SetPerformance
```

record.

The workout finishes.

The system compares:

```text
planned performance

vs

actual performance
```

and determines the next recommendation.

---

# 26. MVP Data Scope

The first functional version only needs to support:

- exercises
- four workout templates
- planned exercise prescriptions
- workout sessions
- exercise performances
- individual working sets
- previous performance
- recommended load
- session history
- basic progression logic

The MVP does **not** initially require:

- advanced readiness modelling
- machine learning
- Garmin data
- football GPS data
- coach accounts
- social features
- complex fatigue modelling

These should only be added once the core training loop works reliably.

---

# 27. Future Athlete Entity

The first version may only have one user.

However, the architecture should eventually support:

```text
Athlete
```

Possible future fields:

| Field | Description |
|---|---|
| `id` | Athlete identifier |
| `name` | Athlete name |
| `email` | Account email |
| `bodyweight_kg` | Current bodyweight |
| `preferred_units` | kg / lb |
| `created_at` | Account creation time |

Eventually:

```text
Athlete
   │
   └── WorkoutSessions
```

This enables multiple users without mixing their training histories.

---

# 28. Future FootballSession Entity

A future version will need to represent football workload.

Possible fields:

```text
id
athlete_id
date
activity_type
duration_minutes
session_rpe
match_or_training
notes
```

Possible activity types:

```text
training
match
conditioning
recovery
```

This data could eventually modify lower-body session volume and timing.

It is not required for the first workout-logging vertical slice.

---

# 29. Future BodyweightEntry Entity

Future analytics may require:

```text
BodyweightEntry

id
athlete_id
date
weight_kg
```

This would support:

- bodyweight trends
- strength-to-bodyweight calculations
- long-term athlete development analysis

---

# 30. Future ReadinessEntry Entity

Possible future fields:

```text
date
sleep_quality
muscle_soreness
energy
motivation
perceived_fatigue
```

These values should not automatically override the programme until enough evidence exists to justify useful rules.

---

# 31. Database Design Principles

When the database is implemented:

## Avoid Duplicate Information

Store raw facts once where possible.

Example:

Do not repeatedly store the exercise name inside every set.

Instead:

```text
SetPerformance
    ↓
ExercisePerformance
    ↓
Exercise
```

provides the exercise name.

---

## Preserve Historical Records

Changing a workout template must not rewrite completed training history.

For example:

If Session A originally contained:

```text
Squat
3 × 4–6
```

and the programme later changes to:

```text
Squat
3 × 3–5
```

previous sessions must still represent what was prescribed at the time.

This may eventually require snapshotting the prescription when a workout session is created.

---

## Store Raw Data

Where possible, store:

```text
actual weight
actual reps
actual RIR
timestamps
```

rather than only storing calculated summaries.

Derived metrics can be recalculated later.

---

## Keep Business Logic Outside the Database

The database should primarily store information.

Rules such as:

```text
if 8/8/8 then increase load
```

should live in the backend training/progression engine.

This keeps the system easier to understand, test and modify.

---

# 32. MVP Backend Responsibilities

The backend will eventually be responsible for:

```text
Retrieve workout templates

Create workout session

Retrieve previous exercise performance

Calculate recommended load

Store completed sets

Complete workout session

Calculate progression outcome

Retrieve workout history
```

The frontend should not contain the core training progression logic.

---

# 33. MVP Frontend Responsibilities

The frontend should primarily:

```text
Display information

Collect athlete input

Send data to backend

Display backend recommendations
```

Example:

```text
User enters:

80 kg
6 reps
RIR 2
```

The frontend sends this data to the backend.

The backend stores it and determines what it means.

---

# 34. Example Future API Mapping

The exact API is not final, but the data model may eventually support routes such as:

```text
GET /workouts

GET /workouts/{id}

POST /sessions

GET /sessions/{id}

POST /sessions/{id}/sets

POST /sessions/{id}/complete

GET /exercises/{id}/history

GET /exercises/{id}/recommendation

GET /history
```

These are implementation details and may change during backend development.

---

# 35. First Full-Stack Vertical Slice

The first complete data flow should be deliberately small.

Goal:

> Record one Back Squat set and retrieve it.

Example:

```text
Exercise:
Back Squat

Weight:
80 kg

Reps:
6

RIR:
2
```

Flow:

```text
Frontend
    ↓
POST set
    ↓
FastAPI Backend
    ↓
Database
    ↓
Retrieve Set
    ↓
Frontend
```

Success means the application displays:

```text
✓ Set 1

80 kg × 6
RIR 2
```

and the record remains available after restarting the application.

---

# 36. Current MVP Entity Summary

```text
Exercise
│
├── name
├── category
└── equipment


WorkoutTemplate
│
├── name
├── description
└── estimated duration


PlannedExercise
│
├── exercise
├── order
├── sets
├── rep_min
├── rep_max
├── target_rir
├── rest
├── load_increment
└── progression_type


WorkoutSession
│
├── workout
├── date
├── start
├── finish
├── mode
└── status


ExercisePerformance
│
├── exercise
├── recommended_load
├── actual_order
└── completion_status


SetPerformance
│
├── set_number
├── actual_weight
├── actual_reps
├── actual_rir
└── completed
```

---

# 37. Current Design Decision

The MVP data model should remain intentionally small.

The priority is to successfully support:

```text
PLAN
↓
TRAIN
↓
LOG
↓
STORE
↓
COMPARE
↓
PROGRESS
```

Additional entities should only be introduced when a real product requirement requires them.

The goal is not to design the final database today.

The goal is to design enough of the system to begin building confidently.