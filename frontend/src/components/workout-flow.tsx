"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PersistedSession, TodayResponse, WorkoutDefinition, WorkoutId, WorkoutScreen } from "@/types/workout";
import { updateSession, type SessionAction } from "@/lib/workout-session";
import { newId, workoutApi } from "@/lib/workout-api";
import { DRAFT_KEY, readDraft, SessionSaveQueue, type SaveView } from "@/lib/session-save-queue";
import { TodayScreen } from "./today-screen";
import { WorkoutDetail } from "./workout-detail";
import { ActiveWorkout } from "./active-workout";
import { WorkoutComplete } from "./workout-complete";
import { WorkoutHistory } from "./workout-history";
import { BottomNavigation } from "./bottom-navigation";
import { Icon } from "./icon";
import { BackendStatus } from "./backend-status";

const START_KEY = "adaptive-athlete.pending-start.v1";
const message = (error: unknown) => error instanceof Error ? error.message : "Could not load your workout. Please retry.";

export function WorkoutFlow() {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [screen, setScreen] = useState<WorkoutScreen>({ kind: "today" });
  const [saveView, setSaveView] = useState<SaveView | null>(null);
  const [finished, setFinished] = useState<PersistedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [finishError, setFinishError] = useState("");
  const [finishing, setFinishing] = useState(false);
  const queue = useRef<SessionSaveQueue | null>(null);
  const startRequest = useRef<{ id: string; workoutId: WorkoutId } | null>(null);
  const finishMutation = useRef<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const hasNavigated = useRef(false);
  const session = saveView?.session ?? finished;
  const active = session?.status === "in_progress";

  const attachSession = useCallback((remote: PersistedSession) => {
    queue.current?.dispose();
    const draft = readDraft(window.localStorage);
    const next = new SessionSaveQueue(remote, window.localStorage, workoutApi.save, newId, setSaveView, draft);
    queue.current = next;
    setSaveView(next.view());
    if (next.view().status === "pending") void next.flush();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await workoutApi.today();
        if (cancelled) return;
        setData(response);
        try {
          const draft = readDraft(window.localStorage);
          if (draft && draft.sessionId !== response.activeSession?.id) {
            setRecoveryError("This browser has an unsaved draft for a workout that is no longer active. Download it before choosing the saved version.");
          } else if (response.activeSession) attachSession(response.activeSession);
        } catch {
          setRecoveryError("The browser draft could not be read. Download it if available, then discard it to load the saved workout.");
        }
      } catch (failure) { if (!cancelled) setError(message(failure)); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; queue.current?.dispose(); };
  }, [attachSession]);

  useEffect(() => {
    if (hasNavigated.current) {
      mainRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    hasNavigated.current = true;
  }, [screen]);

  useEffect(() => {
    const preventLoss = (event: BeforeUnloadEvent) => {
      if ((queue.current && queue.current.view().status !== "saved") || finishMutation.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, []);

  async function refreshToday() {
    try { setData(await workoutApi.today()); setError(""); }
    catch (failure) { setError(message(failure)); }
  }
  function openToday() { setScreen({ kind: "today" }); void refreshToday(); }
  function openDetail(workoutId: WorkoutId) { setScreen({ kind: "detail", workoutId }); }

  async function start(workout: WorkoutDefinition) {
    if (busy || recoveryError) return;
    if (active) { if (session.workoutId === workout.id) setScreen({ kind: "active" }); return; }
    setBusy(true); setError("");
    try {
      const previous = window.localStorage.getItem(START_KEY);
      if (!startRequest.current && previous) startRequest.current = JSON.parse(previous);
      if (!startRequest.current || startRequest.current.workoutId !== workout.id) {
        startRequest.current = { id: newId(), workoutId: workout.id };
        window.localStorage.setItem(START_KEY, JSON.stringify(startRequest.current));
      }
      const remote = await workoutApi.start(startRequest.current.id, workout.id);
      window.localStorage.removeItem(START_KEY);
      startRequest.current = null;
      setFinished(null);
      if (remote.status === "in_progress") { attachSession(remote); setScreen({ kind: "active" }); }
      else { setFinished(remote); setScreen({ kind: "complete" }); }
    } catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  }

  function act(action: SessionAction) {
    const current = queue.current?.view();
    if (!current || finishing || finishMutation.current || current.status === "conflict") return;
    const next = updateSession(current.session, current.session.workout, action);
    queue.current?.edit(next.exercises);
  }

  async function finish() {
    const current = queue.current?.view();
    if (!current || current.status !== "saved" || finishing) return;
    setFinishing(true); setFinishError("");
    finishMutation.current ??= newId();
    try {
      const remote = await workoutApi.finish(current.session.id, current.session.revision, finishMutation.current);
      queue.current?.dispose(); queue.current = null;
      setSaveView(null); setFinished(remote); setScreen({ kind: "complete" });
      finishMutation.current = null;
      await refreshToday();
    } catch (failure) { setFinishError(message(failure)); }
    finally { setFinishing(false); }
  }

  function downloadDraft() {
    let raw: string | null;
    try { raw = window.localStorage.getItem(DRAFT_KEY); }
    catch { setRecoveryError("Browser storage is unavailable. Enable site storage, then reload to recover your draft."); return; }
    if (!raw) return;
    const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "adaptive-athlete-unsaved-workout.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function useSavedVersion() {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
      window.localStorage.removeItem(START_KEY);
    } catch { setRecoveryError("Browser storage is unavailable. Enable site storage before continuing."); return; }
    window.location.reload();
  }

  const detail = screen.kind === "detail" ? data?.workouts.find((workout) => workout.id === screen.workoutId) : undefined;
  const conflict = recoveryError || (saveView?.status === "conflict" ? saveView.error : "");
  const historySelected = screen.kind === "history" || screen.kind === "history-detail";

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="brand-header">
        <button type="button" onClick={openToday} className="brand brand-button" aria-label="Adaptive Athlete home">
          <Icon name="brand" /><span>ADAPTIVE<span>ATHLETE</span></span>
        </button>
        <span className="demo-badge">Training log</span>
      </header>
      <main id="main" tabIndex={-1} ref={mainRef}>
        {loading && <p className="preview-info" role="status">Loading your workouts…</p>}
        {error && <section className="panel sync-panel" role="alert"><p>{error}</p>
          <button className="secondary-button" onClick={() => window.location.reload()}>Reload saved workouts</button></section>}
        {conflict && <section className="panel sync-panel sync-error" role="alert"><p>{conflict}</p><div className="button-row">
          <button className="secondary-button" onClick={downloadDraft}>Download browser draft</button>
          <button className="secondary-button" onClick={useSavedVersion}>Discard draft and use saved version</button>
        </div></section>}
        {active && saveView && <section className={`panel sync-panel ${saveView.status === "error" ? "sync-error" : ""}`} aria-live="polite">
          <p><strong>{saveView.status === "saved" ? "Saved" : saveView.status === "saving" ? "Saving…" : saveView.status === "pending" ? "Changes waiting to save…" : saveView.status === "conflict" ? "Save conflict" : "Not saved"}</strong>
            {saveView.status === "saved" ? " · Your workout is stored." : saveView.status === "pending" || saveView.status === "saving" ? " Keep this page open until Saved appears." : " · Completed marks are pending until saved."}</p>
          {saveView.status === "error" && <><p>{saveView.error}</p><button className="secondary-button" onClick={() => void queue.current?.flush()}>Retry Save</button></>}
          {saveView.backupWarning && <p className="input-error">Browser draft backup is unavailable. Keep this page open until Saved appears.</p>}
        </section>}
        {active && screen.kind !== "active" && <div className="resume-banner panel">
          <p><strong>{session.workout.name}</strong> is in progress. Your entries are still here.</p>
          <button className="secondary-button" type="button" onClick={() => setScreen({ kind: "active" })}>Resume Workout</button>
        </div>}
        {screen.kind === "today" && data && <TodayScreen data={data.today} onOpenWorkout={openDetail} />}
        {detail && <WorkoutDetail workout={detail} onStart={() => void start(detail)} onBack={openToday}
          isResuming={Boolean(active && session.workoutId === detail.id)}
          otherSessionActive={Boolean((active && session.workoutId !== detail.id) || busy || recoveryError)} />}
        {screen.kind === "active" && active && session && saveView && <>
          {finishError && <section className="panel sync-panel sync-error" role="alert"><p>Finish was not confirmed. {finishError}</p>
            <button className="secondary-button" disabled={finishing} onClick={() => void finish()}>Retry Finish</button>
            <button className="text-button" onClick={() => window.location.reload()}>Reload saved workout</button></section>}
          <ActiveWorkout workout={session.workout} session={session} savedExercises={saveView.savedExercises}
            canFinish={saveView.status === "saved" && !finishing && !finishError} locked={Boolean(finishing || finishError || conflict)}
            onAction={act} onFinish={() => void finish()} onBack={openToday} />
        </>}
        {screen.kind === "complete" && finished && <WorkoutComplete workout={finished.workout} session={finished} onToday={openToday} />}
        {screen.kind === "history" && <WorkoutHistory onOpen={(selected) => setScreen({ kind: "history-detail", session: selected })} />}
        {screen.kind === "history-detail" && <WorkoutComplete workout={screen.session.workout} session={screen.session}
          onToday={() => setScreen({ kind: "history" })} backLabel="Back to History" />}
      </main>
      <BackendStatus />
      <BottomNavigation onToday={openToday} isToday={screen.kind === "today"} onHistory={() => setScreen({ kind: "history" })} isHistory={historySelected} />
    </div>
  );
}
