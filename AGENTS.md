# AGENTS.md — Adaptive Athlete

## Project

Adaptive Athlete is a mobile-first athlete performance web application designed primarily for a footballer completing structured gym training alongside a variable football schedule.

The core product loop is:

```text
PLAN
↓
TRAIN
↓
LOG
↓
COMPARE
↓
PROGRESS
```

The first version should remain deliberately simple.

---

## Technology Stack

### Frontend

- Next.js
- React
- TypeScript

### Backend

- Python
- FastAPI

### Database

- PostgreSQL
- Supabase

### Analytics

- Python
- Pandas
- NumPy

Potential later tools include Plotly and Power BI.

---

## Source of Truth

Before implementing a feature, consult the relevant documentation.

Core documents:

- `docs/product-requirements.md`
- `docs/architecture.md`
- `docs/design/application-flow.md`
- `docs/design/data-model.md`
- `docs/research/training-principles.md`
- `docs/research/four-day-programme.md`

Do not invent product behaviour that contradicts these documents.

If documentation conflicts, report the conflict before implementing behaviour dependent on it.

---

## Canonical Workout Names

The four workout sessions are:

1. `Session A — Strength + Power`
2. `Session B — Strength`
3. `Session C — Robustness + Power`
4. `Session D — Volume`

Use these names consistently in user-facing code and mock data.

---

## MVP Session Rotation

Until football-aware scheduling is implemented, recommend workouts using:

```text
Session A
↓
Session B
↓
Session C
↓
Session D
↓
repeat
```

A completed workout advances the rotation.

A workout intentionally completed as `partial` also advances the rotation.

An unfinished workout does not advance the rotation.

Manual workout selection must remain possible.

---

## MVP Scope

The first usable version should support:

- Today screen
- recommended next workout
- manual workout selection
- Workout Detail screen
- Active Workout screen
- weight, reps and RIR logging
- previous exercise performance
- recommended exercise load
- quick complete-as-prescribed input
- flexible exercise order
- skipped exercises
- partial workout completion
- persistent workout history
- deterministic progression rules
- monthly adherence calendar

Do not expand implementation beyond this scope unless explicitly requested.

---

## Out of Scope for Initial MVP

Do not implement the following unless specifically requested:

- football-load adaptation
- readiness modelling
- Garmin or wearable integrations
- advanced analytics
- Power BI integration
- artificial intelligence coaching
- machine learning
- multi-athlete accounts
- coach accounts
- automatic 146-day phase transitions

---

## Architecture Principles

Maintain clear separation of responsibilities.

```text
Frontend
= presentation and user interaction

Backend
= application and training logic

Database
= persistent data storage

Analysis
= deeper historical analysis
```

Core training progression logic must not be implemented independently in React components.

The backend will eventually be the authoritative source for progression decisions.

---

## Training Logic

Prefer deterministic rules over unnecessary complexity.

Example double-progression rule:

```text
IF
all prescribed sets reach the top of the rep range

AND
required RIR is achieved

THEN
increase load

ELSE
maintain load
```

Do not introduce AI or machine learning where a deterministic rule solves the problem reliably.

---

## Frontend Principles

The application is mobile-first.

Prioritise:

- phone-width layouts
- large touch targets
- minimal interaction
- clear hierarchy
- clean cards
- dark / black visual direction
- high readability
- no horizontal scrolling

The primary gym workflow must be easy to operate between sets.

---

## Development Principles

Prefer:

- simple implementations;
- readable code;
- small reusable components;
- clear TypeScript types;
- explicit behaviour;
- incremental vertical slices.

Avoid:

- premature abstraction;
- unnecessary dependencies;
- large refactors unrelated to the current task;
- speculative features;
- implementing future functionality during MVP tasks.

---

## Mock Data

During early frontend development, mock data should be kept separate from presentation components.

The UI should eventually be able to replace mock data with API responses without requiring major component rewrites.

---

## Security

Never commit:

- API keys
- passwords
- authentication tokens
- database credentials
- real `.env` files

Environment secrets belong in ignored environment files.

An `.env.example` file may document required variables without containing real secrets.

---

## Git Behaviour

Do not commit or push changes unless explicitly requested.

The developer will review changes before committing them.

Do not modify unrelated files when completing a task.

---

## Before Coding

For each implementation task:

1. Read the relevant project documentation.
2. Confirm your understanding of the requested scope.
3. State which files you expect to create or modify.
4. Identify any blocker or contradiction that prevents correct implementation.
5. Do not expand the task unnecessarily.

---

## After Coding

After implementation:

1. Run relevant available checks or tests.
2. Report which files were created or modified.
3. Explain the major implementation decisions.
4. Report unresolved issues.
5. Explain important concepts for a developer learning the stack.
6. Do not commit or push changes unless requested.

---

## Current Development Strategy

Build the product using small vertical slices.

Initial sequence:

```text
Today screen with mock data
↓
Workout Detail
↓
Active Workout UI
↓
FastAPI backend
↓
Frontend-to-backend connection
↓
PostgreSQL persistence
↓
Log one real set
↓
Complete workout
↓
Progression logic
↓
History
↓
Monthly adherence calendar
```

The first major full-stack milestone is:

> Record one Back Squat set from the frontend, persist it in PostgreSQL, retrieve it through FastAPI, and display it again.

---

## Guiding Principle

Do not optimise for the most sophisticated system.

Optimise for the smallest system that correctly solves the athlete's current problem.