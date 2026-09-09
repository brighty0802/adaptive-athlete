import { useState } from "react";
import type { WorkoutDefinition, WorkoutSession } from "@/types/workout";
import { exerciseStatus, sessionCounts, type SessionAction } from "@/lib/workout-session";
import { ExercisePrescription, loadLabel } from "./exercise-prescription";
import { SetInputRow } from "./set-input-row";

const statusLabels = {
  not_started: "Not started", in_progress: "In progress", completed: "Completed", skipped: "Skipped",
};

export function ActiveWorkout({ workout, session, onAction, onFinish, onBack }: {
  workout: WorkoutDefinition;
  session: WorkoutSession;
  onAction: (action: SessionAction) => void;
  onFinish: () => void;
  onBack: () => void;
}) {
  const [finishRequested, setFinishRequested] = useState(false);
  const [notice, setNotice] = useState("");
  const counts = sessionCounts(session);

  return (
    <div className="flow-screen">
      <button className="text-button" type="button" onClick={onBack}>← Today · keep workout open</button>
      <div className="screen-heading"><p className="eyebrow">ACTIVE WORKOUT</p><h1>{workout.name}</h1><p>{workout.focus}</p></div>
      <div className="workout-progress panel" aria-live="polite">
        <p><strong>{counts.completedExercises} / {counts.totalExercises}</strong> exercises · <strong>{counts.completedSets} / {counts.totalSets}</strong> sets</p>
        <progress max={counts.totalSets} value={counts.completedSets} aria-label="Completed sets" />
      </div>
      <p className="preview-info">Open any exercise to log your sets. RIR means repetitions in reserve. Refreshing clears this workout.</p>
      <p className="action-notice" role="status">{notice}</p>
      <div className="exercise-list">
        {workout.exercises.map((exercise) => {
          const log = session.exercises.find((item) => item.exerciseId === exercise.id)!;
          const status = exerciseStatus(log);
          const completed = log.sets.filter((set) => set.completed).length;
          const untouched = log.sets.some((set) => !set.touched && !set.completed);
          return (
            <details className={`panel active-exercise status-${status}`} key={exercise.id}>
              <summary>
                <span><strong>{exercise.name}</strong><span className="exercise-progress-label">{completed} / {exercise.sets} sets</span></span>
                <span className={`status-badge status-${status}`}>{statusLabels[status]}</span>
              </summary>
              <div className="exercise-body">
                <ExercisePrescription exercise={exercise} />
                <p className="previous-performance"><span>Previous · sample</span>{exercise.previous}</p>
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
                      <button className="secondary-button" type="button" disabled={!untouched} onClick={() => {
                        onAction({ type: "prescribed", exerciseId: exercise.id });
                        setNotice(`${exercise.name}: untouched sets completed at the displayed target. Existing entries were kept.`);
                      }}>Completed as Prescribed</button>
                      <small>Fills untouched sets only. Check any sets you have already edited.</small>
                    </div>
                    {log.sets.map((set, index) => (
                      <SetInputRow key={index} exercise={exercise} set={set} index={index}
                        onEdit={(field, value) => onAction({ type: "edit", exerciseId: exercise.id, setIndex: index, field, value })}
                        onComplete={() => onAction({ type: "complete-set", exerciseId: exercise.id, setIndex: index })}
                        onReopen={() => onAction({ type: "reopen-set", exerciseId: exercise.id, setIndex: index })} />
                    ))}
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
      </div>
      <div className="flow-actions">
        {finishRequested ? (
          <section className="panel finish-confirmation" aria-labelledby="finish-heading">
            <h2 id="finish-heading">{counts.completedSets === 0 ? "Finish without logged sets?" : "Finish this workout?"}</h2>
            <p>{counts.completedSets === 0 ? "This session won’t count as training or advance your rotation." : `${counts.completedSets} completed sets will be included. Uncompleted entries won’t count.`}</p>
            <div className="button-row">
              <button className="secondary-button" type="button" onClick={() => setFinishRequested(false)}>Keep Training</button>
              <button className="start-button" type="button" onClick={onFinish}>Confirm Finish</button>
            </div>
          </section>
        ) : <button className="start-button" type="button" onClick={() => setFinishRequested(true)}>Finish Workout</button>}
      </div>
    </div>
  );
}
