"""Pure, conservative double progression over stored exercise/set facts.

No load reduction is inferred from a missed, skipped or partial exposure. The
caller selects the relevant prior performance; these helpers never access a DB.
"""

from copy import deepcopy
from decimal import Decimal, InvalidOperation


def _number(value):
    if value is None or value == "" or isinstance(value, bool):
        return None
    try:
        result = Decimal(str(value))
    except InvalidOperation:
        return None
    return result if result.is_finite() and result >= 0 else None


def _display(value):
    return format(value, "f").rstrip("0").rstrip(".") if "." in format(value, "f") else str(value)


def _completed(log):
    return [entry for entry in (log or {}).get("sets", []) if entry.get("completed") is True]


def progression_for_exercise(exercise, log=None):
    """Return outcome, nextLoadKg and message for an ExercisePrescription + log.

    A log uses frontend ExerciseLog keys plus optional date; set numeric inputs
    may be strings or numbers. An explicit techniqueConfirmed=True is required.
    """
    base_load = exercise.get("proposedLoadKg")

    def result(outcome, message, load=base_load):
        return {"outcome": outcome, "nextLoadKg": float(load) if load is not None else None,
                "message": message}

    if log and log.get("skipped"):
        return result("skipped", "Skipped exercise: no progression judgement; retain the previous recommendation.")
    completed = _completed(log)
    if not completed:
        if exercise["loadKind"] == "none":
            return result("quality", "Prioritise controlled, high-quality movement; no automatic load increase.", None)
        return result("initial", "Choose a conservative starting load and establish a baseline.")

    if exercise["loadKind"] == "none" or exercise["measurement"] == "seconds":
        return result("quality", "Maintain the variation and improve control and movement quality; no automatic load increase.", None)

    loads = [_number(entry.get("weight")) for entry in completed]
    valid_loads = [load for load in loads if load is not None]
    # Repeat a real used load if available, including zero added bodyweight load.
    # When loads differ, keep the lightest rather than inventing an average.
    last_load = min(valid_loads) if valid_loads else _number(base_load)
    if len(completed) != exercise["sets"] or len((log or {}).get("sets", [])) != exercise["sets"]:
        # A partial exposure may have used a deliberately lighter load. Preserve
        # its snapshotted recommendation across sessions, even when the canonical
        # template has no starting load. This is already the next target; do not
        # run another increment over it.
        retained_load = _number((log or {}).get("prescribedLoadKg"))
        if retained_load is None:
            retained_load = _number(base_load)
        return result("maintain", "Partial exercise: repeat the established load; incomplete work is not a regression.",
                      retained_load if retained_load is not None else last_load)
    if len(valid_loads) != len(loads) or len(set(valid_loads)) != 1:
        return result("maintain", "Repeat a consistent load across all prescribed sets before increasing.", last_load)
    rep_max = Decimal(str(exercise["range"][1]))
    amounts = [_number(entry.get("amount")) for entry in completed]
    if any(amount is None or amount < rep_max for amount in amounts):
        return result("maintain", "Repeat the load and build all prescribed sets to the top of the rep range.", last_load)
    required_rir = Decimal(str((exercise.get("targetRir") or [1])[0]))
    actual_rir = [_number(entry.get("rir")) for entry in completed]
    if any(rir is None or rir < required_rir for rir in actual_rir):
        return result("maintain", "Repeat the load until every set meets the required RIR with controlled technique.", last_load)
    if not log or log.get("techniqueConfirmed") is not True:
        return result("maintain", "Rep and RIR targets reached. Confirm controlled technique before increasing load.", last_load)
    increment = _number(exercise.get("loadIncrementKg"))
    if increment is None or increment == 0:
        return result("manual_increment", "Targets met. Choose the smallest available equipment increment next time; the displayed load stays unchanged until you choose it.", last_load)
    next_load = last_load + increment
    qualifier = " per hand" if exercise["loadKind"] == "per-hand" else " added" if exercise["loadKind"] == "added" else ""
    return result("increase", f"Targets and technique confirmed. Try {_display(next_load)} kg{qualifier} next time and return toward the bottom of the rep range.", next_load)


def feedback_for_exercise(exercise, log=None):
    return progression_for_exercise(exercise, log)["message"]


def previous_performance(exercise, log):
    """Format actual completed sets without treating missing work as completed."""
    completed = _completed(log)
    if not completed or log.get("skipped"):
        return "No previous performance"
    unit = "seconds" if exercise["measurement"] == "seconds" else "reps"
    suffix = " each side" if exercise.get("perSide") else ""
    segments = []
    for entry in completed:
        amount = _number(entry.get("amount"))
        if amount is None:
            continue
        segment = f"{_display(amount)} {unit}{suffix}"
        weight = _number(entry.get("weight"))
        if exercise["loadKind"] != "none" and weight is not None:
            qualifier = " per hand" if exercise["loadKind"] == "per-hand" else " added" if exercise["loadKind"] == "added" else ""
            segment = f"{_display(weight)} kg{qualifier} × {segment}"
        rir = _number(entry.get("rir"))
        if exercise.get("targetRir") is not None and rir is not None:
            segment += f" @ {_display(rir)} RIR"
        segments.append(segment)
    if not segments:
        return "No previous performance"
    summary = " / ".join(segments)
    if len(completed) < exercise["sets"]:
        summary += " · partial exercise"
    if log.get("date"):
        summary += f" · {log['date']}"
    return summary


def enrich_workout(workout, previous_by_exercise):
    """Create a prescription snapshot using actual history, leaving seed intact."""
    enriched = deepcopy(workout)
    for exercise in enriched["exercises"]:
        log = previous_by_exercise.get(exercise["id"])
        recommendation = progression_for_exercise(exercise, log)
        exercise["proposedLoadKg"] = recommendation["nextLoadKg"]
        exercise["previous"] = previous_performance(exercise, log) if log else "No previous performance"
        exercise["feedback"] = recommendation["message"]
        exercise["mockFeedback"] = recommendation["message"]
        exercise["progression"] = recommendation
    return enriched
