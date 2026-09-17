import type { WorkoutDefinition, WorkoutSession } from "@/types/workout";
import { exerciseStatus, sessionCounts } from "@/lib/workout-session";
import { Icon } from "./icon";

export function WorkoutComplete({ workout, session, onToday, backLabel = "Back to Today" }: {
  workout: WorkoutDefinition; session: WorkoutSession & { feedback?: Record<string, string> }; onToday: () => void; backLabel?: string;
}) {
  const counts = sessionCounts(session);
  const minutes = Math.max(0, Math.round(((session.finishedAt ?? session.startedAt) - session.startedAt) / 60000));
  return (
    <div className="flow-screen">
      <div className="completion-heading">
        <span className="completion-icon"><Icon name="check" /></span>
        <p className="eyebrow">{workout.name} · {workout.focus}</p>
        <h1>{session.status === "cancelled" ? "Workout ended" : session.status === "partial" ? "Partial workout complete" : "Workout complete!"}</h1>
        <p>{session.status === "cancelled" ? "No completed sets. Your rotation hasn’t changed." : "Your completed work is saved in your training history."}</p>
      </div>
      <dl className="completion-stats panel">
        <div><dt>Exercises completed</dt><dd>{counts.completedExercises}<small> / {counts.totalExercises}</small></dd></div>
        <div><dt>Sets completed</dt><dd>{counts.completedSets}<small> / {counts.totalSets}</small></dd></div>
        <div><dt>Minutes</dt><dd>{minutes < 1 ? "<1" : minutes}</dd></div>
      </dl>
      <section aria-labelledby="completed-work-heading">
        <h2 id="completed-work-heading" className="section-title">Your completed work</h2>
        <ul className="exercise-list">
          {workout.exercises.map((exercise) => {
            const log = session.exercises.find((item) => item.exerciseId === exercise.id)!;
            const completed = log.sets.filter((set) => set.completed);
            const status = exerciseStatus(log);
            return (
              <li className="panel summary-exercise" key={exercise.id}>
                <h3>{exercise.name}</h3>
                <p>{completed.length} / {exercise.sets} sets · {status === "completed" ? "Completed" : status === "skipped" ? "Remaining work skipped" : completed.length ? "Partially completed" : "Not completed"}</p>
                {completed.length > 0 && <ul className="logged-set-list">{log.sets.map((set, index) => set.completed && (
                  <li key={index}>
                    Set {index + 1}: {exercise.loadKind === "none" ? "Bodyweight" : `${set.weight} kg${exercise.loadKind === "per-hand" ? " / hand" : exercise.loadKind === "added" ? " added" : " total"}`} × {set.amount} {exercise.measurement === "seconds" ? "sec" : "reps"}{exercise.perSide ? " / side" : ""}{exercise.targetRir ? ` · RIR ${set.rir}` : ""}
                  </li>
                ))}</ul>}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="panel mock-feedback" aria-labelledby="feedback-heading">
        <p className="eyebrow">NEXT EXPOSURE</p>
        <h2 id="feedback-heading">Looking ahead</h2>
        <p>Recommendations use your recorded sets, RIR and technique confirmation.</p>
        {workout.exercises.filter((exercise) => {
          const log = session.exercises.find((item) => item.exerciseId === exercise.id)!;
          return exerciseStatus(log) === "completed";
        }).map((exercise) => <div key={exercise.id}><h3>{exercise.name}</h3><p>{session.feedback?.[exercise.id] ?? "No progression assessment available."}</p></div>)}
        {counts.completedExercises === 0 && <p>No fully completed exercises. Partial work is shown above; skipped work is not a performance failure.</p>}
      </section>
      <p className="preview-info">Saved workouts remain available after refreshing or restarting the backend.</p>
      <button type="button" className="start-button" onClick={onToday}>{backLabel}<Icon name="arrow" /></button>
    </div>
  );
}
