from copy import deepcopy

import pytest

from app.programme import WORKOUTS
from app.progression import enrich_workout, feedback_for_exercise, progression_for_exercise


def prescription(exercise_id="back-squat"):
    return deepcopy(next(exercise for workout in WORKOUTS for exercise in workout["exercises"]
                         if exercise["id"] == exercise_id))


def performance(exercise=None, weight="75", amount=None, rir="1", technique=True):
    exercise = exercise or prescription()
    return {
        "exerciseId": exercise["id"], "skipped": False,
        "techniqueConfirmed": technique,
        "sets": [{"weight": weight, "amount": str(amount or exercise["range"][1]),
                  "rir": rir, "completed": True, "touched": True}
                 for _ in range(exercise["sets"])],
    }


def test_programme_has_no_fictional_history_or_starting_weights():
    assert [workout["id"] for workout in WORKOUTS] == ["session-a", "session-b", "session-c", "session-d"]
    assert [workout["exerciseCount"] for workout in WORKOUTS] == [5, 5, 6, 5]
    for workout in WORKOUTS:
        assert workout["exerciseCount"] == len(workout["exercises"])
        for exercise in workout["exercises"]:
            assert exercise["previous"] == "No previous performance"
            assert exercise["proposedLoadKg"] == (0 if exercise["loadKind"] == "added" else None)


def test_all_sets_at_top_range_minimum_rir_and_confirmed_technique_increase():
    result = progression_for_exercise(prescription(), performance())
    assert result["outcome"] == "increase"
    assert result["nextLoadKg"] == 77.5
    assert "77.5 kg" in result["message"]


@pytest.mark.parametrize("field,value", [
    ("amount", "5"), ("rir", "0"), ("weight", "70"),
    ("amount", ""), ("rir", ""), ("weight", ""),
    ("amount", "NaN"), ("rir", "Infinity"), ("weight", "-1"),
])
def test_any_set_missing_progression_criterion_prevents_increase(field, value):
    log = performance()
    log["sets"][-1][field] = value
    result = progression_for_exercise(prescription(), log)
    assert result["outcome"] == "maintain"
    assert result["nextLoadKg"] <= 75


@pytest.mark.parametrize("technique", [False, None, "true", 1])
def test_technique_confirmation_is_required_and_explicit(technique):
    result = progression_for_exercise(prescription(), performance(technique=technique))
    assert result["outcome"] == "maintain"
    assert result["nextLoadKg"] == 75
    assert "Confirm controlled technique" in result["message"]


@pytest.mark.parametrize("change", ["reopened", "removed", "extra"])
def test_exact_prescribed_set_count_must_be_completed(change):
    log = performance()
    if change == "reopened":
        log["sets"][-1]["completed"] = False
    elif change == "removed":
        log["sets"].pop()
    else:
        log["sets"].append(deepcopy(log["sets"][0]))
    result = progression_for_exercise(prescription(), log)
    assert result["outcome"] == "maintain"
    assert result["nextLoadKg"] == 75


def test_skipped_exercise_keeps_prior_recommendation_without_judgement():
    exercise = prescription()
    exercise["proposedLoadKg"] = 77.5
    log = performance(amount=1, rir="0")
    log["skipped"] = True
    result = progression_for_exercise(exercise, log)
    assert result["outcome"] == "skipped"
    assert result["nextLoadKg"] == 77.5


def test_partial_exercise_does_not_reduce_an_established_recommendation():
    exercise = prescription()
    exercise["proposedLoadKg"] = 75
    log = performance(weight="60")
    log["sets"][1]["completed"] = False
    log["sets"][2]["completed"] = False
    result = progression_for_exercise(exercise, log)
    assert result["outcome"] == "maintain"
    assert result["nextLoadKg"] == 75


def test_two_partial_exposures_preserve_stored_baseline_without_reducing_it():
    first_log = performance(weight="75")
    first_log["sets"] = first_log["sets"][:1]
    first_next = enrich_workout(WORKOUTS[0], {"back-squat": first_log})
    baseline = first_next["exercises"][1]["proposedLoadKg"]
    assert baseline == 75
    second_log = performance(weight="60")
    second_log["sets"] = second_log["sets"][:1]
    second_log["prescribedLoadKg"] = baseline
    second_next = enrich_workout(WORKOUTS[0], {"back-squat": second_log})
    assert second_next["exercises"][1]["proposedLoadKg"] == 75
    assert "60 kg" in second_next["exercises"][1]["previous"]


