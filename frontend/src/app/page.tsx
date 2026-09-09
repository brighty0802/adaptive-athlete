import { WorkoutFlow } from "@/components/workout-flow";
import { getMockTodayData } from "@/data/mock-today";
import { mockWorkoutDefinitions } from "@/data/mock-workouts";

// Render the calendar date per request, rather than freezing it at build time.
export const dynamic = "force-dynamic";

export default function TodayPage() {
  return <WorkoutFlow initialData={getMockTodayData(new Date())} workouts={mockWorkoutDefinitions} />;
}
