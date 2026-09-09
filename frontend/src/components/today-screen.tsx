"use client";

import { useState } from "react";
import Link from "next/link";
import type { TodayData } from "@/types/workout";
import { formatCalendarDate } from "@/lib/dates";
import { AdherencePreview } from "./adherence-preview";
import { BottomNavigation } from "./bottom-navigation";
import { Icon } from "./icon";
import { WorkoutCard } from "./workout-card";

export function TodayScreen({ data }: { data: TodayData }) {
  const recommended = data.workouts.find((workout) => workout.id === data.recommendedWorkoutId)!;
  const last = data.workouts.find((workout) => workout.id === data.lastCompletedWorkout.workoutId)!;
  const [selected, setSelected] = useState(recommended);
  const [startNotice, setStartNotice] = useState(false);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="brand-header">
        <Link href="/" className="brand" aria-label="Adaptive Athlete home">
          <Icon name="brand" />
          <span>ADAPTIVE<span>ATHLETE</span></span>
        </Link>
        <span className="demo-badge">Preview</span>
      </header>
      <main id="main">
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
                  {selected.id === recommended.id ? "NEXT UP TODAY" : "YOUR SELECTION"}
                </p>
                <span className="pill">{selected.id === recommended.id ? "Recommended" : "Selected"}</span>
              </div>
              <div className="hero-workout">
                <span className="hero-icon"><Icon name="dumbbell" /></span>
                <div>
                  <h2 id="next-workout-heading">{selected.name}</h2>
                  <p>{selected.focus}</p>
                </div>
              </div>
              <div className="hero-meta">
                <span><Icon name="clock" />~{selected.estimatedDurationMinutes} minutes</span>
                <span>{selected.exerciseCount} exercises</span>
              </div>
              <button type="button" className="start-button" onClick={() => setStartNotice(true)}>
                Start Workout<Icon name="arrow" />
              </button>
              <p className="start-note" role="status">
                {startNotice ? "Workout logging is coming next. Your session hasn’t started." : "Workout logging coming soon"}
              </p>
            </section>
            <section className="last-workout panel" aria-label="Last completed workout">
              <span className="completed-icon"><Icon name="check" /></span>
              <div>
                <p className="eyebrow">LAST COMPLETED</p>
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
                    selected={workout.id === selected.id}
                    onSelect={() => {
                      setSelected(workout);
                      setStartNotice(false);
                    }}
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
            <p className="sample-note">Sample workouts and activity for this preview.</p>
            <div className="brand-footer" aria-hidden="true">
              <Icon name="brand" />
              <p>STRONGER TODAY.<br />FASTER TOMORROW.</p>
            </div>
          </aside>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
