import type { ExerciseLog, ExercisePrescription, SetEntry, WorkoutDefinition, WorkoutSession } from "../types/workout";

export type SessionAction =
  | { type: "edit"; exerciseId: string; setIndex: number; field: "weight" | "amount" | "rir"; value: string }
  | { type: "complete-set"; exerciseId: string; setIndex: number }
  | { type: "reopen-set"; exerciseId: string; setIndex: number }
  | { type: "skip"; exerciseId: string }
  | { type: "resume"; exerciseId: string }
  | { type: "prescribed"; exerciseId: string };

export function createSession(workout: WorkoutDefinition, startedAt: number): WorkoutSession {
  return {
    workoutId: workout.id, startedAt, finishedAt: null, status: "in_progress",
    exercises: workout.exercises.map((exercise) => ({
      exerciseId: exercise.id, skipped: false,
      sets: Array.from({ length: exercise.sets }, () => ({
        weight: exercise.proposedLoadKg === null ? "" : String(exercise.proposedLoadKg),
        amount: "", rir: "", touched: false, completed: false,
      })),
    })),
  };
}

function validNumber(value: string, minimum: number, maximum: number, integer = false): boolean {
  const number = Number(value);
  return value.trim() !== "" && Number.isFinite(number) && number >= minimum && number <= maximum && (!integer || Number.isInteger(number));
}

export function validateSet(set: SetEntry, exercise: ExercisePrescription): string | null {
  if (exercise.loadKind !== "none" && !validNumber(set.weight, 0, 2000)) return "Enter a weight from 0 to 2,000 kg.";
  if (!validNumber(set.amount, 0, exercise.measurement === "seconds" ? 3600 : 1000, true)) {
    return exercise.measurement === "seconds" ? "Enter whole seconds from 0 to 3,600." : "Enter whole repetitions from 0 to 1,000.";
  }
  if (exercise.targetRir !== null && !validNumber(set.rir, 0, 10)) return "Enter RIR from 0 to 10.";
  return null;
}

export function exerciseStatus(log: ExerciseLog): "not_started" | "in_progress" | "completed" | "skipped" {
  if (log.sets.every((set) => set.completed)) return "completed";
  if (log.skipped) return "skipped";
  if (log.sets.some((set) => set.completed || set.touched)) return "in_progress";
  return "not_started";
}

export function sessionCounts(session: WorkoutSession) {
  return {
    completedExercises: session.exercises.filter((exercise) => exerciseStatus(exercise) === "completed").length,
    completedSets: session.exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.completed).length, 0),
    skippedExercises: session.exercises.filter((exercise) => exerciseStatus(exercise) === "skipped").length,
    totalExercises: session.exercises.length,
    totalSets: session.exercises.reduce((total, exercise) => total + exercise.sets.length, 0),
  };
}

/** Only logging behaviour lives here. No training/progression decisions. */
export function updateSession(session: WorkoutSession, workout: WorkoutDefinition, action: SessionAction): WorkoutSession {
  if (session.status !== "in_progress") return session;
  const prescription = workout.exercises.find((exercise) => exercise.id === action.exerciseId);
  if (!prescription) return session;
  return {
    ...session,
    exercises: session.exercises.map((log) => {
      if (log.exerciseId !== action.exerciseId) return log;
      if (action.type === "skip") {
        return log.sets.every((set) => set.completed) ? log : { ...log, skipped: true };
      }
      if (action.type === "resume") return { ...log, skipped: false };
      if (log.skipped) return log;
      if (action.type === "prescribed") {
        return {
          ...log,
          sets: log.sets.map((set) => set.completed || set.touched ? set : {
            weight: prescription.proposedLoadKg === null ? "" : String(prescription.proposedLoadKg),
            amount: String(prescription.quickTarget),
            rir: prescription.quickRir === null ? "" : String(prescription.quickRir),
            touched: true, completed: true,
          }),
        };
      }
      return {
        ...log,
        sets: log.sets.map((set, index) => {
          if (index !== action.setIndex) return set;
          if (action.type === "reopen-set") return { ...set, completed: false, touched: true };
          if (set.completed) return set;
          if (action.type === "edit") return { ...set, [action.field]: action.value, touched: true };
          return validateSet(set, prescription) === null ? { ...set, completed: true, touched: true } : set;
        }),
      };
    }),
  };
}

export function finishSession(session: WorkoutSession, finishedAt: number): WorkoutSession {
  if (session.status !== "in_progress") return session;
  const counts = sessionCounts(session);
  return {
    ...session, finishedAt,
    status: counts.completedSets === 0 ? "cancelled" : counts.completedSets === counts.totalSets ? "completed" : "partial",
  };
}
