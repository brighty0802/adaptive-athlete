# Adaptive Athlete frontend

The first frontend slice: a mobile-first Today screen with typed sample workouts and activity. Uses Next.js App Router, React, TypeScript and plain CSS.

## Run locally

Requires Node.js 20.9 or newer and npm. From this directory:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. In Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

## Checks

```sh
npm run lint
npm run typecheck
npm run build
npm start
```

`dev` provides live updates while editing. `build` creates the production app; `start` serves that build.

## Where to work

- `src/app/layout.tsx`: shared HTML shell, metadata and global CSS import.
- `src/app/page.tsx`: the `/` route. Creates the demo data and passes it to TodayScreen. Rendering per request keeps the date current when loading or refreshing, rather than fixing it at build time.
- `src/components/today-screen.tsx`: composes the screen and holds temporary workout selection and button feedback in React state.
- `src/components/workout-card.tsx`: reusable selectable workout card.
- `src/components/adherence-preview.tsx`: Monday-first calendar, generated from sample completed sessions, with labels and colours for each workout.
- `src/components/bottom-navigation.tsx`: Today link and disabled future destinations.
- `src/components/icon.tsx`: small inline SVG icons without an icon package.
- `src/data/mock-today.ts`: the four canonical workout summaries and relative sample activity. Recommendation is explicitly mocked as Session A after Session D, not calculated by a training engine.
- `src/types/workout.ts`: display-data contracts, separate from the future persistence schema.
- `src/lib/dates.ts`: calendar-date parsing and formatting.
- `src/app/globals.css`: responsive layout and visual styles.

App Router components are Server Components by default. `TodayScreen` uses `"use client"` because selecting a workout and showing button feedback require browser state. Props crossing that boundary are plain serializable data. The page's server rendering is a Next.js rendering feature; there is no application backend or API integration here.

Dates use Europe/London for this initial personal prototype. Sample history is relative to today, crosses month boundaries correctly, and never records future activity. Refresh after midnight to update the displayed date.

Workout cards select the workout shown in the main card. They do not open a detail route yet. Start Workout explains that logging is coming next; it never creates a session. History, Progress and More are visibly marked Soon. Selection resets on refresh. All activity is labelled as sample data, and nothing is saved.

No database, authentication, progression engine, API calls or PWA installation features are included. Framework runtime dependencies are Next.js, React and React DOM; development dependencies provide TypeScript and ESLint checks. Generated output, local environment files and installed packages are ignored by Git.

ESLint is pinned to 9.39.5 because the React/import/accessibility plugins bundled by `eslint-config-next` 16.3.4 do not support ESLint 10 yet. npm reports the ESLint 9 deprecation; upgrade the lint stack together when those plugins support ESLint 10. Do not update ESLint alone.
