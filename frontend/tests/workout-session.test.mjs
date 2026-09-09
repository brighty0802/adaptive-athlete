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
const { createSession, updateSession, finishSession, sessionCounts, validateSet } = load(path.join(root, "lib/workout-session"));
const { WorkoutDetail } = load(path.join(root, "components/workout-detail"));
const { ActiveWorkout } = load(path.join(root, "components/active-workout"));
const { WorkoutComplete } = load(path.join(root, "components/workout-complete"));
const { getMockTodayData } = load(path.join(root, "data/mock-today"));
const { WorkoutFlow } = load(path.join(root, "components/workout-flow"));
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
    assert.ok(html.includes("Proposed load"));
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
    workout: item, session, onAction: noop, onFinish: noop, onBack: noop,
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
  const html = renderToStaticMarkup(React.createElement(WorkoutComplete, { workout, session: partial, onToday: noop }));
  assert.ok(html.includes("Partial workout complete"));
  assert.ok(html.includes("MOCK FEEDBACK"));
  assert.ok(html.includes("not calculated from your entries"));
  assert.ok(html.includes("Set 1:"));
});

test("Today still renders four details buttons and a mocked recommendation", () => {
  const html = renderToStaticMarkup(React.createElement(WorkoutFlow, {
    initialData: getMockTodayData(new Date("2026-09-09T12:00:00Z")), workouts,
  }));
  assert.equal((html.match(/class="workout-card /g) || []).length, 4);
  for (const item of workouts) assert.ok(html.includes(`View ${item.name}`));
  assert.ok(html.includes("View Workout"));
});
