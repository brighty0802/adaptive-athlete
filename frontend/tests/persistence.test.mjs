import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import ts from "typescript";

async function load(file) {
  let source = fs.readFileSync(new URL(`../src/lib/${file}.ts`, import.meta.url), "utf8");
  if (file === "workout-api") {
    const health = fs.readFileSync(new URL("../src/lib/backend-health.ts", import.meta.url), "utf8");
    source = source.replace('import { getBackendBaseUrl } from "./backend-health";', health);
  }
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}
const { SessionSaveQueue, readDraft, DRAFT_KEY } = await load("session-save-queue");
const { workoutApi, newId, backendIsWaking, subscribeBackendWait, BACKEND_TIMEOUT_MS } = await load("workout-api");
const baseline = () => ({ id: "session-1", revision: 0, lastMutationId: null, status: "in_progress", exercises: [
  { exerciseId: "back-squat", skipped: false, techniqueConfirmed: false, sets: [{ weight: "75", amount: "", rir: "", touched: false, completed: false }] },
] });
const logs = (amount = "6") => [{ ...baseline().exercises[0], sets: [{ weight: "75", amount, rir: "2", touched: true, completed: true }] }];
function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}
const ack = (body) => ({ ...baseline(), revision: body.revision + 1, lastMutationId: body.mutationId, exercises: body.exercises });
const ids = () => { let value = 0; return () => `mutation-${++value}`; };

test("save persists draft immediately, acknowledges completion and clears backup", async () => {
  const store = storage();
  const requests = [];
  const queue = new SessionSaveQueue(baseline(), store, async (_, body) => { requests.push(body); return ack(body); }, ids(), () => {});
  queue.edit(logs());
  assert.equal(queue.view().status, "pending");
  assert.equal(queue.view().savedExercises[0].sets[0].completed, false);
  assert.equal(readDraft(store).exercises[0].sets[0].completed, true);
  await queue.flush();
  assert.equal(queue.view().status, "saved");
  assert.equal(requests.length, 1);
  assert.equal(store.getItem(DRAFT_KEY), null);
  queue.dispose();
});

test("edits during an in-flight request are coalesced into a later revision", async () => {
  let release;
  const requests = [];
  const queue = new SessionSaveQueue(baseline(), storage(), async (_, body) => {
    requests.push(body);
    if (requests.length === 1) await new Promise((resolve) => { release = resolve; });
    return ack(body);
  }, ids(), () => {});
  queue.edit(logs("5"));
  const saving = queue.flush();
  queue.edit(logs("6"));
  release(); await saving;
  assert.deepEqual(requests.map((body) => body.revision), [0, 1]);
  assert.equal(queue.view().session.exercises[0].sets[0].amount, "6");
  assert.equal(queue.view().status, "saved"); queue.dispose();
});

test("ambiguous network failure retries original UUID before newer edits", async () => {
  const requests = [];
  const queue = new SessionSaveQueue(baseline(), storage(), async (_, body) => {
    requests.push(body);
    if (requests.length === 1) throw new Error("Offline");
    return ack(body);
  }, ids(), () => {});
  queue.edit(logs("5")); await queue.flush();
  assert.equal(queue.view().status, "error");
  queue.edit(logs("6")); await queue.flush();
  assert.deepEqual(requests[0], requests[1]);
  assert.notEqual(requests[1].mutationId, requests[2].mutationId);
  assert.equal(queue.view().status, "saved"); queue.dispose();
});

test("definitive validation rejection permits corrected values on Retry", async () => {
  const requests = [];
  const queue = new SessionSaveQueue(baseline(), storage(), async (_, body) => {
    requests.push(body);
    if (requests.length === 1) throw Object.assign(new Error("Invalid"), { status: 422 });
    return ack(body);
  }, ids(), () => {});
  queue.edit(logs("wrong")); await queue.flush();
  queue.edit(logs("6")); await queue.flush();
  assert.equal(requests[1].exercises[0].sets[0].amount, "6");
  assert.notEqual(requests[0].mutationId, requests[1].mutationId);
  assert.equal(queue.view().status, "saved"); queue.dispose();
});

test("refresh recovers pending request and clears already acknowledged draft", async () => {
  const store = storage();
  const first = new SessionSaveQueue(baseline(), store, async () => { throw new Error("Lost response"); }, ids(), () => {});
  first.edit(logs()); await first.flush(); first.dispose();
  const draft = readDraft(store);
  const recovered = new SessionSaveQueue(ack(draft.pending), store, async () => { throw new Error("Should not save again"); }, ids(), () => {}, draft);
  assert.equal(recovered.view().status, "saved");
  assert.equal(store.getItem(DRAFT_KEY), null); recovered.dispose();
});

test("stale revision preserves draft and prevents overwrite", async () => {
  const store = storage();
  let calls = 0;
  const queue = new SessionSaveQueue(baseline(), store, async () => { calls++; throw Object.assign(new Error("Conflict"), { status: 409 }); }, ids(), () => {});
  queue.edit(logs()); await queue.flush(); await queue.flush();
  assert.equal(queue.view().status, "conflict"); assert.equal(calls, 1);
  assert.equal(readDraft(store).exercises[0].sets[0].amount, "6"); queue.dispose();
});

