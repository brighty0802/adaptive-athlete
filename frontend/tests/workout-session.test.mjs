import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Module from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Use the already-installed TypeScript compiler; no additional test dependency.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");
const cache = new Map();
function load(relative) {
  const filename = [".ts", ".tsx"].map((extension) => relative + extension).find(fs.existsSync);
  if (!filename) throw new Error(`Cannot load ${relative}`);
  if (cache.has(filename)) return cache.get(filename);
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const nativeRequire = mod.require.bind(mod);
  mod.require = (name) => name.startsWith("@/") ? load(path.join(root, name.slice(2)))
    : name.startsWith(".") ? load(path.resolve(path.dirname(filename), name)) : nativeRequire(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  cache.set(filename, mod.exports);
  return mod.exports;
}

const { mockWorkoutDefinitions: workouts } = load(path.join(root, "data/mock-workouts"));
const { createSession, updateSession, finishSession, sessionCounts, validateSet, setRangeWarning } = load(path.join(root, "lib/workout-session"));
const { SetInputRow } = load(path.join(root, "components/set-input-row"));
const { WorkoutDetail } = load(path.join(root, "components/workout-detail"));
const { ActiveWorkout } = load(path.join(root, "components/active-workout"));
const { WorkoutComplete } = load(path.join(root, "components/workout-complete"));
const { getMockTodayData } = load(path.join(root, "data/mock-today"));
const { TodayScreen } = load(path.join(root, "components/today-screen"));
const noop = () => {};
const workout = workouts[0];

test("all four details use the correct programme and labelled prescriptions", () => {
  assert.deepEqual(workouts.map((item) => item.exercises.length), [5, 5, 6, 5]);
  for (const item of workouts) {
    const html = renderToStaticMarkup(React.createElement(WorkoutDetail, {
      workout: item, onStart: noop, onBack: noop, isResuming: false, otherSessionActive: false,
    }));
    assert.ok(html.includes(item.name));
    assert.ok(html.includes(item.focus));
    for (const exercise of item.exercises) {
      assert.ok(html.includes(exercise.name));
      assert.equal(validateSet({ weight: exercise.proposedLoadKg === null ? "" : String(exercise.proposedLoadKg), amount: String(exercise.quickTarget), rir: exercise.quickRir === null ? "" : String(exercise.quickRir) }, exercise), null);
    }
    assert.ok(html.includes("Current recommendation"));
    assert.ok(html.includes("Start Workout"));
  }
});

test("out-of-order completion updates only the selected set; repeated completion is idempotent", () => {
  const original = createSession(workout, 1000);
  const exerciseId = workout.exercises[4].id;
  let session = updateSession(original, workout, { type: "edit", exerciseId, setIndex: 1, field: "amount", value: "10" });
  session = updateSession(session, workout, { type: "edit", exerciseId, setIndex: 1, field: "rir", value: "1" });
  session = updateSession(session, workout, { type: "complete-set", exerciseId, setIndex: 1 });
  session = updateSession(session, workout, { type: "complete-set", exerciseId, setIndex: 1 });
  assert.equal(sessionCounts(session).completedSets, 1);
  assert.equal(session.exercises[0].sets[0].completed, false);
  assert.equal(original.exercises[4].sets[1].amount, "");
  session = updateSession(session, workout, { type: "reopen-set", exerciseId, setIndex: 1 });
  assert.equal(sessionCounts(session).completedSets, 0);
  assert.equal(session.exercises[4].sets[1].amount, "10");
});

test("quick completion preserves entered values and does not double-count", () => {
  const exerciseId = workout.exercises[1].id;
  let session = createSession(workout, 1000);
  session = updateSession(session, workout, { type: "edit", exerciseId, setIndex: 0, field: "weight", value: "72.5" });
  session = updateSession(session, workout, { type: "prescribed", exerciseId });
  session = updateSession(session, workout, { type: "prescribed", exerciseId });
  const sets = session.exercises[1].sets;
  assert.equal(sets[0].weight, "72.5");
  assert.equal(sets[0].completed, false);
  assert.equal(sets[1].amount, "4");
  assert.equal(sessionCounts(session).completedSets, 2);
});

test("skipping preserves logged work and drafts; resume restores editing", () => {
  const exerciseId = workout.exercises[1].id;
  let session = createSession(workout, 1000);
  session = updateSession(session, workout, { type: "edit", exerciseId, setIndex: 0, field: "weight", value: "70" });
  session = updateSession(session, workout, { type: "prescribed", exerciseId });
  session = updateSession(session, workout, { type: "skip", exerciseId });
  assert.equal(sessionCounts(session).completedSets, 2);
  assert.equal(sessionCounts(session).skippedExercises, 1);
  const unchanged = updateSession(session, workout, { type: "prescribed", exerciseId });
  assert.deepEqual(unchanged, session);
  session = updateSession(session, workout, { type: "resume", exerciseId });
  assert.equal(session.exercises[1].sets[0].weight, "70");
  assert.equal(session.exercises[1].skipped, false);
});

test("validation accepts real misses and bodyweight zero; rejects missing and invalid data", () => {
  const squat = workout.exercises[1];
  for (const invalid of ["", "-1", "NaN", "Infinity", "2.5"]) {
    assert.notEqual(validateSet({ weight: "75", amount: invalid, rir: "2" }, squat), null);
  }
  assert.notEqual(validateSet({ weight: "", amount: "6", rir: "2" }, squat), null);
  assert.notEqual(validateSet({ weight: "75", amount: "6", rir: "" }, squat), null);
  assert.notEqual(validateSet({ weight: "75", amount: "6", rir: "11" }, squat), null);
  assert.equal(validateSet({ weight: "75", amount: "0", rir: "0" }, squat), null);
  assert.equal(validateSet({ weight: "0", amount: "5", rir: "2" }, workouts[1].exercises[3]), null);
  const initial = createSession(workout, 1000);
  assert.equal(sessionCounts(updateSession(initial, workout, { type: "complete-set", exerciseId: squat.id, setIndex: 0 })).completedSets, 0);
});

test("timed holds log seconds without weight or RIR; screen uses correct inputs", () => {
  const item = workouts[2];
  const hold = item.exercises.find((exercise) => exercise.id === "copenhagen");
  let session = createSession(item, 1000);
  session = updateSession(session, item, { type: "prescribed", exerciseId: hold.id });
  const log = session.exercises.find((exercise) => exercise.exerciseId === hold.id);
  assert.equal(log.sets[0].amount, "20");
  assert.equal(log.sets[0].weight, "");
  assert.equal(log.sets[0].rir, "");
  const html = renderToStaticMarkup(React.createElement(ActiveWorkout, {
    workout: item, session, savedExercises: session.exercises, canFinish: true, locked: false, onAction: noop, onFinish: noop, onBack: noop,
  }));
  assert.ok(html.includes("Seconds / side"));
  assert.ok(!html.includes('id="copenhagen-set-0-rir"'));
  assert.ok(!html.includes('id="copenhagen-set-0-weight"'));
});

test("finish distinguishes empty, partial and full; terminal session cannot be changed", () => {
  const empty = createSession(workout, 1000);
  assert.equal(finishSession(empty, 61000).status, "cancelled");
  let session = updateSession(empty, workout, { type: "prescribed", exerciseId: workout.exercises[4].id });
  const partial = finishSession(session, 61000);
  assert.equal(partial.status, "partial");
  assert.equal(sessionCounts(partial).completedExercises, 1);
  assert.deepEqual(updateSession(partial, workout, { type: "prescribed", exerciseId: workout.exercises[0].id }), partial);
  assert.deepEqual(finishSession(partial, 90000), partial);
  for (const exercise of workout.exercises) session = updateSession(session, workout, { type: "prescribed", exerciseId: exercise.id });
  assert.equal(finishSession(session, 61000).status, "completed");
  const html = renderToStaticMarkup(React.createElement(WorkoutComplete, { workout, session: { ...partial, feedback: { "standing-calf": "Repeat the established load." } }, onToday: noop }));
  assert.ok(html.includes("Partial workout complete"));
  assert.ok(html.includes("NEXT EXPOSURE"));
  assert.ok(html.includes("Repeat the established load."));
  assert.ok(!html.includes("MOCK FEEDBACK"));
  assert.ok(html.includes("Set 1:"));
});

test("Today renders all four supplied workouts and the supplied recommendation", () => {
  const html = renderToStaticMarkup(React.createElement(TodayScreen, {
    data: getMockTodayData(new Date("2026-09-09T12:00:00Z")), onOpenWorkout: noop,
  }));
  assert.equal((html.match(/class="workout-card /g) || []).length, 4);
  for (const item of workouts) assert.ok(html.includes(`View ${item.name}`));
  assert.ok(html.includes("View Workout"));
});

test("reordering and technique confirmation preserve logged values", () => {
  let session = createSession(workout, 1000);
  const exerciseId = session.exercises[1].exerciseId;
  session = updateSession(session, workout, { type: "prescribed", exerciseId });
  session = updateSession(session, workout, { type: "move", exerciseId, direction: -1 });
  session = updateSession(session, workout, { type: "technique", exerciseId, confirmed: true });
  assert.equal(session.exercises[0].exerciseId, exerciseId);
  assert.equal(session.exercises[0].techniqueConfirmed, true);
  assert.equal(session.exercises[0].sets[0].weight, "75");
  assert.equal(sessionCounts(session).completedSets, 3);
});

test("unknown initial weight cannot quick-complete and pending completion is explicit", () => {
  const fresh = structuredClone(workout);
  fresh.exercises[1].proposedLoadKg = null;
  const original = createSession(fresh, 1000);
  assert.equal(sessionCounts(updateSession(original, fresh, { type: "prescribed", exerciseId: "back-squat" })).completedSets, 0);
  const pending = updateSession(createSession(workout, 1000), workout, { type: "prescribed", exerciseId: "back-squat" });
  const html = renderToStaticMarkup(React.createElement(ActiveWorkout, {
    workout, session: pending, savedExercises: original.exercises, canFinish: false, onAction: noop, onFinish: noop, onBack: noop,
  }));
  assert.ok(html.includes("Completion pending save"));
  assert.ok(html.includes("disabled=\"\">Finish Workout"));
});

test("Today has an honest empty history and zero adherence", () => {
  const data = { ...getMockTodayData(new Date("2026-09-09T12:00:00Z")), lastCompletedWorkout: null, completedWorkouts: [] };
  const html = renderToStaticMarkup(React.createElement(TodayScreen, { data, onOpenWorkout: noop }));
  assert.ok(html.includes("0 sessions"));
  assert.ok(!html.includes("calendar-day trained"));
});

test("out-of-range reps and seconds warn without blocking completion", () => {
  const soleus = workouts[2].exercises.find((exercise) => exercise.id === "soleus-raise");
  const unusual = { weight: "5", amount: "1", rir: "1", touched: true, completed: false };
  assert.match(setRangeWarning(unusual, soleus), /1 reps.*10–15 reps/);
  assert.equal(validateSet(unusual, soleus), null);
  let session = createSession(workouts[2], 1000);
  session.exercises.find((log) => log.exerciseId === soleus.id).sets[0] = unusual;
  session = updateSession(session, workouts[2], { type: "complete-set", exerciseId: soleus.id, setIndex: 0 });
  assert.equal(session.exercises.find((log) => log.exerciseId === soleus.id).sets[0].completed, true);
  for (const value of ["10", "15"]) assert.equal(setRangeWarning({ ...unusual, amount: value }, soleus), null);
  assert.match(setRangeWarning({ ...unusual, amount: "16" }, soleus), /outside/);
  assert.match(setRangeWarning({ ...unusual, amount: "0" }, soleus), /outside/);
  for (const value of ["", "NaN", "-1", "1.5"]) assert.equal(setRangeWarning({ ...unusual, amount: value }, soleus), null);
  const timed = workouts[2].exercises.find((exercise) => exercise.measurement === "seconds");
  const warning = setRangeWarning(unusual, timed);
  assert.match(warning, /seconds/); assert.ok(!warning.includes("reps"));
  assert.equal(setRangeWarning(unusual, { ...soleus, measurement: "distance" }), null);
  const html = renderToStaticMarkup(React.createElement(SetInputRow, {
    exercise: soleus, set: { ...unusual, completed: true }, index: 0, onEdit: noop, onComplete: noop, onReopen: noop,
  }));
  assert.match(html, /outside the prescribed/); assert.match(html, /Edit Set/);
});

test("unfinished Nordic drafts are named before finishing and never counted as completed", () => {
  const definition = workouts[2];
  let session = createSession(definition, 1000);
  const nordic = definition.exercises.find((exercise) => exercise.id === "nordic-curl");
  session = updateSession(session, definition, { type: "edit", exerciseId: nordic.id, setIndex: 0, field: "amount", value: "1" });
  session = updateSession(session, definition, { type: "prescribed", exerciseId: definition.exercises[0].id });
  const html = renderToStaticMarkup(React.createElement(ActiveWorkout, { workout: definition, session, onAction: noop, onFinish: noop, onBack: noop }));
  assert.match(html, /Unfinished work/);
  assert.match(html, /Nordic Hamstring Curl<\/strong>: sets 1, 2 not marked complete/);
  assert.match(html, /deliberately finish as a partial workout/);
  assert.equal(finishSession(session, 61000).status, "partial");
  assert.equal(session.exercises.find((log) => log.exerciseId === nordic.id).sets[0].completed, false);
  assert.equal(session.exercises.find((log) => log.exerciseId === nordic.id).sets[1].amount, "");
});

test("first exposure and established recommendations are distinct from previous results", () => {
  const fresh = structuredClone(workout);
  fresh.exercises[1].proposedLoadKg = null;
  fresh.exercises[1].previous = "No previous performance";
  const html = renderToStaticMarkup(React.createElement(WorkoutDetail, { workout: fresh, onStart: noop, onBack: noop }));
  assert.match(html, /No established load yet/);
  assert.match(html, /Choose your starting load/);
  assert.match(html, /Current recommendation/);
  assert.match(html, /Previous performance/);
  const established = renderToStaticMarkup(React.createElement(WorkoutDetail, { workout, onStart: noop, onBack: noop }));
  assert.match(established, /Current recommendation/);
  assert.match(established, /Previous performance/);
});

test("correction mode offers explicit save and never claims to autosave or finish again", () => {
  const session = createSession(workout, 1000);
  const html = renderToStaticMarkup(React.createElement(ActiveWorkout, { workout, session, correction: true, onAction: noop, onFinish: noop, onBack: noop }));
  assert.match(html, /Save corrections/);
  assert.ok(!html.includes("Entries save automatically"));
  assert.ok(!html.includes(">Finish Workout<"));
  const completed = renderToStaticMarkup(React.createElement(WorkoutComplete, { workout, session, onToday: noop, onCorrect: noop }));
  assert.match(completed, /Edit saved workout/);
  assert.match(completed, /within seven days/);
});
