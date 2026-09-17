import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const source = fs.readFileSync(new URL("../src/lib/backend-health.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const { getHealthUrl, fetchBackendHealth } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("health URL follows the browser host for laptop and phone, or uses an explicit override", () => {
  assert.equal(getHealthUrl("http://localhost:3000"), "http://localhost:8000/health");
  assert.equal(getHealthUrl("http://192.168.1.106:3000"), "http://192.168.1.106:8000/health");
  assert.equal(getHealthUrl("http://localhost:3000", " https://api.example/ "), "https://api.example/health");
  assert.equal(getHealthUrl("http://192.168.1.106:3000", " "), "http://192.168.1.106:8000/health");
});

test("health request reads the API response and passes cancellation without credentials", async (t) => {
  const signal = new AbortController().signal;
  const fetchMock = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "http://localhost:8000/health");
    assert.equal(options.signal, signal);
    assert.equal(options.credentials, "omit");
    assert.equal(options.cache, "no-store");
    return Response.json({ status: "ok" });
  });
  assert.deepEqual(await fetchBackendHealth("http://localhost:8000/health", signal), { status: "ok" });
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("health request rejects failed HTTP responses and unexpected JSON", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
  await assert.rejects(fetchBackendHealth("http://localhost:8000/health"), /HTTP 503/);
  for (const body of [null, {}, { status: "down" }, "ok"]) {
    mock.mock.mockImplementation(async () => Response.json(body));
    await assert.rejects(fetchBackendHealth("http://localhost:8000/health"), /Unexpected health response/);
  }
});

test("health request propagates network failures for the status component to handle", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(fetchBackendHealth("http://localhost:8000/health"), /Failed to fetch/);
});
