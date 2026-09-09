import type { WorkoutSummary } from "@/types/workout";
import { Icon } from "./icon";

export function WorkoutCard({ workout, selected, onSelect }: { workout: WorkoutSummary; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={`workout-card tone-${workout.id}`} aria-pressed={selected} onClick={onSelect}>
      <span className="card-top"><span className="workout-icon"><Icon name="dumbbell" /></span><span className="selection-mark">{selected ? <Icon name="check" /> : <Icon name="arrow" />}</span></span>
      <span className="workout-name">{workout.name}</span>
      <span className="workout-focus">{workout.focus}</span>
      <span className="workout-meta">{workout.exerciseCount} exercises <span aria-hidden="true">·</span> {workout.estimatedDurationMinutes} min</span>
    </button>
  );
}
