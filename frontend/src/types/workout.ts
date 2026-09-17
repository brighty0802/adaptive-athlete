export type WorkoutId = "session-a" | "session-b" | "session-c" | "session-d";

/** A display summary, not the eventual database model. */
export interface WorkoutSummary {
  id: WorkoutId;
  name: string;
  focus: string;
  exerciseCount: number;
  estimatedDurationMinutes: number;
}

export interface CompletedWorkout {
  workoutId: WorkoutId;
  date: string; // Calendar date: YYYY-MM-DD, Europe/London.
  durationMinutes: number;
  status?: "completed" | "partial";
}

export interface ExercisePrescription {
  id: string;
  name: string;
  sets: number;
  measurement: "reps" | "seconds";
  range: readonly [number, number];
  quickTarget: number;
  targetRir: readonly [number, number] | null;
  quickRir: number | null;
  proposedLoadKg: number | null;
  loadKind: "total" | "per-hand" | "added" | "none";
  perSide?: boolean;
  restSeconds: number;
  notes?: string;
  previous: string;
  mockFeedback?: string;
}

export interface WorkoutDefinition extends WorkoutSummary {
  exercises: readonly ExercisePrescription[];
}

/** Strings preserve empty inputs while editing; completion validates the values. */
export interface SetEntry {
  weight: string;
  amount: string;
  rir: string;
  touched: boolean;
  completed: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  skipped: boolean;
  techniqueConfirmed: boolean;
  sets: SetEntry[];
}

export interface WorkoutSession {
  workoutId: WorkoutId;
  startedAt: number;
  finishedAt: number | null;
  status: "in_progress" | "completed" | "partial" | "cancelled";
  exercises: ExerciseLog[];
}

export type WorkoutScreen =
  | { kind: "today" }
  | { kind: "detail"; workoutId: WorkoutId }
  | { kind: "active" }
  | { kind: "complete" }
  | { kind: "history" }
  | { kind: "history-detail"; session: PersistedSession };

export interface PersistedSession extends WorkoutSession {
  id: string;
  revision: number;
  lastMutationId: string | null;
  workout: WorkoutDefinition;
  feedback: Record<string, string>;
}

export interface TodayResponse {
  today: TodayData;
  workouts: WorkoutDefinition[];
  activeSession: PersistedSession | null;
}

export interface TodayData {
  athleteName: string;
  today: string;
  workouts: readonly WorkoutSummary[];
  recommendedWorkoutId: WorkoutId;
  lastCompletedWorkout: CompletedWorkout | null;
  completedWorkouts: readonly CompletedWorkout[];
}
