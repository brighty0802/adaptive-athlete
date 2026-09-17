import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const source = fs.readFileSync(new URL("../src/lib/set-performances.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { requestSet } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const saved = { id: "test-id", exercise: "back-squat", weight: "75.00", reps: 6, rir: "2.0", created_at: "2026-09-17T10:00:00Z" };

test("save sends JSON and reload reads without caching or credentials", async (t) => {
  const values = { exercise: "back-squat", weight: "75", reps: 6, rir: "2" };
  const mock = t.mock.method(globalThis, "fetch", async (_, options) => {
    assert.equal(options.cache, "no-store");
    assert.equal(options.credentials, "omit");
    if (options.method === "POST") assert.deepEqual(JSON.parse(options.body), values);
    return Response.json(saved);
  });
  assert.deepEqual(await requestSet("/sets", values), saved);
  assert.deepEqual(await requestSet("/sets/latest"), saved);
  assert.equal(mock.mock.callCount(), 2);
});

test("missing latest is empty; failed saves and invalid responses are errors", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 404 }));
  assert.equal(await requestSet("/sets/latest"), null);
  await assert.rejects(requestSet("/sets", {}), /HTTP 404/);
  mock.mock.mockImplementation(async () => new Response(null, { status: 503 }));
  await assert.rejects(requestSet("/sets/latest"), /HTTP 503/);
  mock.mock.mockImplementation(async () => Response.json({}));
  await assert.rejects(requestSet("/sets/latest"), /Unexpected/);
  mock.mock.mockImplementation(async () => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(requestSet("/sets/latest"), /Failed to fetch/);
});
