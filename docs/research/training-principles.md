# Training Principles — Athlete Performance Engine

**Status:** Working specification v0.1  
**Horizon:** 146 days  
**Primary objective:** Improve football-relevant strength, acceleration, explosiveness, robustness and useful muscle while managing the fatigue created by football training and matches.

> This document defines the training logic the application should eventually encode. It is intentionally evidence-led and relatively simple: use deterministic rules where a deterministic rule is enough.

---

## 1. Core Philosophy

The gym programme supports football performance; it does not compete with it.

The system should therefore optimise for:

1. **Strength** — especially lower-body force production and relative strength.
2. **Power** — the ability to express force quickly.
3. **Acceleration and change-of-direction qualities** — supported by strength, plyometrics and football/sprint exposure.
4. **Robustness** — hamstrings, adductors, calves/soleus and general tissue capacity.
5. **Upper-body strength and useful muscle** — without creating unnecessary fatigue.
6. **Recoverability** — enough work to drive adaptation, but not so much that gym fatigue damages football quality.

The programme does **not** need to maximise bodybuilding volume or produce a weekly lifting personal best. Progress can be represented by more reps, more load, better RIR, better technique or improved power quality.

---

## 2. Why a Four-Day Split?

Research does not show that split routines are inherently superior to full-body routines when weekly training volume is matched. The four-day structure is therefore chosen for **practical fatigue management**, not because four days is biologically magical.

The chosen structure is:

- **Session A — Lower Strength + Power**
- **Session B — Upper Strength**
- **Session C — Lower Volume / Robustness + Power**
- **Session D — Upper Volume**

This creates:

- two lower-body exposures per cycle;
- two upper-body exposures per cycle;
- space for both heavy strength and explosive work;
- the ability to reduce or move lower-body sessions when football load increases;
- a simple structure for the adaptive engine.

Football determines **when** the sessions are performed. The programme defines **what** each session contains.

---

## 3. 146-Day Structure

The 146 days are divided into broad phases rather than many complicated micro-phases.

| Days | Phase | Main purpose |
|---|---|---|
| 1–21 | Calibration | Establish technique, starting loads and realistic RIR |
| 22–70 | Build | Accumulate strength, useful muscle and tissue capacity |
| 71–112 | Strength Emphasis | Shift the primary lifts toward heavier work |
| 113–133 | Power + Freshness | Maintain strength while reducing unnecessary fatigue |
| 134–146 | Freshen + Assess | Reduce fatigue and benchmark progress |

### Phase 1 — Days 1–21: Calibration

- Use conservative starting loads.
- Work mostly around **2–3 RIR**.
- Learn what 1, 2 and 3 RIR actually feel like.
- Do not chase rapid load increases.
- Establish repeatable technique.
- Record every working set.
- Establish realistic starting loads for the progression engine.

A good starting load is one that allows the **bottom of the prescribed rep range with approximately 2–3 RIR**.

### Phase 2 — Days 22–70: Build

- Use the normal four-session structure.
- Most working sets sit around **1–2 RIR**.
- Use double progression for most resistance exercises.
- Maintain two exposures to high-quality jump/power work.
- Progress gradually rather than forcing weekly load increases.

### Phase 3 — Days 71–112: Strength Emphasis

For the major lifts, bias training slightly heavier while retaining enough volume to maintain muscle.

Examples:

- Squat / bench: generally **3–6 reps**
- Standing shoulder press: generally **4–7 reps**
- RDL / rows: generally **5–8 reps**

Accessories can remain mostly in moderate and higher rep ranges.

### Phase 4 — Days 113–133: Power + Freshness

- Maintain useful heavy strength work.
- Reduce lower-body accessory volume if football load is high.
- Keep explosive work high quality.
- Avoid accumulating fatigue simply to increase gym volume.
- The athlete should increasingly feel sharp rather than buried.

### Phase 5 — Days 134–146: Freshen + Assess

- Reduce gym volume by roughly **40–60%**.
- Retain some moderate/heavy intensity so strength is not completely unloaded.
- Avoid failure.
- Assess selected benchmarks at the end of the period.

