import type { ExercisePrescription as Prescription } from "@/types/workout";

export function loadLabel(exercise: Prescription): string {
  if (exercise.loadKind === "none") return "Bodyweight";
  if (exercise.proposedLoadKg === null) return "Choose your starting load";
  if (exercise.loadKind === "added") return exercise.proposedLoadKg === 0 ? "Bodyweight (+0 kg)" : `+${exercise.proposedLoadKg} kg added`;
  return `${exercise.proposedLoadKg} kg${exercise.loadKind === "per-hand" ? " per hand" : " total"}`;
}

export function targetLabel(exercise: Prescription): string {
  const range = exercise.range[0] === exercise.range[1] ? String(exercise.range[0]) : exercise.range.join("–");
  return `${exercise.sets} × ${range} ${exercise.measurement === "seconds" ? "sec" : "reps"}${exercise.perSide ? " each side" : ""}`;
}

export function ExercisePrescription({ exercise }: { exercise: Prescription }) {
  return (
    <>
      <dl className="prescription-grid">
        <div><dt>Working sets</dt><dd>{targetLabel(exercise)}</dd></div>
        <div><dt>Target RIR</dt><dd>{exercise.targetRir ? exercise.targetRir.join("–") : "N/A · quality"}</dd></div>
        <div><dt>Current recommendation</dt><dd>{loadLabel(exercise)}</dd></div>
        <div><dt>Rest</dt><dd>{exercise.restSeconds} sec</dd></div>
      </dl>
      {exercise.loadKind !== "none" && exercise.proposedLoadKg === null && <p className="starting-load-note">
        No established load yet. Choose a starting load and enter it in each set’s weight field. Your saved performance will guide the next recommendation.
      </p>}
      {exercise.notes && <p className="exercise-note">{exercise.notes}</p>}
    </>
  );
}
