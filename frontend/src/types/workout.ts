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
}

export interface TodayData {
  athleteName: string;
  today: string;
  workouts: readonly WorkoutSummary[];
  recommendedWorkoutId: WorkoutId;
  lastCompletedWorkout: CompletedWorkout;
  completedWorkouts: readonly CompletedWorkout[];
}
