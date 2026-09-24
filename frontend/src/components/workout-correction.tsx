"use client";

import { useEffect, useRef, useState } from "react";
import type { PersistedSession, WorkoutSession } from "@/types/workout";
import { sessionCounts, updateSession, type SessionAction } from "@/lib/workout-session";
import { ApiError, newId, workoutApi, type SaveMutation } from "@/lib/workout-api";
import { ActiveWorkout } from "./active-workout";

export function WorkoutCorrection({ original, onSaved, onCancel }: {
  original: PersistedSession; onSaved: (session: PersistedSession) => void; onCancel: () => void;
}) {
  // Only this local editor is editable. No server-side reopen or extra session.
  const [draft, setDraft] = useState<WorkoutSession>({ ...original, status: "in_progress" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [retryRequired, setRetryRequired] = useState(false);
  const pending = useRef<SaveMutation | null>(null);
  const inFlight = useRef(false);
  const dirty = JSON.stringify(draft.exercises) !== JSON.stringify(original.exercises);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty || pending.current) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function cancel() {
    if (inFlight.current) return;
    if ((dirty || pending.current) && !window.confirm("Leave these corrections? Unsaved changes on this page will be lost. If a response was lost, history will show the last confirmed server version.")) return;
    onCancel();
  }
  function act(action: SessionAction) {
    if (inFlight.current || pending.current || conflict) return;
    setDraft((current) => updateSession(current, original.workout, action));
    setError("");
  }
  async function save() {
    if (inFlight.current || conflict) return;
    inFlight.current = true; setSaving(true); setError("");
    pending.current ??= { revision: original.revision, mutationId: newId(), exercises: draft.exercises };
    try {
      const saved = await workoutApi.correct(original.id, pending.current);
      pending.current = null;
      onSaved(saved);
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 422) pending.current = null;
      if (failure instanceof ApiError && failure.status === 409) setConflict(true);
      setRetryRequired(pending.current !== null);
      setError(failure instanceof Error ? failure.message : "Correction was not confirmed. Please retry.");
    } finally { inFlight.current = false; setSaving(false); }
  }
  return <>
    <section className="panel sync-panel" aria-live="polite">
      <p>{saving ? "Saving corrections…" : "Corrections save together when you choose Save corrections. Keep this page open until confirmed."}</p>
      {error && <><p role="alert">{error}</p>
        {!conflict && <button className="secondary-button" disabled={saving} onClick={() => void save()}>Retry corrections</button>}
        <button className="text-button" disabled={saving} onClick={cancel}>Return to saved history</button>
      </>}
      {sessionCounts(draft).completedSets === 0 && <p role="alert">Keep at least one set completed. Corrections cannot remove a workout from your rotation.</p>}
    </section>
    <ActiveWorkout workout={original.workout} session={draft} savedExercises={original.exercises} correction
      onAction={act} onBack={cancel} onFinish={() => void save()}
      locked={saving || conflict || retryRequired}
      canFinish={dirty && !saving && !conflict && sessionCounts(draft).completedSets > 0} />
  </>;
}
