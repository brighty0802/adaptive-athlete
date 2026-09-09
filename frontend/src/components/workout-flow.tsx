"use client";

import { useEffect, useRef, useState } from "react";
import type { TodayData, WorkoutDefinition, WorkoutId, WorkoutScreen, WorkoutSession } from "@/types/workout";
import { createSession, finishSession, updateSession, type SessionAction } from "@/lib/workout-session";
import { TodayScreen } from "./today-screen";
import { WorkoutDetail } from "./workout-detail";
import { ActiveWorkout } from "./active-workout";
import { WorkoutComplete } from "./workout-complete";
import { BottomNavigation } from "./bottom-navigation";
import { Icon } from "./icon";

export function WorkoutFlow({ initialData, workouts }: { initialData: TodayData; workouts: readonly WorkoutDefinition[] }) {
  const [today, setToday] = useState(initialData);
  const [screen, setScreen] = useState<WorkoutScreen>({ kind: "today" });
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const hasNavigated = useRef(false);
  const active = session?.status === "in_progress";
  const currentWorkout = session ? workouts.find((workout) => workout.id === session.workoutId) : undefined;

  useEffect(() => {
    if (hasNavigated.current) {
      mainRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    hasNavigated.current = true;
  }, [screen]);

  function openToday() { setScreen({ kind: "today" }); }
  function openDetail(workoutId: WorkoutId) { setScreen({ kind: "detail", workoutId }); }

  function start(workout: WorkoutDefinition) {
    if (active && session.workoutId !== workout.id) return;
    if (!active) setSession(createSession(workout, Date.now()));
    setScreen({ kind: "active" });
  }

  function act(action: SessionAction) {
    setSession((current) => current && currentWorkout ? updateSession(current, currentWorkout, action) : current);
  }

  function finish() {
    if (!session || !active) return;
    const finished = finishSession(session, Date.now());
    setSession(finished);
    if (finished.status === "completed" || finished.status === "partial") {
      const workoutIndex = workouts.findIndex((workout) => workout.id === finished.workoutId);
      const completed = {
        workoutId: finished.workoutId,
        date: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(finished.startedAt)),
        durationMinutes: Math.max(0, Math.round(((finished.finishedAt ?? finished.startedAt) - finished.startedAt) / 60000)),
        status: finished.status,
      };
      setToday((current) => ({
        ...current,
        recommendedWorkoutId: workouts[(workoutIndex + 1) % workouts.length].id,
        lastCompletedWorkout: completed,
        completedWorkouts: [completed, ...current.completedWorkouts],
      }));
    }
    setScreen({ kind: "complete" });
  }

  const detail = screen.kind === "detail" ? workouts.find((workout) => workout.id === screen.workoutId) : undefined;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="brand-header">
        <button type="button" onClick={openToday} className="brand brand-button" aria-label="Adaptive Athlete home">
          <Icon name="brand" /><span>ADAPTIVE<span>ATHLETE</span></span>
        </button>
        <span className="demo-badge">Preview</span>
      </header>
      <main id="main" tabIndex={-1} ref={mainRef}>
        {active && screen.kind !== "active" && (
          <div className="resume-banner panel">
            <p><strong>{currentWorkout?.name}</strong> is in progress. Your entries are still here.</p>
            <button className="secondary-button" type="button" onClick={() => setScreen({ kind: "active" })}>Resume Workout</button>
          </div>
        )}
        {screen.kind === "today" && <TodayScreen data={today} onOpenWorkout={openDetail} />}
        {detail && <WorkoutDetail workout={detail} onStart={() => start(detail)} onBack={openToday}
          isResuming={Boolean(active && session.workoutId === detail.id)}
          otherSessionActive={Boolean(active && session.workoutId !== detail.id)} />}
        {screen.kind === "active" && session && currentWorkout && (
          <ActiveWorkout workout={currentWorkout} session={session} onAction={act} onFinish={finish} onBack={openToday} />
        )}
        {screen.kind === "complete" && session && currentWorkout && (
          <WorkoutComplete workout={currentWorkout} session={session} onToday={openToday} />
        )}
      </main>
      <BottomNavigation onToday={openToday} isToday={screen.kind === "today"} />
    </div>
  );
}
