import { useState } from "react";
import type { ExerciseLog, WorkoutDefinition, WorkoutSession } from "@/types/workout";
import { exerciseStatus, sessionCounts, type SessionAction } from "@/lib/workout-session";
import { ExercisePrescription, loadLabel } from "./exercise-prescription";
import { SetInputRow } from "./set-input-row";

const statusLabels = {
  not_started: "Not started", in_progress: "In progress", completed: "Completed", skipped: "Skipped",
};

export function ActiveWorkout({ workout, session, onAction, onFinish, onBack, savedExercises = session.exercises, canFinish = true, locked = false, correction = false }: {
  workout: WorkoutDefinition;
  session: WorkoutSession;
  onAction: (action: SessionAction) => void;
  onFinish: () => void;
  onBack: () => void;
  savedExercises?: ExerciseLog[];
  canFinish?: boolean;
  locked?: boolean;
  correction?: boolean;
}) {
  const [finishRequested, setFinishRequested] = useState(false);
  const [notice, setNotice] = useState("");
  const counts = sessionCounts(session);

  return (
    <div className="flow-screen">
      <button className="text-button" type="button" onClick={onBack}>{correction ? "← Back to saved workout" : "← Today · keep workout open"}</button>
      <div className="screen-heading"><p className="eyebrow">{correction ? "CORRECT SAVED WORKOUT" : "ACTIVE WORKOUT"}</p><h1>{workout.name}</h1><p>{workout.focus}</p></div>
      <div className="workout-progress panel" aria-live="polite">
        <p><strong>{counts.completedExercises} / {counts.totalExercises}</strong> exercises · <strong>{counts.completedSets} / {counts.totalSets}</strong> sets</p>
        <progress max={counts.totalSets} value={counts.completedSets} aria-label="Completed sets" />
      </div>
      <p className="preview-info">{correction
        ? "Edit sets, then mark corrected sets complete and choose Save corrections. Changes are kept on this page until you save; the workout stays in history with its original date."
        : "Open any exercise to log your sets. RIR means repetitions in reserve. Entries save automatically; wait for Saved before closing."}</p>
      <p className="action-notice" role="status">{notice}</p>
      <fieldset className="workout-editing" disabled={locked}><div className="exercise-list">
        {session.exercises.map((log, order) => {
          const exercise = workout.exercises.find((item) => item.id === log.exerciseId)!;
          const stored = savedExercises.find((item) => item.exerciseId === exercise.id);
          const pending = JSON.stringify(log) !== JSON.stringify(stored);
          const status = exerciseStatus(log);
          const completed = log.sets.filter((set) => set.completed).length;
          const untouched = log.sets.some((set) => !set.touched && !set.completed);
          return (
            <details className={`panel active-exercise status-${status}`} key={exercise.id}>
              <summary>
                <span><strong>{exercise.name}</strong><span className="exercise-progress-label">{completed} / {exercise.sets} sets</span></span>
                {completed < log.sets.length && <span className="unfinished-label">{log.sets.length - completed} {log.skipped ? "skipped" : "unfinished"}</span>}
                <span className={`status-badge status-${pending ? "in_progress" : status}`}>{pending ? "Pending save" : statusLabels[status]}</span>
              </summary>
              <div className="exercise-body">
                <div className="reorder-controls" aria-label={`Reorder ${exercise.name}`}>
                  <button className="text-button" type="button" disabled={order === 0} onClick={() => onAction({ type: "move", exerciseId: exercise.id, direction: -1 })}>↑ Move earlier</button>
                  <button className="text-button" type="button" disabled={order === session.exercises.length - 1} onClick={() => onAction({ type: "move", exerciseId: exercise.id, direction: 1 })}>↓ Move later</button>
                </div>
                <ExercisePrescription exercise={exercise} />
                <p className="previous-performance"><span>Previous performance</span>{exercise.previous}</p>
                {exercise.perSide && <p className="exercise-note">Enter the amount completed per side, rather than adding both sides together.</p>}
                {log.skipped ? (
                  <div className="skip-message">
                    <p>Remaining sets skipped. {completed} completed {completed === 1 ? "set is" : "sets are"} still included.</p>
                    <button className="secondary-button" type="button" onClick={() => onAction({ type: "resume", exerciseId: exercise.id })}>Resume Exercise</button>
                  </div>
                ) : (
                  <>
                    <div className="quick-complete">
                      <p>Quick target: {exercise.quickTarget} {exercise.measurement === "seconds" ? "sec" : "reps"}{exercise.perSide ? " each side" : ""} · {loadLabel(exercise)}{exercise.quickRir !== null ? ` · RIR ${exercise.quickRir}` : ""}</p>
                      <button className="secondary-button" type="button" disabled={!untouched || (exercise.loadKind !== "none" && exercise.proposedLoadKg === null)} onClick={() => {
                        onAction({ type: "prescribed", exerciseId: exercise.id });
                        setNotice(`${exercise.name}: untouched sets entered at the displayed target. ${correction ? "Choose Save corrections when ready." : "Saving now."} Existing entries were kept.`);
                      }}>Completed as Prescribed</button>
                      <small>Fills untouched sets only. Check any sets you have already edited.</small>
                      {exercise.loadKind !== "none" && exercise.proposedLoadKg === null && <small>Choose and enter your starting weight for each set before completing it.</small>}
                    </div>
                    {log.sets.map((set, index) => (
                      <SetInputRow key={index} exercise={exercise} set={set} index={index} pending={JSON.stringify(set) !== JSON.stringify(stored?.sets[index])}
                        onEdit={(field, value) => onAction({ type: "edit", exerciseId: exercise.id, setIndex: index, field, value })}
                        onComplete={() => onAction({ type: "complete-set", exerciseId: exercise.id, setIndex: index })}
                        onReopen={() => onAction({ type: "reopen-set", exerciseId: exercise.id, setIndex: index })} />
                    ))}
                    <label className="technique-check"><input type="checkbox" checked={log.techniqueConfirmed} onChange={(event) => onAction({ type: "technique", exerciseId: exercise.id, confirmed: event.target.checked })} /><span>I maintained controlled technique on these working sets.</span></label>
                    {status !== "completed" && <button type="button" className="text-button skip-button" onClick={() => {
                      onAction({ type: "skip", exerciseId: exercise.id });
                      setNotice(`${exercise.name}: remaining sets skipped. Completed sets kept.`);
                    }}>{completed ? "Skip Remaining Sets" : "Skip Exercise"}</button>}
                  </>
                )}
              </div>
            </details>
          );
        })}
      </div></fieldset>
      <div className="flow-actions">
        {counts.completedSets < counts.totalSets && <section className="panel sync-panel unfinished-summary" aria-label="Unfinished exercises">
          <h2>Unfinished work</h2>
          <ul>{session.exercises.filter((log) => log.sets.some((set) => !set.completed)).map((log) => <li key={log.exerciseId}>
            <strong>{workout.exercises.find((exercise) => exercise.id === log.exerciseId)!.name}</strong>: sets {log.sets.flatMap((set, index) => set.completed ? [] : [index + 1]).join(", ")} {log.skipped ? "deliberately skipped" : "not marked complete"}.
          </li>)}</ul>
          <p>{counts.completedSets ? "You can deliberately finish as a partial workout. Only completed sets count; unfinished entries stay as drafts." : "No sets are marked complete. Entering values alone does not complete a set."}</p>
        </section>}
        {correction ? <button className="start-button" type="button" disabled={!canFinish || locked} onClick={onFinish}>Save corrections</button> : finishRequested ? (
          <section className="panel finish-confirmation" aria-labelledby="finish-heading">
            <h2 id="finish-heading">{counts.completedSets === 0 ? "Finish without logged sets?" : "Finish this workout?"}</h2>
            <p>{counts.completedSets === 0 ? "This session won’t count as training or advance your rotation." : `${counts.completedSets} completed sets will be included. Uncompleted entries won’t count.`}</p>
            <div className="button-row">
              <button className="secondary-button" type="button" onClick={() => setFinishRequested(false)}>Keep Training</button>
              <button className="start-button" type="button" disabled={!canFinish || locked} onClick={onFinish}>{counts.completedSets > 0 && counts.completedSets < counts.totalSets ? "Finish partial workout" : "Confirm Finish"}</button>
            </div>
          </section>
        ) : <button className="start-button" type="button" disabled={!canFinish || locked} onClick={() => setFinishRequested(true)}>Finish Workout</button>}
        {!canFinish && !correction && <p className="exercise-note">Finish is available once every change is saved. Use Retry Save if the connection failed.</p>}
      </div>
    </div>
  );
}