Possible benchmarks:

- squat and bench estimated 1RM;
- weighted pull-up/chin-up performance;
- bodyweight;
- 5 m / 10 m acceleration if testing is available;
- countermovement jump or broad jump;
- training adherence;
- football freshness/performance notes.

---

## 4. Sets and Repetitions

Different exercises serve different purposes, so they should not all use the same repetition scheme.

### Primary Strength Exercises

Examples:

- Back squat
- Bench press
- Standing shoulder press

Typical prescription:

- **3 working sets**
- approximately **4–8 reps**
- **1–3 RIR**
- **2.5–4 min rest**

### Secondary Compound Exercises

Examples:

- Romanian deadlift
- Leg press
- Weighted lunges
- Weighted rows
- Incline bench
- Pull-ups / chin-ups / dips

Typical prescription:

- **2–3 working sets**
- approximately **6–10 reps**
- **1–2 RIR**
- **2–3 min rest**

### Accessory / Isolation Exercises

Examples:

- Lateral raises
- Leg extensions
- Curls
- Lat pulldowns
- Calf / soleus work

Typical prescription:

- **2–3 working sets**
- approximately **8–20 reps**
- usually **1–2 RIR**
- **60–120 s rest**

### Power / Plyometric Work

Examples:

- Broad jump
- Countermovement jump
- Lateral bound

Typical prescription:

- **2–4 sets**
- **2–5 reps**
- full intent on every repetition;
- **2–3 min rest** when required;
- stop before fatigue meaningfully reduces quality.

Power work is not progressed by grinding out more repetitions.

---

## 5. Training to Failure

Routine failure training is **not required**.

### Default

| Exercise type | Typical target |
|---|---|
| Jumps / explosive work | Stop while quality is high |
| Heavy compound lifts | 1–3 RIR |
| Secondary compound lifts | 1–2 RIR |
| Isolation/accessory work | 1–2 RIR |
| Optional final upper-body isolation set | 0–1 RIR occasionally |

### Rules

- Do not deliberately grind squats, RDLs or other high-fatigue lower-body compounds to failure.
- Reaching the top of a rep range at **0 RIR** does not automatically qualify for a load increase.
- Technique breakdown means the set has effectively reached its useful limit even if another ugly repetition might be possible.
- Failure can occasionally be used on low-risk isolation work, but it is a tool rather than the default.

For a footballer, the additional fatigue cost of failure often matters more than the tiny possible extra training stimulus.

---

## 6. Rest Between Sets

Rest should be long enough to maintain output.

### Default rules

- Heavy squat / bench: **3–4 min**
- Shoulder press / RDL / rows / weighted bodyweight work: **2–3 min**
- Leg press / lunges: **2–3 min**
- Isolation work: **60–120 s**
- Jumps: enough recovery to restore high-quality output, usually **2–3 min**

If performance collapses primarily because rest periods were rushed, the software should not treat that as a genuine strength regression.

---

## 7. Progression Model

The default model is **double progression**.

Example:

**Standing shoulder press — 3 × 6–8 @ 25 kg**

| Session | Result | Next action |
|---|---|---|
| 1 | 6 / 6 / 6 | Keep 25 kg |
| 2 | 7 / 7 / 6 | Keep 25 kg |
| 3 | 8 / 7 / 7 | Keep 25 kg |
| 4 | 8 / 8 / 8 with ≥1 RIR | Increase load |
| 5 | Begin again near bottom of range | Build upward |

### General progression rule

Increase load only when:

1. all prescribed working sets reach the top of the rep range;
2. technique is acceptable;
3. the final set is not an uncontrolled maximal grind;
4. the exercise-specific minimum RIR requirement is met.

Pseudo-logic:

```text
IF all_sets_reach_rep_max
AND actual_RIR >= minimum_progression_RIR
AND technique_is_acceptable
THEN increase_next_load
ELSE maintain_load
```

This is the foundation of the first adaptive engine.

---

## 8. What Counts as Progress?

Load is not the only useful measure.

The system should recognise:

