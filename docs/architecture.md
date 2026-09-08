# System Architecture — Adaptive Athlete

**Status:** Architecture v0.1  
**Application Type:** Mobile-first web application / future PWA  
**Primary Goal:** Support structured gym training, workout logging, progression recommendations, football-aware adaptation and long-term performance analysis.

---

# 1. Purpose

This document defines the high-level architecture of the Adaptive Athlete application.

The system is designed around a simple principle:

```text
User trains
    ↓
Data is recorded
    ↓
Backend interprets the data
    ↓
Database stores the data
    ↓
Future recommendations are generated
    ↓
Progress can be analysed
```

The initial system should remain simple, transparent and maintainable.

The architecture should support future expansion without requiring the first version to include every planned feature.

---

# 2. High-Level Architecture

The application will initially use four main layers:

```text
┌───────────────────────────────┐
│        FRONTEND / UI          │
│                               │
│ Next.js + React + TypeScript  │
│ Mobile-first web application  │
└───────────────┬───────────────┘
                │
                │ HTTPS / JSON
                ▼
┌───────────────────────────────┐
│          BACKEND API          │
│                               │
│ Python + FastAPI              │
│                               │
│ Validation                    │
│ Progression logic             │
│ Adaptive training rules       │
│ Business logic                │
└───────────────┬───────────────┘
                │
                │ SQL / database connection
                ▼
┌───────────────────────────────┐
│           DATABASE            │
│                               │
│ PostgreSQL via Supabase       │
│                               │
│ Workout data                  │
│ Exercise data                 │
│ Session history               │
│ User data                     │
└───────────────┬───────────────┘
                │
                │
                ├──────────────► Application history
                │
                ├──────────────► Progress dashboards
                │
                ├──────────────► Python analysis
                │
                └──────────────► Future Power BI / analytics
```

---

# 3. Frontend

## Technology

The frontend will use:

```text
Next.js
React
TypeScript
```

The initial application will be built as a:

> mobile-first responsive web application

with the option to later become a:

> Progressive Web App (PWA)

This allows the application to work well on a mobile phone without requiring separate native iOS and Android applications.

---

## Frontend Responsibilities

The frontend is responsible for:

- displaying workouts;
- displaying previous performance;
- displaying recommended loads;
- collecting user input;
- logging sets and exercises;
- showing workout history;
- showing progression results;
- displaying dashboards and charts;
- sending requests to the backend;
- rendering responses returned by the backend.

The frontend should **not** contain the core training progression logic.

For example:

```text
User enters:

80 kg
6 reps
RIR 2
```

The frontend should send this information to the backend.

The backend determines what that performance means.

---

# 4. Backend

## Technology

The backend will use:

```text
Python
FastAPI
```

The backend acts as the central decision-making layer of the application.

---

## Backend Responsibilities

The backend will be responsible for:

- receiving data from the frontend;
- validating workout inputs;
- retrieving previous workout history;
- calculating progression recommendations;
- applying adaptive training rules;
- creating workout sessions;
- storing completed sets;
- completing workout sessions;
- retrieving training history;
- providing data for dashboards;
- later incorporating football workload and readiness information.

---

## Example Backend Flow

The athlete completes:

```text
Standing Shoulder Press

25 kg

8 / 8 / 8

RIR:
2 / 2 / 1
```

The backend checks the progression rule:

```text
Target:
3 × 5–8

Minimum progression RIR:
1
```

The result is:

```text
Target achieved.
```

The backend returns:

```text
Next recommended load:
27.5 kg
```

The frontend simply displays this result.

---

# 5. Adaptive Training Engine

The adaptive training engine will initially be part of the Python backend.

It should be:

```text
deterministic
transparent
testable
explainable
```

The first version should not require artificial intelligence or machine learning.

---

## Initial Progression Logic

For standard double-progression exercises:

```text
IF
all prescribed working sets reach the top of the rep range

AND
the minimum RIR requirement is satisfied

AND
technique is acceptable

THEN
increase load next session

ELSE
maintain current load
```

Example:

