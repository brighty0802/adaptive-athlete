import { WorkoutFlow } from "@/components/workout-flow";

// Render the calendar date per request, rather than freezing it at build time.
export const dynamic = "force-dynamic";

export default function TodayPage() {
  return <WorkoutFlow />;
}
