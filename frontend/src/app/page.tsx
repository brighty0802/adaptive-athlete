import { TodayScreen } from "@/components/today-screen";
import { getMockTodayData } from "@/data/mock-today";

// Render the calendar date per request, rather than freezing it at build time.
export const dynamic = "force-dynamic";

export default function TodayPage() {
  return <TodayScreen data={getMockTodayData(new Date())} />;
}