```text
Target:
3 × 6–8 @ 25 kg
```

Performance:

```text
8 / 8 / 7
```

Result:

```text
Keep 25 kg
```

Performance:

```text
8 / 8 / 8
RIR ≥ 1
```

Result:

```text
Increase load
```

---

## Future Adaptive Logic

The same engine can later consider:

```text
Gym performance
+
Football schedule
+
Match proximity
+
Football workload
+
Readiness
+
Recent fatigue
```

Example:

```text
Normal Lower A

3 squat sets
3 RDL sets
2 lunge sets
```

If the athlete has a match the following day:

```text
Reduced Lower A

2 squat sets
2 RDL sets
No lunges
```

The adaptive engine should modify training only when there is a clear rule or evidence-based reason to do so.

---

# 6. Database

## Technology

The main database will use:

```text
PostgreSQL
```

hosted through:

```text
Supabase
```

Supabase is used because it provides:

- managed PostgreSQL;
- a visual table interface;
- authentication options;
- API support;
- free-tier suitability for early development;
- an easier development experience than managing a database server manually.

---

# 7. Why PostgreSQL Instead of Google Sheets or Microsoft Lists?

A spreadsheet is suitable for simple tabular data.

The application requires relational data.

For example:

```text
Athlete
    ↓
Workout Session
    ↓
Exercise Performance
    ↓
Set Performance
```

A single workout contains:

```text
many exercises
```

and each exercise contains:

```text
many sets
```

This relationship is much better represented using a relational database.

---

## Example Database Structure

### Exercise

```text
Back Squat
Bench Press
Shoulder Press
Pull-Up
```

### Workout Session

```text
Lower A
8 September 2026
```

### Exercise Performance

```text
Back Squat
Recommended Load: 80 kg
```

### Set Performance

```text
Set 1
80 kg
6 reps
RIR 2
```

PostgreSQL allows these records to be connected without repeatedly duplicating information.

---

# 8. Database as the Single Source of Truth

The PostgreSQL database should become the central source of training information.

Conceptually:

```text
                    ┌──────────────► Web App
                    │
                    ├──────────────► Python Analysis
PostgreSQL Database ┼──────────────► Dashboards
                    │
                    ├──────────────► Power BI
                    │
                    └──────────────► Future ML Models
```

The application should not maintain separate conflicting versions of training history.

All analytical tools should ultimately read from the same underlying data.

---

# 9. Core MVP Database Entities

The first implementation should focus on:

```text
Exercise

WorkoutTemplate

PlannedExercise

WorkoutSession

ExercisePerformance

SetPerformance
```

These are defined in more detail in:

```text
docs/design/data-model.md
```

---

# 10. Example Data Flow — Logging One Set

The first full-stack feature should remain deliberately simple.

The athlete enters:

```text
Back Squat

80 kg

6 reps

RIR 2
```

The flow is:

```text
USER
  ↓
Adaptive Athlete Web App
  ↓
Next.js / React Frontend
  ↓
HTTP POST request
  ↓
FastAPI Backend
  ↓
Validate data
  ↓
PostgreSQL Database
  ↓
Store SetPerformance
```

The response then travels back:

```text
PostgreSQL
    ↓
FastAPI
    ↓
Next.js
    ↓
User sees:

✓ Set 1
80 kg × 6
RIR 2
```

---

# 11. Example API Request

Conceptually, the frontend may send something similar to:

```json
{
  "exercise_id": 1,
  "set_number": 1,
  "weight_kg": 80,
  "reps": 6,
  "rir": 2
}
```

The backend validates the data and stores it.

The exact API structure may change during development.

---

# 12. Data Persistence

Training data must persist after:

- closing the browser;
- restarting the application;
- restarting the backend;
- logging in on another device.

This means workout data should be stored permanently in PostgreSQL rather than remaining only in frontend memory.

---

# 13. Frontend Mock Data Phase

The first frontend version should initially use mock data.

Example:

```text
Lower A

Back Squat

3 × 4–6

Previous:
75 kg × 6 / 6 / 5

Recommended:
75 kg
```