test("storage failure is reported without losing in-memory edits", async () => {
  const store = storage(); store.setItem = () => { throw new Error("Quota"); };
  const queue = new SessionSaveQueue(baseline(), store, async (_, body) => ack(body), ids(), () => {});
  queue.edit(logs()); assert.equal(queue.view().backupWarning, true);
  assert.equal(queue.view().session.exercises[0].sets[0].amount, "6");
  await queue.flush(); assert.equal(queue.view().status, "saved"); queue.dispose();
});

test("API calls preserve phone host, methods, JSON and no-cache boundary", async (t) => {
  globalThis.window = { location: { origin: "http://192.168.1.106:3000" } };
  t.after(() => { delete globalThis.window; });
  const previous = process.env.NEXT_PUBLIC_API_BASE_URL;
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
  t.after(() => { if (previous === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL; else process.env.NEXT_PUBLIC_API_BASE_URL = previous; });
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => { calls.push([url, options]); return Response.json(baseline()); });
  await workoutApi.today(); await workoutApi.start("id", "session-a");
  await workoutApi.save("id", { revision: 0, mutationId: "m", exercises: logs() });
  await workoutApi.finish("id", 1, "finish"); await workoutApi.history();
  assert.deepEqual(calls.map(([, options]) => options.method), ["GET", "POST", "PUT", "POST", "GET"]);
  for (const [url, options] of calls) {
    assert.ok(url.startsWith("http://192.168.1.106:8000/api/"));
    assert.equal(options.cache, "no-store"); assert.equal(options.credentials, "omit");
  }
  assert.equal(JSON.parse(calls[2][1].body).exercises[0].sets[0].amount, "6");
});

test("API reports conflict, validation and offline errors without server details", async (t) => {
  globalThis.window = { location: { origin: "http://localhost:3000" } };
  t.after(() => { delete globalThis.window; });
  const mock = t.mock.method(globalThis, "fetch", async () => new Response("private details", { status: 409 }));
  await assert.rejects(workoutApi.today(), (error) => error.status === 409 && !error.message.includes("private"));
  mock.mock.mockImplementation(async () => new Response(null, { status: 422 }));
  await assert.rejects(workoutApi.today(), (error) => error.status === 422);
  mock.mock.mockImplementation(async () => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(workoutApi.today(), /Could not reach the backend/);
  assert.match(newId(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("cold starts show waiting state and remain live beyond the former 12-second timeout", async (t) => {
  globalThis.window = { location: { origin: "http://localhost:3000" } };
  t.after(() => { delete globalThis.window; });
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let respond, signal;
  const states = [];
  const unsubscribe = subscribeBackendWait(() => states.push(backendIsWaking()));
  t.after(unsubscribe);
  t.mock.method(globalThis, "fetch", (_, options) => { signal = options.signal; return new Promise((resolve) => { respond = resolve; }); });
  const request = workoutApi.today();
  t.mock.timers.tick(4000);
  assert.equal(backendIsWaking(), true);
  t.mock.timers.tick(61000);
  assert.equal(signal.aborted, false);
  respond(Response.json({ ready: true }));
  assert.deepEqual(await request, { ready: true });
  assert.equal(backendIsWaking(), false);
  assert.deepEqual(states, [true, false]);
});

test("cold-start deadline cleans up and allows an explicit retry", async (t) => {
  globalThis.window = { location: { origin: "http://localhost:3000" } };
  t.after(() => { delete globalThis.window; });
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const mock = t.mock.method(globalThis, "fetch", (_, options) => new Promise((_, reject) => {
    options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  }));
  const request = workoutApi.history();
  const failed = assert.rejects(request, /may still be waking up/);
  t.mock.timers.tick(BACKEND_TIMEOUT_MS);
  await failed;
  assert.equal(backendIsWaking(), false);
  mock.mock.mockImplementation(async () => Response.json([]));
  assert.deepEqual(await workoutApi.history(), []);
});

test("temporary gateway errors retry reads but never automatically replay corrections", async (t) => {
  globalThis.window = { location: { origin: "http://localhost:3000" } };
  t.after(() => { delete globalThis.window; });
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let calls = 0;
  const mock = t.mock.method(globalThis, "fetch", async () => ++calls === 1 ? new Response(null, { status: 503 }) : Response.json([]));
  const request = workoutApi.history();
  await Promise.resolve();
  t.mock.timers.tick(1500);
  assert.deepEqual(await request, []);
  assert.equal(calls, 2);
  const writes = [];
  mock.mock.mockImplementation(async (url, options) => { writes.push([url, options]); return new Response(null, { status: 503 }); });
  const correction = { revision: 4, mutationId: "same-mutation", exercises: logs() };
  await assert.rejects(workoutApi.correct("session-1", correction), (error) => error.status === 503);
  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], "http://localhost:8000/api/sessions/session-1/correction");
  assert.equal(writes[0][1].method, "PUT");
  assert.deepEqual(JSON.parse(writes[0][1].body), correction);
});
