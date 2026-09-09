import { parseCalendarDate } from "@/lib/dates";
import type { CompletedWorkout, TodayData, WorkoutSummary } from "@/types/workout";

export const mockWorkouts = [
  { id: "session-a", name: "Session A", focus: "Strength + Power", exerciseCount: 5, estimatedDurationMinutes: 60 },
  { id: "session-b", name: "Session B", focus: "Strength", exerciseCount: 5, estimatedDurationMinutes: 60 },
  { id: "session-c", name: "Session C", focus: "Robustness + Power", exerciseCount: 6, estimatedDurationMinutes: 55 },
  { id: "session-d", name: "Session D", focus: "Volume", exerciseCount: 5, estimatedDurationMinutes: 55 },
] as const satisfies readonly WorkoutSummary[];

/** Relative dates keep this demo useful in any month. No recommendation engine. */
export function getMockTodayData(now: Date): TodayData {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const recentWorkoutIds = ["session-d", "session-c", "session-b", "session-a"] as const;
  const completedWorkouts: CompletedWorkout[] = Array.from({ length: 12 }, (_, index) => {
    const date = parseCalendarDate(today);
    date.setUTCDate(date.getUTCDate() - (index * 2 + 1));
    return { workoutId: recentWorkoutIds[index % 4], date: date.toISOString().slice(0, 10), durationMinutes: index === 0 ? 54 : 58 };
  });

  return {
    athleteName: "Lewis",
    today,
    workouts: mockWorkouts,
    recommendedWorkoutId: "session-a",
    lastCompletedWorkout: completedWorkouts[0],
    completedWorkouts,
  };
}
