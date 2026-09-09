import { useState } from "react";
import type { ExercisePrescription, SetEntry } from "@/types/workout";
import { validateSet } from "@/lib/workout-session";

export function SetInputRow({ exercise, set, index, onEdit, onComplete, onReopen }: {
  exercise: ExercisePrescription;
  set: SetEntry;
  index: number;
  onEdit: (field: "weight" | "amount" | "rir", value: string) => void;
  onComplete: () => void;
  onReopen: () => void;
}) {
  const [showErrors, setShowErrors] = useState(false);
  const error = showErrors ? validateSet(set, exercise) : null;
  const prefix = `${exercise.id}-set-${index}`;
  const amountLabel = `${exercise.measurement === "seconds" ? "Seconds" : "Reps"}${exercise.perSide ? " / side" : ""}`;

  function complete() {
    setShowErrors(true);
    if (validateSet(set, exercise) === null) {
      onComplete();
      setShowErrors(false);
    }
  }

  return (
    <fieldset className={`set-row ${set.completed ? "set-done" : ""}`}>
      <legend>Set {index + 1}{set.completed ? " · Completed ✓" : ""}</legend>
      <div className="set-fields">
        {exercise.loadKind !== "none" && (
          <label htmlFor={`${prefix}-weight`}>
            {exercise.loadKind === "added" ? "Added kg" : exercise.loadKind === "per-hand" ? "kg / hand" : "Weight kg"}
            <input id={`${prefix}-weight`} type="number" inputMode="decimal" min="0" max="2000" step="0.25"
              value={set.weight} disabled={set.completed} onChange={(event) => onEdit("weight", event.target.value)}
              aria-describedby={error ? `${prefix}-error` : undefined} />
          </label>
        )}
        <label htmlFor={`${prefix}-amount`}>
          {amountLabel}
          <input id={`${prefix}-amount`} type="number" inputMode="numeric" min="0" max={exercise.measurement === "seconds" ? 3600 : 1000} step="1"
            placeholder={String(exercise.quickTarget)} value={set.amount} disabled={set.completed}
            onChange={(event) => onEdit("amount", event.target.value)} aria-describedby={error ? `${prefix}-error` : undefined} />
        </label>
        {exercise.targetRir !== null && (
          <label htmlFor={`${prefix}-rir`}>
            RIR
            <input id={`${prefix}-rir`} type="number" inputMode="decimal" min="0" max="10" step="0.5" placeholder={String(exercise.quickRir)}
              value={set.rir} disabled={set.completed} onChange={(event) => onEdit("rir", event.target.value)}
              aria-describedby={error ? `${prefix}-error` : undefined} />
          </label>
        )}
      </div>
      <button className={set.completed ? "text-button" : "secondary-button"} type="button" onClick={set.completed ? onReopen : complete}>
        {set.completed ? "Edit Set" : "Complete Set"}
      </button>
      {error && <p className="input-error" id={`${prefix}-error`} role="alert">{error}</p>}
    </fieldset>
  );
}