- additional repetitions at the same load;
- the same repetitions with more RIR;
- better technique at the same load;
- a load increase while remaining inside the prescribed range;
- improved jump distance/height at equal effort;
- successful return to normal performance after a congested football week.

Example:

```text
Week 1: 25 kg × 6,6,6 @ 1 RIR
Week 2: 25 kg × 6,6,6 @ 2 RIR
```

The load did not increase, but performance probably improved.

---

## 9. Plateau Logic

One session without progression is **not** a plateau.

### Exposure 1 — Target not reached

- Keep the same load.
- Attempt progression next time.

### Exposure 2 — Still not reached

- Keep the load if reps, RIR or technique are improving.
- Check whether football fatigue or insufficient recovery explains the result.

### Exposure 3 — No meaningful improvement

Investigate before automatically adding more training.

Ask:

- Has football load increased?
- Was the previous match unusually demanding?
- Is the athlete failing only this exercise or several exercises?
- Are rest periods being rushed?
- Is technique limiting the movement?
- Is the prescribed load increment too large?
- Has the exercise been pushed close to failure repeatedly?

### If the problem appears exercise-specific

Possible actions:

1. use a smaller load increment / microplates;
2. repeat the load;
3. reduce load by approximately **5–7.5%** and rebuild;
4. alter the rep range after a sufficiently long exposure;
5. only consider changing the exercise if the plateau persists.

### If several exercises regress together

Treat systemic fatigue as the first hypothesis.

Possible response:

- reduce gym volume for approximately 5–7 days;
- preserve some intensity;
- restore normal training when performance and football freshness return.

The engine should never assume that every stalled lift needs *more* volume.

---

## 10. Failed Sets and Partial Workouts

The application must distinguish between:

### Performance Failure

The athlete attempted the prescribed exercise and could not reach the target.

### Non-Performance Non-Completion

The exercise was skipped because of:

- lack of time;
- equipment being occupied;
- football scheduling;
- deliberate fatigue management;
- session interruption.

A skipped exercise must **not** be interpreted as evidence that the athlete became weaker.

This distinction is essential for the adaptive engine.

---

## 11. Football Load Rules

Football takes priority when there is a conflict between gym fatigue and match readiness.

### General scheduling principles

- Avoid a demanding lower-body session immediately before a match.
- Prefer full lower-body strength work earlier in the match microcycle.
- Use upper-body sessions more freely near matches.
- High football volume should primarily modify **lower-body gym volume**, not automatically remove all gym training.

### Suggested session states

Each lower-body session can eventually have three versions:

#### FULL
Normal planned sets and exercises.

#### REDUCED
Approximately 25–40% lower volume while keeping key movements.

#### MAINTENANCE
Approximately 1–2 high-quality working sets of the most important movements, minimal accessory fatigue.

Example:

**Session A — Full**

- jumps 3 × 3
- squat 3 × 4–6
- RDL 3 × 6–8
- lunges 2 × 6–8
- calves 2 × 8–12

**Session A — Maintenance**

- jumps 2 × 3
- squat 2 × 4
- RDL 2 × 6
- optional calf work

The purpose of adaptation is to preserve training momentum without sacrificing football sharpness.

---

## 12. Hybrid / Concurrent Training Principles

Football already provides substantial endurance, sprint, acceleration and deceleration exposure.

Therefore:

- additional conditioning should have a clear purpose;
- avoid adding large volumes of endurance work simply because the athlete is a "hybrid athlete";
- when possible, separate hard lower-body resistance training from hard endurance/football work;
- upper-body gym work has much lower interference with football than demanding lower-body work;
- high-quality sprint and power work should be protected from unnecessary fatigue.

---

## 13. Football-Specific Additions to the Requested Exercise List

The requested exercise list is strong for general strength and upper-body development but initially lacked enough posterior-chain and lower-leg/adductor work.

The programme therefore adds:

- **Romanian deadlift** — hip-hinge / posterior-chain strength;
- **Nordic hamstring exercise** — eccentric hamstring strength and robustness;
- **standing calf raise** — gastrocnemius;
- **bent-knee soleus raise** — soleus;
- **Copenhagen adduction** — adductor capacity;
- **low-volume jumps/bounds** — explosive intent.

