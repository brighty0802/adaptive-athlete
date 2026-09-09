"use client";

import type { TodayData, WorkoutId } from "@/types/workout";
import { formatCalendarDate } from "@/lib/dates";
import { AdherencePreview } from "./adherence-preview";
import { Icon } from "./icon";
import { WorkoutCard } from "./workout-card";

export function TodayScreen({ data, onOpenWorkout }: { data: TodayData; onOpenWorkout: (id: WorkoutId) => void }) {
  const recommended = data.workouts.find((workout) => workout.id === data.recommendedWorkoutId)!;
  const last = data.workouts.find((workout) => workout.id === data.lastCompletedWorkout.workoutId)!;

  return (
    <>
        <div className="welcome">
          <time dateTime={data.today}>
            {formatCalendarDate(data.today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </time>
          <h1>Let’s get after it, {data.athleteName}.</h1>
          <p>Train smart. Play better.</p>
        </div>
        <div className="dashboard">
          <div className="training-column">
            <section className="recommended panel" aria-labelledby="next-workout-heading">
              <div className="section-heading">
                <p className="eyebrow">
                  <span className="live-dot" />
                  NEXT UP TODAY
                </p>
                <span className="pill">Recommended</span>
              </div>
              <div className="hero-workout">
                <span className="hero-icon"><Icon name="dumbbell" /></span>
                <div>
                  <h2 id="next-workout-heading">{recommended.name}</h2>
                  <p>{recommended.focus}</p>
                </div>
              </div>
              <div className="hero-meta">
                <span><Icon name="clock" />~{recommended.estimatedDurationMinutes} minutes</span>
                <span>{recommended.exerciseCount} exercises</span>
              </div>
              <button type="button" className="start-button" onClick={() => onOpenWorkout(recommended.id)}>
                View Workout<Icon name="arrow" />
              </button>
              <p className="start-note">Review your workout, then start when you’re ready.</p>
            </section>
            <section className="last-workout panel" aria-label="Last completed workout">
              <span className="completed-icon"><Icon name="check" /></span>
              <div>
                <p className="eyebrow">LAST COMPLETED{data.lastCompletedWorkout.status === "partial" ? " · PARTIAL" : ""}</p>
                <h2>{last.name} <span>— {last.focus}</span></h2>
                <p>
                  <time dateTime={data.lastCompletedWorkout.date}>
                    {formatCalendarDate(data.lastCompletedWorkout.date, { weekday: "short", day: "numeric", month: "short" })}
                  </time> <span aria-hidden="true">·</span> {data.lastCompletedWorkout.durationMinutes} min
                </p>
              </div>
            </section>
            <section className="workouts" aria-labelledby="workouts-heading">
              <div className="section-heading">
                <h2 id="workouts-heading">Your four sessions</h2>
                <span className="section-caption">Choose your focus</span>
              </div>
              <div className="workout-grid">
                {data.workouts.map((workout) => (
                  <WorkoutCard
                    key={workout.id}
                    workout={workout}
                    recommended={workout.id === recommended.id}
                    onOpen={() => onOpenWorkout(workout.id)}
                  />
                ))}
              </div>
              <p className="rotation-note">
                Next in your rotation: <strong>{recommended.name}</strong>. You can choose any session.
              </p>
            </section>
          </div>
          <aside className="activity-column">
            <AdherencePreview today={data.today} sessions={data.completedWorkouts} workouts={data.workouts} />
            <p className="sample-note">Preview activity · refresh clears newly logged workouts.</p>
            <div className="brand-footer" aria-hidden="true">
              <Icon name="brand" />
              <p>STRONGER TODAY.<br />FASTER TOMORROW.</p>
            </div>
          </aside>
        </div>
    </>
  );
}