def test_partial_preserved_target_is_not_incremented_again():
    complete_next = enrich_workout(WORKOUTS[0], {"back-squat": performance()})
    target = complete_next["exercises"][1]["proposedLoadKg"]
    assert target == 77.5
    partial_log = performance(weight="77.5")
    partial_log["sets"][-1]["completed"] = False
    partial_log["prescribedLoadKg"] = target
    next_workout = enrich_workout(WORKOUTS[0], {"back-squat": partial_log})
    again = enrich_workout(next_workout, {"back-squat": partial_log})
    assert next_workout["exercises"][1]["proposedLoadKg"] == 77.5
    assert again["exercises"][1]["proposedLoadKg"] == 77.5


@pytest.mark.parametrize("exercise_id", ["countermovement-jump", "lateral-bound", "nordic-curl", "copenhagen"])
def test_power_timed_and_control_exercises_do_not_automatically_add_load(exercise_id):
    exercise = prescription(exercise_id)
    result = progression_for_exercise(exercise, performance(exercise))
    assert result["outcome"] == "quality"
    assert result["nextLoadKg"] is None


@pytest.mark.parametrize("exercise_id", ["leg-press", "leg-extension", "lat-pulldown", "lateral-raise", "curl", "weighted-row"])
def test_unknown_equipment_increment_requires_manual_choice(exercise_id):
    exercise = prescription(exercise_id)
    result = progression_for_exercise(exercise, performance(exercise))
    assert result["outcome"] == "manual_increment"
    assert result["nextLoadKg"] == 75
    assert "smallest available" in result["message"]


@pytest.mark.parametrize("exercise_id", ["pull-up", "chin-up", "dip"])
def test_zero_added_load_can_progress_without_inventing_bodyweight(exercise_id):
    exercise = prescription(exercise_id)
    result = progression_for_exercise(exercise, performance(exercise, weight="0"))
    assert result["nextLoadKg"] == 2.5
    assert "kg added" in result["message"]


def test_per_hand_increment_is_not_doubled():
    exercise = prescription("weighted-lunge")
    result = progression_for_exercise(exercise, performance(exercise, weight="12"))
    assert result["nextLoadKg"] == 13
    assert "13 kg per hand" in result["message"]


def test_enrichment_uses_actual_history_and_does_not_mutate_inputs():
    original = deepcopy(WORKOUTS[0])
    log = performance()
    log["date"] = "2026-09-17"
    original_log = deepcopy(log)
    enriched = enrich_workout(WORKOUTS[0], {"back-squat": log})
    squat = next(exercise for exercise in enriched["exercises"] if exercise["id"] == "back-squat")
    assert squat["proposedLoadKg"] == 77.5
    assert "75 kg × 6 reps @ 1 RIR" in squat["previous"]
    assert "2026-09-17" in squat["previous"]
    assert squat["feedback"] == squat["mockFeedback"] == feedback_for_exercise(prescription(), log)
    assert WORKOUTS[0] == original
    assert log == original_log
    assert enriched["exercises"][-1]["previous"] == "No previous performance"
    assert enriched["exercises"][-1]["proposedLoadKg"] is None


def test_legacy_single_set_can_supply_real_previous_load_without_progressing():
    log = performance()
    log["sets"] = log["sets"][:1]
    enriched = enrich_workout(WORKOUTS[0], {"back-squat": log})
    squat = enriched["exercises"][1]
    assert squat["proposedLoadKg"] == 75
    assert squat["progression"]["outcome"] == "maintain"
    assert "partial exercise" in squat["previous"]


def test_first_exposure_stays_unloaded_and_feedback_is_honest():
    enriched = enrich_workout(WORKOUTS[0], {})
    assert enriched["exercises"][1]["proposedLoadKg"] is None
    assert "establish a baseline" in enriched["exercises"][1]["feedback"]
