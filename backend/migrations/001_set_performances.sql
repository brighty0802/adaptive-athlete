-- Keep training records outside Supabase's publicly exposed Data API schemas.
CREATE TABLE app_private.set_performances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise varchar(80) NOT NULL
        CHECK (exercise ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    weight numeric(6, 2) NOT NULL CHECK (weight BETWEEN 0 AND 2000),
    reps smallint NOT NULL CHECK (reps BETWEEN 0 AND 1000),
    rir numeric(3, 1) NOT NULL CHECK (rir BETWEEN 0 AND 10),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX set_performances_latest_idx
    ON app_private.set_performances (exercise, created_at DESC, id DESC);

REVOKE ALL ON app_private.set_performances FROM PUBLIC;
ALTER TABLE app_private.set_performances ENABLE ROW LEVEL SECURITY;
-- No browser policies. The backend connects as the table owner for this local v2.
