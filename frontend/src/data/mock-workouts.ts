import type { ExercisePrescription, WorkoutDefinition } from "@/types/workout";

// Exercise prescriptions follow the four-day programme. All loads and previous
// performances below are illustrative fixtures, not personalised recommendations.
function resistance(
  id: string, name: string, sets: number, range: readonly [number, number],
  load: number, restSeconds: number,
  overrides: Partial<ExercisePrescription> = {},
): ExercisePrescription {
  return {
    id, name, sets, range, measurement: "reps", quickTarget: range[0],
    targetRir: [1, 2], quickRir: 2, proposedLoadKg: load, loadKind: "total",
    restSeconds,
    previous: `${sets} × ${range[0]} at ${load} kg · RIR 2`,
    mockFeedback: "Example next-session feedback: repeat the proposed load and build repetitions within the range.",
    ...overrides,
  };
}

function quality(
  id: string, name: string, sets: number, range: readonly [number, number],
  restSeconds: number, overrides: Partial<ExercisePrescription> = {},
): ExercisePrescription {
  return resistance(id, name, sets, range, 0, restSeconds, {
    proposedLoadKg: null, loadKind: "none", targetRir: null, quickRir: null,
    previous: `${sets} × ${range[0]} · bodyweight, controlled quality`,
    mockFeedback: "Example next-session feedback: maintain the variation and prioritise controlled, high-quality movement.",
    ...overrides,
  });
}

const sessionA: ExercisePrescription[] = [
  quality("countermovement-jump", "Countermovement Jump", 3, [3, 3], 150, {
    notes: "Perform while fresh. Stop if jump or landing quality deteriorates.",
  }),
  resistance("back-squat", "Back Squat", 3, [4, 6], 75, 210, {
    previous: "75 kg × 6 / 6 / 5 · RIR 2 / 1 / 1",
  }),
  resistance("romanian-deadlift", "Romanian Deadlift", 3, [6, 8], 60, 150),
  resistance("weighted-lunge", "Weighted Lunges", 2, [6, 8], 12, 150, {
    loadKind: "per-hand", perSide: true,
    previous: "2 × 6 each leg · 12 kg per hand · RIR 2",
  }),
  resistance("standing-calf", "Standing Calf Raise", 2, [8, 12], 40, 105),
];

const sessionB: ExercisePrescription[] = [
  resistance("bench-press", "Bench Press", 3, [4, 6], 50, 180),
  resistance("weighted-row", "Weighted Row", 3, [6, 8], 40, 150),
  resistance("shoulder-press", "Standing Shoulder Press", 3, [5, 8], 25, 150, {
    previous: "25 kg × 8 / 8 / 7 · RIR 2 / 2 / 1",
    mockFeedback: "Example only: a future recommendation could be 27.5 kg after all three sets reach 8 reps with suitable RIR and technique. This preview has not assessed that.",
  }),
  resistance("pull-up", "Pull-Ups", 3, [5, 8], 0, 150, {
    loadKind: "added", previous: "3 × 5 · bodyweight · RIR 2",
  }),
  resistance("lateral-raise", "Lateral Raises", 2, [12, 20], 5, 75, {
    loadKind: "per-hand", previous: "2 × 12 · 5 kg per hand · RIR 2",
  }),
];

const sessionC: ExercisePrescription[] = [
  quality("lateral-bound", "Lateral Bounds", 3, [3, 4], 150, {
    perSide: true, previous: "3 × 3 each side · bodyweight",
    notes: "Maximum quality; keep landings controlled.",
  }),
  resistance("leg-press", "Leg Press", 3, [8, 10], 100, 150),
  resistance("leg-extension", "Leg Extensions", 2, [10, 15], 30, 105),
  quality("nordic-curl", "Nordic Hamstring Curl", 2, [4, 6], 150, {
    notes: "Use assistance as needed for controlled eccentric repetitions.",
  }),
  quality("copenhagen", "Copenhagen Adduction", 2, [20, 30], 75, {
    measurement: "seconds", perSide: true,
    previous: "2 × 20 seconds each side · bodyweight",
    notes: "Use a controlled short-lever hold. Record seconds for each side, not repetitions.",
  }),
  resistance("soleus-raise", "Bent-Knee Soleus Raise", 3, [10, 15], 20, 75),
];

const sessionD: ExercisePrescription[] = [
  resistance("incline-bench", "Incline Free-Weight Bench Press", 3, [6, 10], 16, 150, {
    loadKind: "per-hand", previous: "3 × 6 · 16 kg per hand · RIR 2",
  }),
  resistance("chin-up", "Chin-Ups", 3, [6, 10], 0, 150, {
    loadKind: "added", previous: "3 × 6 · bodyweight · RIR 2",
  }),
  resistance("lat-pulldown", "Lat Pulldown", 2, [8, 12], 40, 105),
  resistance("dip", "Bodyweight Dips", 2, [6, 10], 0, 120, {
    loadKind: "added", previous: "2 × 6 · bodyweight · RIR 2",
  }),
  resistance("curl", "Curls", 2, [8, 12], 8, 75, {
    loadKind: "per-hand", previous: "2 × 8 · 8 kg per hand · RIR 2",
  }),
];

export const mockWorkoutDefinitions: readonly WorkoutDefinition[] = [
  { id: "session-a", name: "Session A", focus: "Strength + Power", estimatedDurationMinutes: 60, exerciseCount: sessionA.length, exercises: sessionA },
  { id: "session-b", name: "Session B", focus: "Strength", estimatedDurationMinutes: 60, exerciseCount: sessionB.length, exercises: sessionB },
  { id: "session-c", name: "Session C", focus: "Robustness + Power", estimatedDurationMinutes: 55, exerciseCount: sessionC.length, exercises: sessionC },
  { id: "session-d", name: "Session D", focus: "Volume", estimatedDurationMinutes: 55, exerciseCount: sessionD.length, exercises: sessionD },
];