These additions should remain low enough in volume that they support football rather than dominate the programme.

---

## 14. Warm-Up Principles

Warm-up sets are not counted as working sets.

For the first major lift of a session:

1. complete a general warm-up;
2. complete several progressively heavier ramp-up sets;
3. avoid fatigue during warm-up;
4. begin working sets only when movement feels prepared.

Example before a 100 kg squat working weight:

```text
20 kg × 8
60 kg × 5
80 kg × 3
90 kg × 1–2
100 kg → working sets
```

Exact warm-up loads should remain flexible.

---

## 15. Data the Application Should Eventually Store

The research implies that a planned exercise should eventually be able to represent:

```text
exercise
session
sets
rep_min
rep_max
target_RIR
current_load
load_increment
progression_type
rest_seconds
priority
session_state
```

A completed set should eventually store:

```text
actual_weight
actual_reps
actual_RIR
completion_status
set_number
timestamp
```

The adaptive loop becomes:

```text
PLAN
  ↓
PERFORM
  ↓
LOG
  ↓
COMPARE TARGET vs ACTUAL
  ↓
APPLY PROGRESSION RULE
  ↓
RECOMMEND NEXT TARGET
```

Football load sits above this as a modifier of session volume and timing.

---

## 16. Evidence Base

Key evidence informing this working specification:

1. Currier BS et al. **American College of Sports Medicine Position Stand: Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults.** *Medicine & Science in Sports & Exercise*. 2026. DOI: 10.1249/MSS.0000000000003897.  
   https://pubmed.ncbi.nlm.nih.gov/41843416/

2. Robinson ZP et al. **Exploring the Dose-Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy.** *Sports Medicine*. 2024. DOI: 10.1007/s40279-024-02069-2.  
   https://pubmed.ncbi.nlm.nih.gov/38970765/

3. Grgic J et al. **Effects of Rest Interval Duration in Resistance Training on Measures of Muscular Strength: A Systematic Review.** *Sports Medicine*. 2018. DOI: 10.1007/s40279-017-0788-x.  
   https://pubmed.ncbi.nlm.nih.gov/28933024/

4. Ramos-Campo DJ et al. **Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis.** *Journal of Strength and Conditioning Research*. 2024. DOI: 10.1519/JSC.0000000000004774.  
   https://pubmed.ncbi.nlm.nih.gov/38595233/

5. Oliver JL et al. **The Effects of Strength, Plyometric and Combined Training on Strength, Power and Speed Characteristics in High-Level, Highly Trained Male Youth Soccer Players: A Systematic Review and Meta-Analysis.** *Sports Medicine*. 2024. DOI: 10.1007/s40279-023-01944-8.  
   https://pubmed.ncbi.nlm.nih.gov/37897637/

6. Sanchez-Sanchez J et al. **Plyometric Jump Training Effects on Maximal Strength in Soccer Players: A Systematic Review with Meta-analysis of Randomized-Controlled Studies.** *Sports Medicine - Open*. 2024. DOI: 10.1186/s40798-024-00720-w.  
   https://sportsmedicine-open.springeropen.com/articles/10.1186/s40798-024-00720-w

7. van Dyk N et al. **Including the Nordic hamstring exercise in injury prevention programmes halves the rate of hamstring injuries: a systematic review and meta-analysis of 8459 athletes.** *British Journal of Sports Medicine*. 2019. DOI: 10.1136/bjsports-2018-100045.  
   https://pubmed.ncbi.nlm.nih.gov/30808663/

8. Schumann M et al. **Concurrent Strength and Endurance Training: A Systematic Review and Meta-Analysis on the Impact of Sex and Training Status.** *Sports Medicine*. 2024. DOI: 10.1007/s40279-023-01943-9.  
   https://link.springer.com/article/10.1007/s40279-023-01943-9

---

## 17. Current Design Position

The first version of the adaptive engine should be **rules-based, transparent and testable**.

Complex modelling should only be introduced when real longitudinal data demonstrates a problem that simple progression rules cannot solve.

The target is not a clever algorithm.

The target is a system that repeatedly makes sensible training decisions.
