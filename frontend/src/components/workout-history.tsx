import { useEffect, useState } from "react";
import type { PersistedSession } from "@/types/workout";
import { workoutApi } from "@/lib/workout-api";
import { sessionCounts } from "@/lib/workout-session";

export function WorkoutHistory({ onOpen }: { onOpen: (session: PersistedSession) => void }) {
  const [sessions, setSessions] = useState<PersistedSession[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    workoutApi.history().then((result) => { if (!cancelled) { setSessions(result); setError(""); } })
      .catch((failure: unknown) => { if (!cancelled) setError(failure instanceof Error ? failure.message : "Could not load history."); });
    return () => { cancelled = true; };
  }, [attempt]);
  return <div className="flow-screen"><div className="screen-heading"><p className="eyebrow">YOUR TRAINING</p><h1>Workout history</h1><p>Saved sessions and next-exposure feedback.</p></div>
    {error && <div className="panel sync-panel" role="alert"><p>{error}</p><button className="secondary-button" onClick={() => setAttempt((value) => value + 1)}>Retry History</button></div>}
    {!sessions && !error && <p role="status">Loading history…</p>}
    {sessions?.length === 0 && <p className="preview-info">No finished workouts yet. Your first session will appear here when you finish it.</p>}
    <ul className="exercise-list">{sessions?.map((session) => <li key={session.id}>
      <button className="panel history-card" type="button" onClick={() => onOpen(session)}>
        <strong>{session.workout.name}</strong>
        <span>{new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" }).format(session.startedAt)}</span>
        <span>{session.status === "cancelled" ? "Ended without completed sets" : session.status === "partial" ? "Partial workout" : "Completed workout"} · {sessionCounts(session).completedSets} sets</span>
        <span>View recorded sets and feedback →</span>
      </button>
    </li>)}</ul>
  </div>;
}
