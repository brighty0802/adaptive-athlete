"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { getBackendBaseUrl } from "@/lib/backend-health";
import { requestSet, type SavedSet } from "@/lib/set-performances";

function endpoint() {
  return `${getBackendBaseUrl(window.location.origin)}/api/set-performances`;
}

export default function PersistenceTestPage() {
  const [latest, setLatest] = useState<SavedSet | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("Loading saved set...");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    let cancelled = false;
    requestSet(`${endpoint()}/latest?exercise=back-squat`, undefined, controller.signal)
      .then((saved) => { if (!cancelled) { setLatest(saved); setMessage(saved ? "Loaded from database." : "No saved Back Squat set yet."); } })
      .catch(() => { if (!cancelled) setMessage("Could not load the saved set. Check the backend and database, then reload."); })
      .finally(() => { window.clearTimeout(timeout); if (!cancelled) setBusy(false); });
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timeout); };
  }, [attempt]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("Saving...");
    try {
      await requestSet(endpoint(), { exercise: "back-squat", weight: String(form.get("weight")), reps: Number(form.get("reps")), rir: String(form.get("rir")) }, AbortSignal.timeout(15000));
      setLatest(await requestSet(`${endpoint()}/latest?exercise=back-squat`, undefined, AbortSignal.timeout(15000)));
      setMessage("Saved and retrieved from database. Refresh to verify persistence.");
    } catch {
      setMessage("Save or retrieval could not be confirmed. Reload the latest set before retrying Save to avoid duplicates.");
    } finally { setBusy(false); }
  }

  return <main className="app-shell" style={{ padding: 24 }}>
    <Link href="/">Back to workouts</Link>
    <h1>Back Squat persistence test</h1>
    <p>This isolated test saves one set in PostgreSQL.</p>
    <form onSubmit={save} style={{ display: "grid", gap: 16, marginBlock: 24 }}>
      <label>Weight (kg) <input name="weight" type="number" min="0" max="2000" step="0.01" defaultValue="75" required /></label>
      <label>Reps <input name="reps" type="number" min="0" max="1000" step="1" defaultValue="6" required /></label>
      <label>RIR <input name="rir" type="number" min="0" max="10" step="0.1" defaultValue="2" required /></label>
      <button className="primary-button" disabled={busy}>Save set</button>
    </form>
    <p role="status">{message}</p>
    <button className="secondary-button" disabled={busy} onClick={() => { setBusy(true); setMessage("Loading saved set..."); setAttempt((value) => value + 1); }}>Reload latest set</button>
    {latest && <section style={{ marginTop: 24, overflowWrap: "anywhere" }} aria-label="Latest saved set">
      <h2>Latest saved Back Squat set</h2>
      <p>{Number(latest.weight)} kg × {latest.reps} reps @ {Number(latest.rir)} RIR</p>
      <p>Record: {latest.id}</p>
      <p>Saved: {latest.created_at}</p>
    </section>}
  </main>;
}
