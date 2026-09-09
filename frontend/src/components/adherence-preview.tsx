import { formatCalendarDate, parseCalendarDate } from "@/lib/dates";
import type { CompletedWorkout, WorkoutSummary } from "@/types/workout";

export function AdherencePreview({ today, sessions, workouts }: { today: string; sessions: readonly CompletedWorkout[]; workouts: readonly WorkoutSummary[] }) {
  const current = parseCalendarDate(today);
  const month = today.slice(0, 7);
  const first = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1));
  const dayCount = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const monthSessions = sessions.filter((session) => session.date.startsWith(month));

  return (
    <section className="adherence panel" aria-labelledby="adherence-heading">
      <div className="section-heading"><div><p className="eyebrow">SHOWING UP ADDS UP</p><h2 id="adherence-heading">This month</h2></div><span className="session-count">{monthSessions.length} sessions</span></div>
      <p className="calendar-month">{formatCalendarDate(today, { month: "long", year: "numeric" })} <span>· Preview activity</span></p>
      <div className="calendar" role="list" aria-label="Monthly training activity">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span className="weekday" key={`weekday-${index}`} aria-hidden="true">{day}</span>)}
        {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} aria-hidden="true" />)}
        {Array.from({ length: dayCount }, (_, index) => {
          const day = index + 1;
          const date = `${month}-${String(day).padStart(2, "0")}`;
          const daySessions = monthSessions.filter((item) => item.date === date);
          const session = daySessions[0];
          const activity = daySessions.map((item) => `${workouts.find((workout) => workout.id === item.workoutId)?.name} ${item.status === "partial" ? "partially completed" : "completed"}`).join(", ");
          const label = `${formatCalendarDate(date, { day: "numeric", month: "long" })}: ${activity || (date > today ? "Upcoming" : "No workout")}${date === today ? ", today" : ""}`;
          return <span role="listitem" key={date} aria-label={label} title={label} aria-current={date === today ? "date" : undefined} className={`calendar-day ${session ? `trained tone-${session.workoutId}` : ""} ${date > today ? "future" : ""}`}>{day}</span>;
        })}
      </div>
      <div className="calendar-legend">{workouts.map((workout) => <span className={`tone-${workout.id}`} key={workout.id}><i aria-hidden="true" />{workout.name}</span>)}</div>
    </section>
  );
}
