import type { WorkoutDefinition } from "@/types/workout";
import { ExercisePrescription } from "./exercise-prescription";
import { Icon } from "./icon";

export function WorkoutDetail({ workout, onStart, onBack, isResuming, otherSessionActive }: {
  workout: WorkoutDefinition;
  onStart: () => void;
  onBack: () => void;
  isResuming: boolean;
  otherSessionActive: boolean;
}) {
  return (
    <div className="flow-screen">
      <button className="text-button" type="button" onClick={onBack}>← Back to Today</button>
      <div className="screen-heading">
        <p className="eyebrow">YOUR WORKOUT</p>
        <h1>{workout.name}</h1>
        <p>{workout.focus}</p>
        <div className="hero-meta"><span><Icon name="clock" />~{workout.estimatedDurationMinutes} minutes</span><span>{workout.exercises.length} exercises</span></div>
      </div>
      <p className="preview-info">Loads and previous performances are sample data. Your entries stay in this tab until you refresh.</p>
      <ol className="exercise-list">
        {workout.exercises.map((exercise, index) => (
          <li className="panel exercise-detail" key={exercise.id}>
            <div className="exercise-title"><span className="exercise-number">{index + 1}</span><h2>{exercise.name}</h2></div>
            <ExercisePrescription exercise={exercise} />
          </li>
        ))}
      </ol>
      <div className="flow-actions">
        <button className="start-button" type="button" onClick={onStart} disabled={otherSessionActive}>
          {isResuming ? "Resume Workout" : "Start Workout"}<Icon name="arrow" />
        </button>
        {otherSessionActive && <p className="exercise-note">Finish your active workout before starting another. Use Resume Workout above to return to it.</p>}
      </div>
    </div>
  );
}