The purpose of this stage is to:

- validate the interface;
- confirm application flow;
- make UI changes cheaply;
- avoid designing backend systems around an interface that may change.

Once the frontend flow is satisfactory, the mock data should gradually be replaced with real API data.

---

# 14. Development Sequence

The application should be built using vertical slices.

## Phase 1 — Frontend Shell

```text
Initialise Next.js
↓
Create Today screen
↓
Create workout cards
↓
Create Workout Detail screen
↓
Create Active Workout screen
```

Initially use mock data.

---

## Phase 2 — Backend Shell

```text
Initialise FastAPI
↓
Create health endpoint
↓
Connect frontend to backend
```

Example:

```text
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

---

## Phase 3 — Database

```text
Create Supabase project
↓
Create PostgreSQL tables
↓
Connect FastAPI to PostgreSQL
```

---

## Phase 4 — First Full-Stack Vertical Slice

Goal:

> Log one Back Squat set.

```text
Frontend
↓
FastAPI
↓
PostgreSQL
↓
Retrieve data
↓
Frontend
```

Once this works, the system has proven that all major architectural layers can communicate.

---

## Phase 5 — Expand Training Logging

```text
One set
↓
One exercise
↓
Whole workout
↓
Workout history
```

---

## Phase 6 — Progression Engine

Add:

```text
previous performance
+
progression rules
↓
next recommendation
```

---

## Phase 7 — Analytics

Add:

- monthly adherence calendar;
- training history;
- estimated 1RM;
- strength progression;
- volume trends;
- bodyweight trends;
- adherence statistics.

---

## Phase 8 — Football Adaptation

Add:

```text
Football Session
Match
Football Load
```

Then use these inputs to modify gym training.

---

# 15. Analytics Architecture

The PostgreSQL database should support multiple analytical approaches.

---

## Option 1 — Application-Native Dashboards

The web app can request analytical data from FastAPI and display charts directly.

Example:

```text
PostgreSQL
↓
FastAPI
↓
Next.js
↓
Progress Chart
```

This is ideal for user-facing metrics.

---

## Option 2 — Python Analysis

Python can connect directly to PostgreSQL.

Tools may include:

```text
Pandas
NumPy
SciPy
Matplotlib
Plotly
```

This can support deeper analysis such as:

- exercise progression rate;
- training volume trends;
- football interference;
- readiness-performance relationships;
- plateau detection;
- performance modelling.

---

## Option 3 — Power BI

Power BI can later connect to PostgreSQL.

This could provide:

- advanced dashboards;
- exploratory analytics;
- portfolio-quality visualisation;
- deeper analysis outside the main mobile interface.

The web application does not need to contain every analytical view.

---

# 16. Future Analytics Flow

Example:

```text
Workout Data
     ↓
PostgreSQL
     ↓
Python / Pandas
     ↓
Analysis
     ↓
Performance Insights
```

Possible questions include:

```text
How quickly is squat strength increasing?

How many gym sessions were completed this month?

Which exercises have plateaued?

Does high football load reduce lower-body performance?

Do matches affect gym performance 24–48 hours later?

Is strength increasing relative to bodyweight?
```

---

# 17. Authentication

Authentication is not required for the first local prototype.

Once the application is deployed or used by multiple athletes, authentication can be added through Supabase.

Future flow:

```text
User
↓
Login
↓
Supabase Auth
↓
Athlete Account
↓
Personal Training Data
```

Each athlete must eventually have access only to their own training data.

---

# 18. Security

Sensitive information must not be committed to GitHub.

Examples include:

```text
database passwords
API keys
Supabase secrets
authentication tokens
```

These should be stored in environment files such as:

```text
.env
.env.local
```

and ignored by Git.

The repository may contain:

```text
.env.example
```

to document required configuration variables without storing real credentials.

---

# 19. Repository Structure

The planned structure is:

```text
adaptive-athlete/
│
├── README.md
├── LICENSE
├── .gitignore
│
├── docs/
│   ├── architecture.md
│   ├── product-requirements.md
│   │
│   ├── design/
│   │   ├── application-flow.md
│   │   ├── data-model.md
│   │   └── ui-mockups/
│   │
│   ├── research/
│   │   ├── training-principles.md
│   │   ├── four-day-programme.md
│   │   ├── football-performance.md
│   │   └── recovery.md
│   │
│   └── decisions/
│
├── frontend/
│
├── backend/
│
└── analysis/
```

---

# 20. Separation of Responsibilities

A major architectural principle is:

```text
Frontend
= presentation and user interaction

