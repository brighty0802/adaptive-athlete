"""Canonical MVP programme; prescriptions only, never invented athlete history.

Loads are entered during the first exposure. Increments reflect the conservative
end of the documented range; equipment without a specified increment is manual.
"""


def resistance(exercise_id, name, sets, rep_range, rest_seconds, **overrides):
    return {
        "id": exercise_id, "name": name, "sets": sets, "range": list(rep_range),
        "measurement": "reps", "quickTarget": rep_range[0], "targetRir": [1, 2],
        "quickRir": 2, "proposedLoadKg": None, "loadKind": "total",
        "restSeconds": rest_seconds, "previous": "No previous performance",
        "mockFeedback": "", "feedback": "Choose a conservative starting load and establish a baseline.",
        "loadIncrementKg": None, **overrides,
    }


def quality(exercise_id, name, sets, rep_range, rest_seconds, **overrides):
    return resistance(
        exercise_id, name, sets, rep_range, rest_seconds,
        loadKind="none", targetRir=None, quickRir=None,
        feedback="Prioritise controlled, high-quality movement.", **overrides,
    )


SESSION_A = [
    quality("countermovement-jump", "Countermovement Jump", 3, [3, 3], 150,
            notes="Perform while fresh. Stop if jump or landing quality deteriorates."),
    resistance("back-squat", "Back Squat", 3, [4, 6], 210, loadIncrementKg=2.5),
    resistance("romanian-deadlift", "Romanian Deadlift", 3, [6, 8], 150, loadIncrementKg=2.5),
    resistance("weighted-lunge", "Weighted Lunges", 2, [6, 8], 150,
               loadKind="per-hand", perSide=True, loadIncrementKg=1),
    resistance("standing-calf", "Standing Calf Raise", 2, [8, 12], 105),
]

SESSION_B = [
    resistance("bench-press", "Bench Press", 3, [4, 6], 180, loadIncrementKg=2.5),
    resistance("weighted-row", "Weighted Row", 3, [6, 8], 150),
    resistance("shoulder-press", "Standing Shoulder Press", 3, [5, 8], 150, loadIncrementKg=1),
    resistance("pull-up", "Pull-Ups", 3, [5, 8], 150,
               loadKind="added", proposedLoadKg=0, loadIncrementKg=2.5),
    resistance("lateral-raise", "Lateral Raises", 2, [12, 20], 75, loadKind="per-hand"),
]

SESSION_C = [
    quality("lateral-bound", "Lateral Bounds", 3, [3, 4], 150, perSide=True,
            notes="Maximum quality; keep landings controlled."),
    resistance("leg-press", "Leg Press", 3, [8, 10], 150),
    resistance("leg-extension", "Leg Extensions", 2, [10, 15], 105),
    quality("nordic-curl", "Nordic Hamstring Curl", 2, [4, 6], 150,
            notes="Use assistance as needed for controlled eccentric repetitions."),
    quality("copenhagen", "Copenhagen Adduction", 2, [20, 30], 75,
            measurement="seconds", perSide=True,
            notes="Use a controlled short-lever hold. Record seconds for each side, not repetitions."),
    resistance("soleus-raise", "Bent-Knee Soleus Raise", 3, [10, 15], 75),
]

SESSION_D = [
    resistance("incline-bench", "Incline Free-Weight Bench Press", 3, [6, 10], 150, loadKind="per-hand"),
    resistance("chin-up", "Chin-Ups", 3, [6, 10], 150,
               loadKind="added", proposedLoadKg=0, loadIncrementKg=2.5),
    resistance("lat-pulldown", "Lat Pulldown", 2, [8, 12], 105),
    resistance("dip", "Bodyweight Dips", 2, [6, 10], 120,
               loadKind="added", proposedLoadKg=0, loadIncrementKg=2.5),
    resistance("curl", "Curls", 2, [8, 12], 75, loadKind="per-hand"),
]

WORKOUTS = [
    {"id": "session-a", "name": "Session A", "focus": "Strength + Power",
     "estimatedDurationMinutes": 60, "exerciseCount": len(SESSION_A), "exercises": SESSION_A},
    {"id": "session-b", "name": "Session B", "focus": "Strength",
     "estimatedDurationMinutes": 60, "exerciseCount": len(SESSION_B), "exercises": SESSION_B},
    {"id": "session-c", "name": "Session C", "focus": "Robustness + Power",
     "estimatedDurationMinutes": 55, "exerciseCount": len(SESSION_C), "exercises": SESSION_C},
    {"id": "session-d", "name": "Session D", "focus": "Volume",
     "estimatedDurationMinutes": 55, "exerciseCount": len(SESSION_D), "exercises": SESSION_D},
]
