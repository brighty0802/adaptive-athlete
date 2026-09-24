import { useState } from "react";
import type { ExercisePrescription, SetEntry } from "@/types/workout";
import { setRangeWarning, validateSet } from "@/lib/workout-session";

export function SetInputRow({ exercise, set, index, onEdit, onComplete, onReopen, pending = false }: {
  exercise: ExercisePrescription;
  set: SetEntry;
  index: number;
  onEdit: (field: "weight" | "amount" | "rir", value: string) => void;
  onComplete: () => void;
  onReopen: () => void;
  pending?: boolean;
}) {
  const [showErrors, setShowErrors] = useState(false);
  const error = showErrors ? validateSet(set, exercise) : null;
  const warning = setRangeWarning(set, exercise);
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
    <fieldset className={`set-row ${set.completed && !pending ? "set-done" : ""}`}>
      <legend>Set {index + 1}{set.completed ? pending ? " · Completion pending save" : " · Completed ✓" : pending ? " · Unsaved changes" : ""}</legend>
      <div className="set-fields">
        {exercise.loadKind !== "none" && (
          <label htmlFor={`${prefix}-weight`}>
            {exercise.loadKind === "added" ? "Added kg" : exercise.loadKind === "per-hand" ? "kg / hand" : "Weight kg"}
            <input id={`${prefix}-weight`} type="number" inputMode="decimal" min="0" max="2000" step="0.25"
              placeholder={exercise.proposedLoadKg === null ? "Starting load" : String(exercise.proposedLoadKg)}
              value={set.weight} disabled={set.completed} onChange={(event) => onEdit("weight", event.target.value)}
              aria-describedby={error ? `${prefix}-error` : undefined} />
          </label>
        )}
        <label htmlFor={`${prefix}-amount`}>
          {amountLabel}
          <input id={`${prefix}-amount`} type="number" inputMode="numeric" min="0" max={exercise.measurement === "seconds" ? 3600 : 1000} step="1"
            placeholder={String(exercise.quickTarget)} value={set.amount} disabled={set.completed}
            onChange={(event) => onEdit("amount", event.target.value)} aria-describedby={error ? `${prefix}-error` : warning ? `${prefix}-warning` : undefined} />
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
      {warning && <p className="range-warning" id={`${prefix}-warning`} role="status">{warning}</p>}
      <button className={set.completed ? "text-button" : "secondary-button"} type="button" onClick={set.completed ? onReopen : complete}>
        {set.completed ? "Edit Set" : "Complete Set"}
      </button>
      {error && <p className="input-error" id={`${prefix}-error`} role="alert">{error}</p>}
    </fieldset>
  );
}