Backend
= rules and application logic

Database
= permanent storage

Analysis
= deeper interpretation of historical data
```

These responsibilities should remain separated.

---

# 21. Why Business Logic Belongs in the Backend

The frontend should not independently decide:

```text
Should shoulder press increase to 27.5 kg?
```

The backend should make this decision.

Why?

Because otherwise the same progression rule may need to be duplicated across:

- mobile interface;
- future desktop interface;
- dashboards;
- future integrations.

Centralising the rule makes behaviour consistent.

---

# 22. Initial Technology Stack

## Frontend

```text
Next.js
React
TypeScript
```

## Backend

```text
Python
FastAPI
```

## Database

```text
PostgreSQL
Supabase
```

## Analytics

```text
Python
Pandas
NumPy
```

Potential later additions:

```text
SciPy
Plotly
Power BI
```

## Development

```text
VS Code
Git
GitHub
Codex
```

---

# 23. Role of Codex

Codex will increasingly be used as an implementation agent.

The intended workflow is:

```text
Requirement
↓
GitHub Issue
↓
Codex Implementation
↓
Developer Review
↓
Testing
↓
Commit / Pull Request
↓
GitHub
```

Codex should initially receive narrowly scoped tasks.

Example:

```text
Initialise the Next.js frontend according to the documented
application architecture.

Create only the application shell and mock Today screen.

Do not implement the backend or database.
```

Codex should not make major architecture decisions without those decisions first being documented or reviewed.

---

# 24. Role of GitHub

GitHub is the permanent record of the project.

It stores:

- source code;
- documentation;
- version history;
- issues;
- future pull requests;
- architecture decisions.

The repository should tell the story of how the system evolved.

---

# 25. Architecture Decision Records

Important technical decisions should eventually be documented inside:

```text
docs/decisions/
```

Example:

```text
ADR-001 — Use Next.js for frontend

ADR-002 — Use FastAPI for backend

ADR-003 — Use PostgreSQL instead of spreadsheets

ADR-004 — Use deterministic progression rules before AI

ADR-005 — Use Supabase for managed PostgreSQL
```

These records explain why important decisions were made.

---

# 26. MVP Architecture

The MVP should be considered successful when this loop works:

```text
User opens Adaptive Athlete
        ↓
Views prescribed workout
        ↓
Starts workout
        ↓
Logs working sets
        ↓
Data is sent to FastAPI
        ↓
Data is stored in PostgreSQL
        ↓
Workout is completed
        ↓
Previous performance is available next time
        ↓
Progression recommendation is generated
```

The system does not need advanced AI, Garmin integration or complex football modelling for this milestone.

---

# 27. Long-Term Architecture

The architecture should eventually support:

```text
Athlete
│
├── Gym Training
│
├── Football Training
│
├── Matches
│
├── Bodyweight
│
├── Readiness
│
├── Sprint / Jump Testing
│
└── Wearable Data
        ↓
Central PostgreSQL Database
        ↓
Adaptive Training Engine
        ↓
Recommendations
        ↓
Dashboards / Analysis
```

This should be treated as the long-term direction rather than the MVP requirement.

---

# 28. Architecture Principle

The system should remain:

```text
simple enough to understand
structured enough to scale
data-rich enough to analyse
flexible enough to adapt
```

Complexity should only be introduced when it solves a real problem.

The application should not use advanced technology simply because it is available.

The first priority is to build a reliable training feedback loop:

```text
TRAIN
↓
RECORD
↓
UNDERSTAND
↓
ADAPT
↓
TRAIN AGAIN