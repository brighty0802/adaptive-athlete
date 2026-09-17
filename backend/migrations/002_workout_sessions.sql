-- The four templates remain versioned backend configuration. Each session
-- snapshots its prescription so later programme edits cannot rewrite history.
CREATE TABLE app_private.workout_sessions (
    id uuid PRIMARY KEY,
    workout_id varchar(80) NOT NULL,
    prescription jsonb NOT NULL CHECK (jsonb_typeof(prescription) = 'object'),
    status text NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'completed', 'partial', 'cancelled')),
    started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    finished_at timestamptz,
    revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
    last_mutation_id uuid,
    feedback jsonb NOT NULL DEFAULT '{}'::jsonb,
    CHECK ((status = 'in_progress') = (finished_at IS NULL)),
    CHECK (finished_at IS NULL OR finished_at >= started_at)
);
-- This MVP is explicitly single-user, with at most one unfinished workout.
CREATE UNIQUE INDEX one_active_workout ON app_private.workout_sessions ((true))
    WHERE status = 'in_progress';
CREATE INDEX workout_sessions_history ON app_private.workout_sessions (finished_at DESC)
    WHERE status IN ('completed', 'partial');

CREATE TABLE app_private.exercise_performances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES app_private.workout_sessions(id) ON DELETE CASCADE,
    exercise_id varchar(80) NOT NULL,
    actual_order smallint NOT NULL CHECK (actual_order >= 0),
    skipped boolean NOT NULL DEFAULT false,
    technique_confirmed boolean NOT NULL DEFAULT false,
    UNIQUE (session_id, exercise_id),
    UNIQUE (session_id, actual_order) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE app_private.workout_sets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_performance_id uuid NOT NULL REFERENCES app_private.exercise_performances(id) ON DELETE CASCADE,
    set_number smallint NOT NULL CHECK (set_number > 0),
    completed boolean NOT NULL DEFAULT false,
    weight numeric(6,2) CHECK (weight BETWEEN 0 AND 2000),
    reps smallint CHECK (reps BETWEEN 0 AND 1000),
    seconds smallint CHECK (seconds BETWEEN 0 AND 3600),
    rir numeric(3,1) CHECK (rir BETWEEN 0 AND 10),
    -- Raw editing strings preserve an unfinished input without inventing a result.
    draft jsonb NOT NULL CHECK (jsonb_typeof(draft) = 'object'),
    UNIQUE (exercise_performance_id, set_number),
    CHECK (NOT completed OR (reps IS NOT NULL) <> (seconds IS NOT NULL)),
    CHECK (completed OR (weight IS NULL AND reps IS NULL AND seconds IS NULL AND rir IS NULL))
);

REVOKE ALL ON app_private.workout_sessions, app_private.exercise_performances,
    app_private.workout_sets FROM PUBLIC;
ALTER TABLE app_private.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.exercise_performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.workout_sets ENABLE ROW LEVEL SECURITY;
