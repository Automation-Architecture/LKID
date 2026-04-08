"""
LKID-27 + LKID-59 — Prediction Engine Tests + Lee Golden Vectors

Comprehensive unit test suite for backend/prediction/engine.py.

Test structure:
  1. TestLeeGoldenVectors      — 3 Lee vectors (month 12), ±0.2 tolerance (strict)
  2. TestBoundaryValues        — BVA for all 4 inputs
  3. TestEdgeCases             — edge cases per dispatch spec
  4. TestDeterminism           — no randomness, no side effects
  5. TestNoTreatmentDeclineRates — base rates and BUN modifier

LKID-59: Engine refactored to Lee's confirmed model (2026-04-02):
  - Phase 1: min(tier_cap, (BUN - target) * 0.31), saturates at month 3
  - After month 3: linear decline at CKD-stage treatment rate with age attenuation
  - No Phase 2 gain function
  - All 3 Lee vectors pass within ±0.2 tolerance (strict, not xfail)

Coverage target: 85% for backend/prediction/engine.py
Run:
  pytest backend/tests/test_prediction_engine.py \\
      --cov=backend/prediction --cov-report=term-missing --cov-fail-under=85

Markers: prediction_engine
"""

import ast
import inspect
import sys
from typing import Optional

import pytest

from prediction.engine import (
    DIALYSIS_THRESHOLD,
    _PATH4_FLOOR_RATE,
    _TIER_CONFIG,
    _TREATMENT_DECLINE_RATES,
    TIME_POINTS_MONTHS,
    _NO_TX_DECLINE_RATES,
    _get_decline_rate,
    _get_base_decline_rate,
    _get_bun_ratio,
    _get_treatment_decline_rate,
    _phase1_fraction,
    compute_bun_suppression_estimate,
    compute_confidence_tier,
    compute_dial_age,
    compute_egfr_ckd_epi_2021,
    compute_no_treatment,
    compute_structural_floor,
    compute_treatment_trajectory,
    predict,
)

from tests.fixtures.golden_vectors import (
    GOLDEN_TOLERANCE,
    LEE_VECTOR_1_EXPECTED_MONTH_12,
    LEE_VECTOR_1_INPUT,
    LEE_VECTOR_2_EXPECTED_MONTH_12,
    LEE_VECTOR_2_INPUT,
    LEE_VECTOR_3_EXPECTED_MONTH_12,
    LEE_VECTOR_3_INPUT,
    TIME_POINTS_MONTHS as GV_TIME_POINTS,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

EXPECTED_TRAJECTORY_KEYS = {"no_treatment", "bun_18_24", "bun_13_17", "bun_12"}
EXPECTED_ARRAY_LENGTH = 15  # must match len(TIME_POINTS_MONTHS)


def _run_predict(bun, creatinine, age, sex="unknown", egfr_entered=None):
    """Thin wrapper for predict() returning the full response dict."""
    return predict(bun=bun, creatinine=creatinine, age=age, sex=sex, egfr_entered=egfr_entered)


def _get_traj_at(result: dict, path: str, month: int) -> float:
    """Return the trajectory value for a given path and month."""
    idx = TIME_POINTS_MONTHS.index(month)
    return result["trajectories"][path][idx]


# ---------------------------------------------------------------------------
# Section 1: Golden File Comparisons
# ---------------------------------------------------------------------------

pytestmark = pytest.mark.prediction_engine


class TestLeeGoldenVectors:
    """Lee's 3 golden vectors (received 2026-04-02). Strict ±0.2 tolerance.

    These replace the old calc-spec vectors. All tests are strict (not xfail).
    Each vector checks the treatment trajectory at month 12 for a specific tier.
    """

    def test_vector_1_bun_13_17_month_12(self):
        """V1: BUN=16, eGFR=28, Age=58, tier=bun_13_17. Lee expects 26.79."""
        inp = LEE_VECTOR_1_INPUT
        result = _run_predict(
            bun=inp["bun"],
            creatinine=inp["creatinine"],
            age=inp["age"],
            egfr_entered=inp["egfr_override"],
        )
        actual = _get_traj_at(result, inp["tier"], 12)
        expected = LEE_VECTOR_1_EXPECTED_MONTH_12
        assert abs(actual - expected) <= GOLDEN_TOLERANCE, (
            f"V1 month 12: expected {expected}, got {actual} "
            f"(delta={actual - expected:+.2f}, tol=±{GOLDEN_TOLERANCE})"
        )

    def test_vector_2_bun_12_month_12(self):
        """V2: BUN=11, eGFR=22, Age=64, tier=bun_12. Lee expects 22.04."""
        inp = LEE_VECTOR_2_INPUT
        result = _run_predict(
            bun=inp["bun"],
            creatinine=inp["creatinine"],
            age=inp["age"],
            egfr_entered=inp["egfr_override"],
        )
        actual = _get_traj_at(result, inp["tier"], 12)
        expected = LEE_VECTOR_2_EXPECTED_MONTH_12
        assert abs(actual - expected) <= GOLDEN_TOLERANCE, (
            f"V2 month 12: expected {expected}, got {actual} "
            f"(delta={actual - expected:+.2f}, tol=±{GOLDEN_TOLERANCE})"
        )

    def test_vector_3_bun_18_24_month_12(self):
        """V3: BUN=22, eGFR=18, Age=74, tier=bun_18_24. Lee expects 17.09."""
        inp = LEE_VECTOR_3_INPUT
        result = _run_predict(
            bun=inp["bun"],
            creatinine=inp["creatinine"],
            age=inp["age"],
            egfr_entered=inp["egfr_override"],
        )
        actual = _get_traj_at(result, inp["tier"], 12)
        expected = LEE_VECTOR_3_EXPECTED_MONTH_12
        assert abs(actual - expected) <= GOLDEN_TOLERANCE, (
            f"V3 month 12: expected {expected}, got {actual} "
            f"(delta={actual - expected:+.2f}, tol=±{GOLDEN_TOLERANCE})"
        )

    def test_vector_1_baseline_passthrough(self):
        """V1: egfr_entered=28.0 returned as baseline at t=0 for all paths."""
        inp = LEE_VECTOR_1_INPUT
        result = _run_predict(
            bun=inp["bun"],
            creatinine=inp["creatinine"],
            age=inp["age"],
            egfr_entered=inp["egfr_override"],
        )
        assert result["egfr_baseline"] == inp["egfr_override"]
        for path in EXPECTED_TRAJECTORY_KEYS:
            assert _get_traj_at(result, path, 0) == inp["egfr_override"]

    def test_vector_2_baseline_passthrough(self):
        """V2: egfr_entered=22.0 returned at t=0 for all paths."""
        inp = LEE_VECTOR_2_INPUT
        result = _run_predict(
            bun=inp["bun"],
            creatinine=inp["creatinine"],
            age=inp["age"],
            egfr_entered=inp["egfr_override"],
        )
        assert result["egfr_baseline"] == inp["egfr_override"]
        for path in EXPECTED_TRAJECTORY_KEYS:
            assert _get_traj_at(result, path, 0) == inp["egfr_override"]

    def test_vector_3_baseline_passthrough(self):
        """V3: egfr_entered=18.0 returned at t=0 for all paths."""
        inp = LEE_VECTOR_3_INPUT
        result = _run_predict(
            bun=inp["bun"],
            creatinine=inp["creatinine"],
            age=inp["age"],
            egfr_entered=inp["egfr_override"],
        )
        assert result["egfr_baseline"] == inp["egfr_override"]
        for path in EXPECTED_TRAJECTORY_KEYS:
            assert _get_traj_at(result, path, 0) == inp["egfr_override"]

    def test_vector_3_age_attenuation_applied(self):
        """V3 (Age=74 > 70): treatment rate should be attenuated by 0.80.

        bun_18_24 decline should be -2.0 * 0.80 = -1.60/yr (not -2.0/yr).
        From month 3 to month 12 = 9 months = 0.75 years.
        Decline = -1.60 * 0.75 = -1.20. With Phase 1 gain of 0.285:
        eGFR(12) ~ 18 + 0.285 - 1.20 = 17.085 ≈ 17.1
        """
        inp = LEE_VECTOR_3_INPUT
        result = _run_predict(
            bun=inp["bun"],
            creatinine=inp["creatinine"],
            age=inp["age"],
            egfr_entered=inp["egfr_override"],
        )
        # Compare bun_18_24 at month 12 — age attenuation baked into Lee's expected
        actual = _get_traj_at(result, "bun_18_24", 12)
        assert abs(actual - LEE_VECTOR_3_EXPECTED_MONTH_12) <= GOLDEN_TOLERANCE

    def test_no_treatment_unchanged_for_vector_1(self):
        """V1 no-treatment path should decline linearly with BUN modifier."""
        inp = LEE_VECTOR_1_INPUT
        result = _run_predict(
            bun=inp["bun"],
            creatinine=inp["creatinine"],
            age=inp["age"],
            egfr_entered=inp["egfr_override"],
        )
        no_tx = result["trajectories"]["no_treatment"]
        # No-treatment is linear decline — must be monotonically non-increasing
        for i in range(1, len(no_tx)):
            assert no_tx[i] <= no_tx[i - 1] + 0.01


# ---------------------------------------------------------------------------
# Section 2: Boundary Value Tests — all 4 inputs
# ---------------------------------------------------------------------------


def _assert_valid_result(result: dict, label: str = ""):
    """Assert that a predict() result has valid structure and values.

    Ceiling note: CKD-EPI 2021 can produce values > 100 for very low creatinine
    (e.g., creatinine=0.3, age=20 can yield eGFR ~140+). We check that treatment
    trajectories don't exceed baseline + 35 pts — generous headroom above the
    ~12 pt maximum from Phase 1 (tier_cap=12). This catches any
    arithmetic runaway while allowing normal Phase 1 gains.
    """
    prefix = f"[{label}] " if label else ""
    assert "trajectories" in result, f"{prefix}missing 'trajectories'"
    traj = result["trajectories"]
    baseline = result.get("egfr_baseline", 100.0)

    for key in EXPECTED_TRAJECTORY_KEYS:
        assert key in traj, f"{prefix}missing trajectory key: {key}"
        arr = traj[key]
        assert len(arr) == EXPECTED_ARRAY_LENGTH, (
            f"{prefix}{key}: expected {EXPECTED_ARRAY_LENGTH} points, got {len(arr)}"
        )
        for v in arr:
            assert v >= 0.0, f"{prefix}{key}: negative eGFR value {v}"
        # Arithmetic runaway check: no trajectory should exceed baseline + 35 pts
        # (max Phase 1 tier_cap = 12; 35 is generous headroom)
        ceiling = baseline + 35.0
        for v in arr:
            assert v <= ceiling, (
                f"{prefix}{key}: eGFR {v} exceeds ceiling {ceiling:.1f} "
                f"(baseline={baseline} + 35)"
            )

    # No-treatment must be monotonically non-increasing
    # (once it reaches 0, it stays at 0)
    no_tx = traj["no_treatment"]
    for i in range(1, len(no_tx)):
        assert no_tx[i] <= no_tx[i - 1] + 0.01, (
            f"{prefix}no_treatment not monotonically non-increasing at index {i}: "
            f"{no_tx[i-1]} -> {no_tx[i]}"
        )


class TestBoundaryValuesBUN:
    """BVA for BUN input [5, 150]."""

    def test_bun_at_minimum_no_error(self):
        result = _run_predict(bun=5, creatinine=2.0, age=50, egfr_entered=35.0)
        _assert_valid_result(result, "BUN=5")

    def test_bun_just_above_minimum_no_error(self):
        result = _run_predict(bun=5.1, creatinine=2.0, age=50, egfr_entered=35.0)
        _assert_valid_result(result, "BUN=5.1")

    def test_bun_midrange_no_error(self):
        result = _run_predict(bun=50, creatinine=2.0, age=50, egfr_entered=35.0)
        _assert_valid_result(result, "BUN=50")

    def test_bun_just_below_maximum_no_error(self):
        result = _run_predict(bun=149.9, creatinine=2.0, age=50, egfr_entered=35.0)
        _assert_valid_result(result, "BUN=149.9")

    def test_bun_at_maximum_no_error(self):
        result = _run_predict(bun=150, creatinine=2.0, age=50, egfr_entered=35.0)
        _assert_valid_result(result, "BUN=150")

    def test_bun_at_21_tier_boundary(self):
        """BUN=21 is the bun_18_24 target — phase1 gain for that tier = 0."""
        result = _run_predict(bun=21, creatinine=2.0, age=50, egfr_entered=35.0)
        _assert_valid_result(result, "BUN=21 (tier boundary)")
        # Phase 1 = min(6, (21-21)*0.31) = 0. Treatment trajectory declines from baseline.
        bun_18_24_t3 = _get_traj_at(result, "bun_18_24", 3)
        # With zero Phase 1 gain and decline starting at month 3, t=3 should be
        # at or very slightly above baseline (Phase 1 fraction at t=3 is ~0.918 * 0 = 0)
        assert abs(bun_18_24_t3 - 35.0) <= 0.1, (
            f"BUN=21 (target for 18-24 tier): bun_18_24 at t=3 should be ~baseline=35.0, got {bun_18_24_t3}"
        )

    def test_bun_suppression_at_minimum_is_zero(self):
        """BUN=5 is below OPTIMAL_BUN=10, suppression should be 0."""
        suppression = compute_bun_suppression_estimate(5)
        assert suppression == 0.0

    def test_bun_suppression_at_optimal_is_zero(self):
        """BUN=10 (OPTIMAL_BUN): suppression = 0."""
        suppression = compute_bun_suppression_estimate(10)
        assert suppression == 0.0

    def test_bun_suppression_above_optimal(self):
        """BUN=35: suppression = (35-10)*0.31 = 7.75 -> rounded to 7.8."""
        suppression = compute_bun_suppression_estimate(35)
        assert abs(suppression - 7.8) <= 0.05, f"Expected ~7.8, got {suppression}"

    def test_bun_high_does_not_cause_negative_egfr(self):
        """BUN=150, Stage 5 (eGFR=10) — no_treatment must not go negative."""
        result = _run_predict(bun=150, creatinine=5.0, age=65, egfr_entered=10.0)
        no_tx = result["trajectories"]["no_treatment"]
        assert all(v >= 0.0 for v in no_tx), f"Negative eGFR in no_treatment: {no_tx}"


class TestBoundaryValuesCreatinine:
    """BVA for creatinine input [0.3, 20.0]."""

    def test_creatinine_at_minimum_no_error(self):
        result = _run_predict(bun=30, creatinine=0.3, age=50)
        _assert_valid_result(result, "creatinine=0.3")

    def test_creatinine_above_minimum_no_error(self):
        result = _run_predict(bun=30, creatinine=0.4, age=50)
        _assert_valid_result(result, "creatinine=0.4")

    def test_creatinine_midrange_no_error(self):
        result = _run_predict(bun=30, creatinine=5.0, age=50)
        _assert_valid_result(result, "creatinine=5.0")

    def test_creatinine_below_maximum_no_error(self):
        result = _run_predict(bun=30, creatinine=19.9, age=50)
        _assert_valid_result(result, "creatinine=19.9")

    def test_creatinine_at_maximum_no_error(self):
        result = _run_predict(bun=30, creatinine=20.0, age=50)
        _assert_valid_result(result, "creatinine=20.0")

    def test_creatinine_min_produces_high_egfr(self):
        """Creatinine=0.3 (very low) should produce a high eGFR."""
        result = _run_predict(bun=15, creatinine=0.3, age=40)
        assert result["egfr_baseline"] > 60, (
            f"creatinine=0.3 should yield eGFR>60, got {result['egfr_baseline']}"
        )

    def test_creatinine_max_produces_low_egfr(self):
        """Creatinine=20.0 (maximum) should produce a very low eGFR."""
        result = _run_predict(bun=60, creatinine=20.0, age=60)
        assert result["egfr_baseline"] < 15, (
            f"creatinine=20.0 should yield eGFR<15, got {result['egfr_baseline']}"
        )


class TestBoundaryValuesAge:
    """BVA for age input [18, 120]."""

    def test_age_at_minimum_no_error(self):
        result = _run_predict(bun=30, creatinine=2.0, age=18)
        _assert_valid_result(result, "age=18")

    def test_age_above_minimum_no_error(self):
        result = _run_predict(bun=30, creatinine=2.0, age=19)
        _assert_valid_result(result, "age=19")

    def test_age_midrange_no_error(self):
        result = _run_predict(bun=30, creatinine=2.0, age=60)
        _assert_valid_result(result, "age=60")

    def test_age_below_maximum_no_error(self):
        result = _run_predict(bun=30, creatinine=2.0, age=119)
        _assert_valid_result(result, "age=119")

    def test_age_at_maximum_no_error(self):
        result = _run_predict(bun=30, creatinine=2.0, age=120)
        _assert_valid_result(result, "age=120")

    def test_age_affects_egfr_calculation(self):
        """Older patients have lower eGFR for the same creatinine."""
        young = _run_predict(bun=30, creatinine=2.0, age=30)
        old = _run_predict(bun=30, creatinine=2.0, age=80)
        assert old["egfr_baseline"] < young["egfr_baseline"], (
            "Age 80 should yield lower eGFR than age 30 for same creatinine"
        )

    def test_age_70_threshold_no_error(self):
        """Age=70 is the treatment decline attenuation threshold (×0.80)."""
        result = _run_predict(bun=30, creatinine=2.0, age=70, egfr_entered=35.0)
        _assert_valid_result(result, "age=70")

    def test_age_80_threshold_no_error(self):
        """Age=80: same ×0.80 attenuation as age 71+ (no additional stacking)."""
        result = _run_predict(bun=30, creatinine=2.0, age=80, egfr_entered=35.0)
        _assert_valid_result(result, "age=80")


class TestBoundaryValuesOptionalModifiers:
    """BVA for hemoglobin [4.0, 20.0] and glucose [40, 500] (Tier 2 modifiers).

    NOTE: The current engine does not accept hemoglobin or glucose as parameters
    to predict() — these fields are consumed by predict_for_endpoint() and used
    only to compute confidence_tier. The trajectory itself is not modified by
    hemoglobin/glucose in the current implementation (gap tracked under LKID-14).

    These tests verify that Tier 1 predict() calls (without optional modifiers)
    produce valid output across a representative midrange input. BVA for the
    optional modifier values themselves requires predict_for_endpoint() once
    LKID-14 implements the Tier 2 decline modifier.
    """

    def test_tier1_predict_at_hemoglobin_min_context_no_error(self):
        """Tier 1 predict() (no optionals) runs cleanly — baseline for hemoglobin=4.0 context.

        GAP: predict() does not accept hemoglobin. Engine ignores it entirely for
        trajectory purposes. Full BVA for hemoglobin=4.0 requires LKID-14 implementation.
        """
        result = _run_predict(bun=30, creatinine=2.0, age=55, egfr_entered=35.0)
        _assert_valid_result(result, "tier1_baseline (hemoglobin=4.0 context)")

    def test_tier1_predict_at_hemoglobin_max_context_no_error(self):
        """Tier 1 predict() (no optionals) runs cleanly — baseline for hemoglobin=20.0 context.

        GAP: predict() does not accept hemoglobin. Full BVA for hemoglobin=20.0
        requires LKID-14 implementation.
        """
        result = _run_predict(bun=30, creatinine=2.0, age=55, egfr_entered=35.0)
        _assert_valid_result(result, "tier1_baseline (hemoglobin=20.0 context)")

    def test_tier1_predict_at_glucose_min_context_no_error(self):
        """Tier 1 predict() (no optionals) runs cleanly — baseline for glucose=40 context.

        GAP: predict() does not accept glucose. Full BVA for glucose=40 requires
        LKID-14 implementation.
        """
        result = _run_predict(bun=30, creatinine=2.0, age=55, egfr_entered=35.0)
        _assert_valid_result(result, "tier1_baseline (glucose=40 context)")

    def test_tier1_predict_at_glucose_max_context_no_error(self):
        """Tier 1 predict() (no optionals) runs cleanly — baseline for glucose=500 context.

        GAP: predict() does not accept glucose. Full BVA for glucose=500 requires
        LKID-14 implementation.
        """
        result = _run_predict(bun=30, creatinine=2.0, age=55, egfr_entered=35.0)
        _assert_valid_result(result, "tier1_baseline (glucose=500 context)")

    def test_hemoglobin_concerning_threshold(self):
        """Hemoglobin<11 should add +0.2/yr decline per spec. GAP: not implemented."""
        # This test documents the gap — engine does not implement the modifier yet.
        # When implemented, this test should assert that trajectories differ.
        # For now, asserting engine runs without error is sufficient.
        result = _run_predict(bun=30, creatinine=2.0, age=55, egfr_entered=35.0)
        _assert_valid_result(result, "hemoglobin_concerning")
        # GAP: engine does not modify trajectories based on hemoglobin.
        # Per finalized-formulas.md: Hgb < 11 adds +0.2 mL/min/yr excess decline.
        # TODO: when LKID-14 (rules engine) implements this, add trajectory comparison.


class TestBoundaryValuesEGFRStages:
    """BVA for eGFR near CKD stage transition boundaries."""

    def test_stage_3a_3b_boundary_no_error(self):
        """eGFR ~45 (Stage 3a/3b boundary): engine must not error."""
        result = _run_predict(bun=30, creatinine=1.52, age=60)
        _assert_valid_result(result, "stage_3a_3b_boundary")
        # eGFR ~45.6 — Stage 3a decline rate applies
        assert 44 < result["egfr_baseline"] < 48

    def test_stage_3b_4_boundary_no_error(self):
        """eGFR ~30 (Stage 3b/4 boundary): engine must not error."""
        result = _run_predict(bun=30, creatinine=2.15, age=60)
        _assert_valid_result(result, "stage_3b_4_boundary")
        assert 28 < result["egfr_baseline"] < 33

    def test_stage_4_5_boundary_no_error(self):
        """eGFR ~15 (Stage 4/5 boundary): engine must not error."""
        result = _run_predict(bun=40, creatinine=3.9, age=60)
        _assert_valid_result(result, "stage_4_5_boundary")
        assert 13 < result["egfr_baseline"] < 17

    def test_dialysis_threshold_boundary_no_error(self):
        """eGFR ~12 (dialysis threshold): engine must not error."""
        result = _run_predict(bun=50, creatinine=4.6, age=60)
        _assert_valid_result(result, "dialysis_threshold")
        assert 10 < result["egfr_baseline"] < 14

    def test_dialysis_threshold_exact_via_override(self):
        """eGFR=12.0 exactly (via egfr_entered) — no_treatment must not go negative."""
        result = _run_predict(bun=40, creatinine=4.6, age=60, egfr_entered=12.0)
        _assert_valid_result(result, "eGFR=12.0_exact")
        no_tx = result["trajectories"]["no_treatment"]
        assert all(v >= 0.0 for v in no_tx)


# ---------------------------------------------------------------------------
# Section 3: Edge Cases
# ---------------------------------------------------------------------------


class TestEdgeCases:
    """Edge cases from the dispatch specification."""

    def test_no_treatment_trajectory_hits_zero_not_negative(self):
        """Stage 5 patient: no_treatment must floor at 0, never go negative."""
        result = _run_predict(bun=80, creatinine=6.0, age=70, egfr_entered=8.0)
        no_tx = result["trajectories"]["no_treatment"]
        assert all(v >= 0.0 for v in no_tx), (
            f"no_treatment contains negative values: {no_tx}"
        )
        # Once it hits 0, it must stay at 0
        hit_zero = False
        for v in no_tx:
            if hit_zero:
                assert v == 0.0, f"no_treatment left zero after hitting it: {v}"
            if v == 0.0:
                hit_zero = True

    def test_dialysis_threshold_is_12_not_15(self):
        """Engine must use DIALYSIS_THRESHOLD = 12.0 — confirmed in engine.py."""
        assert DIALYSIS_THRESHOLD == 12.0, (
            f"DIALYSIS_THRESHOLD must be 12.0, got {DIALYSIS_THRESHOLD}. "
            "Do NOT use 15 — see finalized-formulas.md Reference and dispatch spec."
        )

    def test_all_four_trajectories_returned(self):
        """predict() must return all 4 trajectory arrays."""
        result = _run_predict(bun=35, creatinine=2.1, age=58, egfr_entered=33.0)
        assert set(result["trajectories"].keys()) == EXPECTED_TRAJECTORY_KEYS

    def test_trajectory_arrays_are_exactly_15_points(self):
        """Each trajectory must have exactly 15 time points."""
        result = _run_predict(bun=35, creatinine=2.1, age=58, egfr_entered=33.0)
        for key in EXPECTED_TRAJECTORY_KEYS:
            arr = result["trajectories"][key]
            assert len(arr) == 15, f"{key}: expected 15 points, got {len(arr)}"

    def test_time_points_array_matches_spec(self):
        """TIME_POINTS_MONTHS must match the spec's 15-point array."""
        expected = [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120]
        assert TIME_POINTS_MONTHS == expected
        assert GV_TIME_POINTS == expected

    def test_bun_suppression_calc_spec_method(self):
        """BUN=35, eGFR=33: suppression = (35-10)*0.31 = 7.75 -> 7.8."""
        suppression = compute_bun_suppression_estimate(35)
        assert abs(suppression - 7.8) <= 0.05, (
            f"Expected 7.8 (calc spec method), got {suppression}"
        )

    def test_bun_suppression_below_threshold_is_zero(self):
        """BUN <= OPTIMAL_BUN (10) per calc spec: suppression = 0."""
        assert compute_bun_suppression_estimate(10) == 0.0
        assert compute_bun_suppression_estimate(5) == 0.0
        assert compute_bun_suppression_estimate(0) == 0.0

    def test_egfr_override_used_when_provided(self):
        """egfr_entered=33.0 must bypass CKD-EPI and be used as baseline."""
        result = _run_predict(bun=35, creatinine=2.1, age=58, egfr_entered=33.0)
        assert result["egfr_baseline"] == 33.0

    def test_egfr_calculated_from_creatinine_when_no_override(self):
        """Without egfr_entered, eGFR must be computed via CKD-EPI 2021."""
        result = _run_predict(bun=35, creatinine=2.1, age=58)
        # CKD-EPI for unknown sex, creatinine=2.1, age=58 should be ~25-35 range
        assert result["egfr_baseline"] != 33.0, "Should not use 33.0 without override"
        assert 15 < result["egfr_baseline"] < 50, (
            f"CKD-EPI computed eGFR out of expected range: {result['egfr_baseline']}"
        )

    def test_optional_modifiers_absent_does_not_error(self):
        """Tier 1 request (no hemoglobin/glucose) must produce valid output."""
        result = _run_predict(bun=35, creatinine=2.1, age=58, egfr_entered=33.0)
        _assert_valid_result(result, "tier1_no_optionals")

    def test_optional_modifiers_present_engine_runs_cleanly(self):
        """
        Tier 2 (hemoglobin + glucose present): engine must not error.

        GAP: Per finalized-formulas.md Reference, Hgb < 11 should add
        +0.2 mL/min/yr excess decline. This modifier is NOT implemented
        in the current engine — trajectories are identical to Tier 1.
        Flag for LKID-14 (rules engine) implementation.
        """
        # Can only test via predict_for_endpoint which accepts these fields
        from prediction.engine import predict_for_endpoint, compute_confidence_tier
        result = predict_for_endpoint(
            bun=35, creatinine=2.1, potassium=4.0, age=58,
            sex="unknown", hemoglobin=9.5, co2=20.0, albumin=3.2,
        )
        assert result["confidence_tier"] == 2, (
            "hemoglobin + co2 + albumin present should yield confidence_tier=2"
        )
        _assert_valid_result(result, "tier2_with_optionals")

    def test_treatment_path_higher_than_no_treatment_at_all_time_points(self):
        """All 3 treatment paths must be >= no_treatment at every time point."""
        result = _run_predict(bun=35, creatinine=2.1, age=58, egfr_entered=33.0)
        no_tx = result["trajectories"]["no_treatment"]
        for path in ("bun_18_24", "bun_13_17", "bun_12"):
            traj = result["trajectories"][path]
            for i, (tx_v, no_v) in enumerate(zip(traj, no_tx)):
                assert tx_v >= no_v - 0.01, (
                    f"t={TIME_POINTS_MONTHS[i]}: {path}={tx_v} < no_treatment={no_v}"
                )

    def test_higher_tier_yields_better_or_equal_trajectory(self):
        """bun_12 >= bun_13_17 >= bun_18_24 >= no_tx at every time point."""
        result = _run_predict(bun=35, creatinine=2.1, age=58, egfr_entered=33.0)
        no_tx = result["trajectories"]["no_treatment"]
        bun_18 = result["trajectories"]["bun_18_24"]
        bun_13 = result["trajectories"]["bun_13_17"]
        bun_12 = result["trajectories"]["bun_12"]

        for i, t in enumerate(TIME_POINTS_MONTHS):
            assert bun_18[i] >= no_tx[i] - 0.01, (
                f"t={t}: bun_18_24={bun_18[i]} < no_treatment={no_tx[i]}"
            )
            assert bun_13[i] >= bun_18[i] - 0.01, (
                f"t={t}: bun_13_17={bun_13[i]} < bun_18_24={bun_18[i]}"
            )
            assert bun_12[i] >= bun_13[i] - 0.01, (
                f"t={t}: bun_12={bun_12[i]} < bun_13_17={bun_13[i]}"
            )

    def test_dial_age_is_none_when_no_treatment_stays_above_threshold(self):
        """High eGFR patient (Mild CKD): no_treatment may not cross threshold in 10yr."""
        result = _run_predict(bun=22, creatinine=1.5, age=52, egfr_entered=48.0)
        # no_treatment at t=120 = 29.7, above DIALYSIS_THRESHOLD=12.0
        assert result["dial_ages"]["no_treatment"] is None, (
            f"Expected no dial_age for mild CKD patient, got {result['dial_ages']['no_treatment']}"
        )

    def test_dial_age_computed_for_stage5_patient(self):
        """Stage 5 patient starting just above threshold: no_treatment should cross 12.0.

        Note: compute_dial_age() detects a CROSSING through DIALYSIS_THRESHOLD=12.0
        via linear interpolation. A patient who starts BELOW 12 has no detectable
        crossing in the trajectory (starts below threshold, stays below).
        Using egfr_entered=15 to ensure a detectable crossing.
        Stage 5 decline ~4.5/yr (base -4.0 + BUN modifier); crosses 12 in ~9 months.
        """
        result = _run_predict(bun=53, creatinine=5.0, age=65, egfr_entered=15.0)
        dial = result["dial_ages"]["no_treatment"]
        assert dial is not None, (
            f"Stage 5 patient starting at eGFR=15 should cross threshold=12.0. "
            f"no_treatment: {result['trajectories']['no_treatment']}"
        )
        assert dial > 65, f"dial_age {dial} should be > current age 65"
        assert dial < 70, f"dial_age {dial} should be < 70 (Stage 5 crosses quickly)"

    def test_egfr_ceiling_not_exceeded(self):
        """No trajectory should produce arithmetic-runaway eGFR (ceiling: baseline+35).

        When egfr_entered=5.0, baseline is low and ceiling is 5+35=40. All paths
        must stay below this ceiling (Phase 1 max tier_cap = 12 pts).
        """
        result = _run_predict(bun=150, creatinine=0.3, age=18, egfr_entered=5.0)
        ceiling = result["egfr_baseline"] + 35.0  # = 40.0
        for path in EXPECTED_TRAJECTORY_KEYS:
            for v in result["trajectories"][path]:
                assert v <= ceiling, f"{path} produced eGFR={v} > ceiling={ceiling}"

    def test_confidence_tier_1_without_optionals(self):
        """No optional fields -> confidence_tier=1."""
        tier = compute_confidence_tier(hemoglobin=None, co2=None, albumin=None)
        assert tier == 1

    def test_confidence_tier_2_with_hemoglobin(self):
        """hemoglobin present -> confidence_tier=2 (any optional field triggers Tier 2)."""
        tier = compute_confidence_tier(hemoglobin=9.5, co2=None, albumin=None)
        assert tier == 2

    def test_confidence_tier_2_with_co2(self):
        """co2 present -> confidence_tier=2."""
        tier = compute_confidence_tier(hemoglobin=None, co2=20.0, albumin=None)
        assert tier == 2

    def test_confidence_tier_2_with_albumin(self):
        """albumin present -> confidence_tier=2."""
        tier = compute_confidence_tier(hemoglobin=None, co2=None, albumin=3.2)
        assert tier == 2

    def test_confidence_tier_2_with_all_optionals(self):
        """All optional fields present -> confidence_tier=2."""
        tier = compute_confidence_tier(hemoglobin=9.5, co2=20.0, albumin=3.2)
        assert tier == 2


# ---------------------------------------------------------------------------
# Section 4: Determinism
# ---------------------------------------------------------------------------


class TestDeterminism:
    """Engine must be fully deterministic — no randomness, no network calls."""

    def test_same_inputs_produce_identical_outputs(self):
        """Run engine twice with identical inputs — results must be bit-for-bit equal."""
        kwargs = dict(bun=35, creatinine=2.1, age=58, egfr_entered=33.0)
        result_1 = _run_predict(**kwargs)
        result_2 = _run_predict(**kwargs)
        assert result_1["egfr_baseline"] == result_2["egfr_baseline"]
        for path in EXPECTED_TRAJECTORY_KEYS:
            assert result_1["trajectories"][path] == result_2["trajectories"][path], (
                f"Trajectory {path} not deterministic"
            )

    def test_same_inputs_produce_identical_outputs_high_bun(self):
        """Determinism with extreme BUN=150."""
        kwargs = dict(bun=150, creatinine=2.0, age=60, egfr_entered=30.0)
        r1 = _run_predict(**kwargs)
        r2 = _run_predict(**kwargs)
        for path in EXPECTED_TRAJECTORY_KEYS:
            assert r1["trajectories"][path] == r2["trajectories"][path]

    def test_no_random_state_in_engine(self):
        """Engine module must not import random or numpy.random."""
        import prediction.engine as engine_module
        source = inspect.getsource(engine_module)
        # Allow the word 'random' in comments/strings but not as an import
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                names = (
                    [alias.name for alias in node.names]
                    if isinstance(node, ast.Import)
                    else ([node.module] if node.module else [])
                )
                for name in names:
                    assert "random" not in name, (
                        f"Engine imports random module: '{name}'. "
                        "Engine must be deterministic."
                    )

    def test_no_network_calls_in_engine(self):
        """Engine must not import requests, httpx, or socket."""
        import prediction.engine as engine_module
        source = inspect.getsource(engine_module)
        tree = ast.parse(source)
        forbidden = {"requests", "httpx", "socket", "urllib", "aiohttp"}
        for node in ast.walk(tree):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                names = (
                    [alias.name for alias in node.names]
                    if isinstance(node, ast.Import)
                    else ([node.module] if node.module else [])
                )
                for name in names:
                    base = name.split(".")[0] if name else ""
                    assert base not in forbidden, (
                        f"Engine imports network module: '{name}'. "
                        "Engine must have no network calls."
                    )

    def test_no_datetime_now_in_engine(self):
        """Engine must not call datetime.now() — that would introduce non-determinism."""
        import prediction.engine as engine_module
        source = inspect.getsource(engine_module)
        assert "datetime.now()" not in source, (
            "Engine calls datetime.now() — this breaks determinism."
        )


# ---------------------------------------------------------------------------
# Section 5: No-Treatment Decline Rates
# ---------------------------------------------------------------------------


class TestNoTreatmentDeclineRates:
    """Verify base decline rates and BUN modifier against spec values."""

    def test_stage_3a_decline_rate_is_1_8_per_year(self):
        """Stage 3a (eGFR 45-59): base rate = -1.8 mL/min/yr."""
        rate = _get_base_decline_rate(52.0)
        assert rate == -1.8, f"Stage 3a rate should be -1.8, got {rate}"

    def test_stage_3a_upper_boundary_rate(self):
        """eGFR=59 (top of Stage 3a): rate = -1.8."""
        rate = _get_base_decline_rate(59.0)
        assert rate == -1.8

    def test_stage_3a_lower_boundary_rate(self):
        """eGFR=45 (bottom of Stage 3a): rate = -1.8."""
        rate = _get_base_decline_rate(45.0)
        assert rate == -1.8

    def test_stage_3b_decline_rate_is_2_2_per_year(self):
        """Stage 3b (eGFR 30-44): base rate = -2.2 mL/min/yr."""
        rate = _get_base_decline_rate(37.0)
        assert rate == -2.2, f"Stage 3b rate should be -2.2, got {rate}"

    def test_stage_3b_upper_boundary_rate(self):
        """eGFR=44 (top of Stage 3b): rate = -2.2."""
        rate = _get_base_decline_rate(44.0)
        assert rate == -2.2

    def test_stage_3b_lower_boundary_rate(self):
        """eGFR=30 (bottom of Stage 3b): rate = -2.2."""
        rate = _get_base_decline_rate(30.0)
        assert rate == -2.2

    def test_stage_4_decline_rate_is_3_0_per_year(self):
        """Stage 4 (eGFR 15-29): base rate = -3.0 mL/min/yr."""
        rate = _get_base_decline_rate(22.0)
        assert rate == -3.0, f"Stage 4 rate should be -3.0, got {rate}"

    def test_stage_5_decline_rate_is_4_0_per_year(self):
        """Stage 5 (eGFR <15): base rate = -4.0 mL/min/yr."""
        rate = _get_base_decline_rate(10.0)
        assert rate == -4.0, f"Stage 5 rate should be -4.0, got {rate}"

    def test_stage_5_at_dialysis_threshold_rate(self):
        """eGFR=12 (dialysis threshold): still Stage 5, rate = -4.0."""
        rate = _get_base_decline_rate(12.0)
        assert rate == -4.0

    def test_bun_modifier_adds_to_decline_when_bun_above_20(self):
        """BUN=30 (above 20): modifier = (30-20)/10 * 0.15 = 0.15 mL/min/yr extra."""
        annual_decline = _get_decline_rate(50.0, 30.0)
        base_rate = _get_base_decline_rate(50.0)  # -1.8
        expected_modifier = (30 - 20) / 10 * 0.15  # 0.15
        expected_total = base_rate - expected_modifier  # -1.95
        assert abs(annual_decline - expected_total) < 0.01, (
            f"Expected {expected_total:.3f}, got {annual_decline:.3f}"
        )

    def test_bun_modifier_is_zero_when_bun_at_20(self):
        """BUN=20: modifier = 0 (boundary: exactly at threshold)."""
        annual_decline = _get_decline_rate(50.0, 20.0)
        base_rate = _get_base_decline_rate(50.0)  # -1.8
        assert annual_decline == base_rate, (
            f"BUN=20 should give no modifier. Expected {base_rate}, got {annual_decline}"
        )

    def test_bun_modifier_is_zero_when_bun_below_20(self):
        """BUN=15 (below 20): modifier = 0."""
        annual_decline = _get_decline_rate(50.0, 15.0)
        base_rate = _get_base_decline_rate(50.0)
        assert annual_decline == base_rate, (
            f"BUN<20 should give no modifier. Expected {base_rate}, got {annual_decline}"
        )

    def test_bun_modifier_at_bun_150(self):
        """BUN=150: modifier = (150-20)/10 * 0.15 = 1.95 mL/min/yr extra."""
        annual_decline = _get_decline_rate(50.0, 150.0)
        base_rate = _get_base_decline_rate(50.0)  # -1.8
        expected_modifier = (150 - 20) / 10 * 0.15  # 1.95
        expected_total = base_rate - expected_modifier  # -3.75
        assert abs(annual_decline - expected_total) < 0.01

    def test_no_treatment_uses_linear_decline(self):
        """Verify no_treatment trajectory shape: linear with BUN-adjusted rate."""
        egfr0 = 33.0
        bun = 35.0
        annual_rate = _get_decline_rate(egfr0, bun)
        no_tx = compute_no_treatment(egfr0, bun)

        for i, t in enumerate(TIME_POINTS_MONTHS):
            expected = max(0, egfr0 + annual_rate * (t / 12))
            actual = no_tx[i]
            assert abs(actual - expected) <= 0.1, (
                f"t={t}: expected {expected:.2f}, got {actual}"
            )

    def test_phase1_fraction_at_month_3_is_0918(self):
        """Phase 1 saturates at month 3: f(3) = 1 - exp(-2.5) ≈ 0.9179."""
        import math
        expected = 1.0 - math.exp(-2.5)
        assert abs(_phase1_fraction(3) - expected) < 0.001

    def test_phase1_fraction_at_month_6_equals_month_3(self):
        """After month 3, Phase 1 fraction is constant (no further gain)."""
        assert _phase1_fraction(6) == _phase1_fraction(3)
        assert _phase1_fraction(12) == _phase1_fraction(3)

    def test_phase1_fraction_at_month_0_is_0(self):
        """Phase 1 starts at 0."""
        assert _phase1_fraction(0) == 0.0

    def test_no_tx_decline_rates_constants_match_spec(self):
        """_NO_TX_DECLINE_RATES must match binding values from backend-meeting-memo.md."""
        # (low, high, rate) triples
        rate_map = {(low, high): rate for low, high, rate in _NO_TX_DECLINE_RATES}
        assert rate_map.get((45, 60)) == -1.8, "Stage 3a rate mismatch"
        assert rate_map.get((30, 45)) == -2.2, "Stage 3b rate mismatch"
        assert rate_map.get((15, 30)) == -3.0, "Stage 4 rate mismatch"
        assert rate_map.get((0, 15)) == -4.0, "Stage 5 rate mismatch"

    def test_dialysis_threshold_constant(self):
        """DIALYSIS_THRESHOLD = 12.0 — the one source of truth."""
        assert DIALYSIS_THRESHOLD == 12.0, (
            f"DIALYSIS_THRESHOLD should be 12.0, got {DIALYSIS_THRESHOLD}. "
            "Confirmed in engine.py and finalized-formulas.md Reference."
        )

    def test_phase1_coeff_matches_spec(self):
        """BUN suppression formula uses 0.31 coefficient (calc spec v1.0).

        v2.0 engine removed PHASE1_COEFF as a module-level constant (it is used
        only inside compute_bun_suppression_estimate). Verify the coefficient is
        still applied correctly via the public function.
        """
        # (35 - 10) * 0.31 = 7.75, rounded to 7.8
        assert abs(compute_bun_suppression_estimate(35) - 7.8) <= 0.05

    def test_optimal_bun_constant(self):
        """OPTIMAL_BUN threshold = 10 — verify via suppression function.

        v2.0 engine inlines the constant inside compute_bun_suppression_estimate.
        BUN <= 10 must yield suppression = 0.
        """
        assert compute_bun_suppression_estimate(10) == 0.0
        assert compute_bun_suppression_estimate(9) == 0.0


# ---------------------------------------------------------------------------
# Section 6: CKD-EPI Formula Coverage
# ---------------------------------------------------------------------------


class TestCKDEPIFormula:
    """Verify the CKD-EPI 2021 race-free calculation correctness."""

    def test_male_egfr_at_normal_creatinine(self):
        """Male, Cr=1.0, Age=40: eGFR should be >90 (normal)."""
        egfr = compute_egfr_ckd_epi_2021(1.0, 40, "male")
        assert egfr > 90, f"Expected >90, got {egfr}"

    def test_female_sex_multiplier_applied(self):
        """Female sex_multiplier=1.012 is applied — verify distinct result from male.

        NOTE: In this engine, female kappa=0.7 gives a higher Cr/kappa ratio than
        male kappa=0.9 for the same creatinine, yielding a LOWER eGFR for females
        at creatinine >= 0.7. This is a known characteristic of the CKD-EPI 2021
        formula — the kappa/alpha interaction determines the net sex effect.
        The test verifies that female and male results are distinct (not identical).
        """
        female = compute_egfr_ckd_epi_2021(1.0, 50, "female")
        male = compute_egfr_ckd_epi_2021(1.0, 50, "male")
        assert female != male, (
            f"Female and male eGFR should differ. female={female}, male={male}"
        )
        # Male is higher at Cr=1.0 due to kappa difference dominating sex_multiplier
        assert male > female, (
            f"At Cr=1.0 age=50: male eGFR ({male}) expected > female ({female}) "
            "due to CKD-EPI kappa difference (0.9 vs 0.7)"
        )

    def test_unknown_sex_is_average_of_male_female(self):
        """sex='unknown' returns average of male and female eGFR."""
        female = compute_egfr_ckd_epi_2021(1.5, 55, "female")
        male = compute_egfr_ckd_epi_2021(1.5, 55, "male")
        unknown = compute_egfr_ckd_epi_2021(1.5, 55, "unknown")
        expected = round((male + female) / 2, 1)
        assert abs(unknown - expected) <= 0.05, (
            f"unknown eGFR {unknown} should equal avg of male/female {expected}"
        )

    def test_egfr_decreases_with_age(self):
        """Higher age -> lower eGFR for same creatinine."""
        egfr_40 = compute_egfr_ckd_epi_2021(1.5, 40, "male")
        egfr_70 = compute_egfr_ckd_epi_2021(1.5, 70, "male")
        assert egfr_70 < egfr_40

    def test_egfr_decreases_with_creatinine(self):
        """Higher creatinine -> lower eGFR for same age/sex."""
        egfr_1 = compute_egfr_ckd_epi_2021(1.0, 55, "male")
        egfr_3 = compute_egfr_ckd_epi_2021(3.0, 55, "male")
        assert egfr_3 < egfr_1

    def test_egfr_result_is_rounded_to_one_decimal(self):
        """CKD-EPI result should be rounded to 1 decimal."""
        egfr = compute_egfr_ckd_epi_2021(1.5, 55, "unknown")
        # Check it's a float with at most 1 decimal place
        assert round(egfr, 1) == egfr


# ---------------------------------------------------------------------------
# Section 7: _TIER_CONFIG coverage
# ---------------------------------------------------------------------------


class TestTierConfig:
    """Verify _TIER_CONFIG constants and treatment decline rates.

    LKID-59: _TIER_CONFIG now has target_bun, tier_cap, and use_path4_floor.
    Treatment decline rates are in _TREATMENT_DECLINE_RATES (separate table).
    """

    def test_bun_12_target_bun(self):
        """bun_12 tier target BUN = 10 mg/dL."""
        assert _TIER_CONFIG["bun_12"]["target_bun"] == 10

    def test_bun_13_17_target_bun(self):
        """bun_13_17 tier target BUN = 15 mg/dL."""
        assert _TIER_CONFIG["bun_13_17"]["target_bun"] == 15

    def test_bun_18_24_target_bun(self):
        """bun_18_24 tier target BUN = 21 mg/dL."""
        assert _TIER_CONFIG["bun_18_24"]["target_bun"] == 21

    def test_bun_12_tier_cap(self):
        """bun_12 tier cap = 12 eGFR points."""
        assert _TIER_CONFIG["bun_12"]["tier_cap"] == 12

    def test_bun_13_17_tier_cap(self):
        """bun_13_17 tier cap = 9 eGFR points."""
        assert _TIER_CONFIG["bun_13_17"]["tier_cap"] == 9

    def test_bun_18_24_tier_cap(self):
        """bun_18_24 tier cap = 6 eGFR points."""
        assert _TIER_CONFIG["bun_18_24"]["tier_cap"] == 6

    def test_path4_floor_rate(self):
        """Path 4 (bun_12) uses -0.33/yr floor per Lee's pilot data."""
        assert _PATH4_FLOOR_RATE == -0.33
        assert _TIER_CONFIG["bun_12"]["use_path4_floor"] is True

    def test_non_path4_tiers_use_ckd_stage_rates(self):
        """bun_13_17 and bun_18_24 use CKD-stage treatment rates (not path4 floor)."""
        assert _TIER_CONFIG["bun_13_17"]["use_path4_floor"] is False
        assert _TIER_CONFIG["bun_18_24"]["use_path4_floor"] is False

    def test_treatment_decline_rate_stage4_confirmed(self):
        """Stage 4 treatment rate = -2.0/yr (confirmed by Lee's 3 vectors)."""
        rate = _get_treatment_decline_rate(22.0, 58, "bun_13_17")
        assert rate == -2.0

    def test_treatment_decline_rate_path4_floor(self):
        """bun_12 tier uses -0.33/yr floor regardless of CKD stage."""
        rate = _get_treatment_decline_rate(22.0, 58, "bun_12")
        assert rate == -0.33

    def test_treatment_decline_rate_age_attenuation(self):
        """Age > 70: treatment rate multiplied by 0.80."""
        rate_young = _get_treatment_decline_rate(22.0, 58, "bun_13_17")
        rate_old = _get_treatment_decline_rate(22.0, 74, "bun_13_17")
        assert rate_young == -2.0
        assert abs(rate_old - (-2.0 * 0.80)) < 0.01

    def test_treatment_trajectory_decline_after_month_3(self):
        """After month 3, treatment trajectory declines linearly."""
        egfr0 = 28.0
        bun = 16.0
        age = 58
        traj = compute_treatment_trajectory(egfr0, bun, age, "bun_13_17")
        idx_3 = TIME_POINTS_MONTHS.index(3)
        idx_12 = TIME_POINTS_MONTHS.index(12)
        # From t=3 to t=12 is 9 months. Rate = -2.0/yr.
        # Expected decline = -2.0 * 9/12 = -1.5 eGFR pts
        actual_decline = traj[idx_3] - traj[idx_12]
        expected_decline = 2.0 * 9 / 12  # 1.5 (positive = trajectory dropped)
        assert abs(actual_decline - expected_decline) <= 0.2, (
            f"bun_13_17 decline month 3→12: expected ~{expected_decline:.1f}, "
            f"got {actual_decline:.1f}"
        )


# ---------------------------------------------------------------------------
# Section 8: Structural Floor (Amendment 3)
# ---------------------------------------------------------------------------


class TestStructuralFloor:
    """Tests for compute_structural_floor() — Amendment 3 display-only callout.

    Covers:
      - BUN <= 17 returns None (no meaningful suppression)
      - Each BUN bracket selects the correct ratio via _get_bun_ratio()
      - Conservative ratio logic (min of BUN-bracket and eGFR-bracket)
      - Suppression ~0 (conservative ratio = 0.0) returns None
      - Return dict contains only structural_floor_egfr and suppression_points
        (bun_ratio must NOT be present — internal coefficient, not exposed)
    """

    def test_bun_at_17_returns_none(self):
        """BUN exactly 17 is the boundary — function returns None."""
        result = compute_structural_floor(egfr=35.0, bun=17.0)
        assert result is None, f"Expected None for BUN=17, got {result}"

    def test_bun_below_17_returns_none(self):
        """BUN=10: well below threshold, must return None."""
        result = compute_structural_floor(egfr=35.0, bun=10.0)
        assert result is None

    def test_bun_just_above_17_returns_payload(self):
        """BUN=17.1 (just above threshold): must return a non-None dict."""
        result = compute_structural_floor(egfr=35.0, bun=17.1)
        assert result is not None, "BUN=17.1 should return a structural floor payload"

    # --- BUN bracket ratio selection via _get_bun_ratio() -------------------

    def test_get_bun_ratio_below_15_returns_zero(self):
        """BUN < 15: ratio = 0.00 (no suppression signal)."""
        assert _get_bun_ratio(14.9) == 0.00
        assert _get_bun_ratio(5.0) == 0.00

    def test_get_bun_ratio_bracket_15_to_20(self):
        """BUN in (15, 20]: ratio = 0.67."""
        assert _get_bun_ratio(18.0) == 0.67
        assert _get_bun_ratio(20.0) == 0.67

    def test_get_bun_ratio_bracket_20_to_30(self):
        """BUN in (20, 30]: ratio = 0.47."""
        assert _get_bun_ratio(25.0) == 0.47
        assert _get_bun_ratio(30.0) == 0.47

    def test_get_bun_ratio_bracket_30_to_50(self):
        """BUN in (30, 50]: ratio = 0.32."""
        assert _get_bun_ratio(40.0) == 0.32
        assert _get_bun_ratio(50.0) == 0.32

    def test_get_bun_ratio_above_50(self):
        """BUN > 50: ratio = 0.25."""
        assert _get_bun_ratio(60.0) == 0.25
        assert _get_bun_ratio(150.0) == 0.25

    # --- Conservative ratio (min of BUN-bracket vs eGFR-bracket) ------------

    def test_conservative_ratio_takes_egfr_implied_when_lower(self):
        """eGFR >= 60 implies ratio 0.00 — should yield None (suppression rounds to 0).

        BUN=25 gives bun_ratio=0.47, but eGFR=65 implies ratio=0.00.
        conservative_ratio = min(0.47, 0.00) = 0.00 -> suppression rounds to 0 -> None.
        """
        result = compute_structural_floor(egfr=65.0, bun=25.0)
        assert result is None, (
            f"eGFR>=60 (implied ratio=0.00) should yield None, got {result}"
        )

    def test_conservative_ratio_takes_egfr_implied_when_lower_stage4(self):
        """When eGFR-bracket ratio < BUN-bracket ratio, eGFR bracket wins.

        BUN=25 (ratio=0.47), eGFR=20 (Stage 4/5 boundary, 15<=eGFR<30 -> implied ratio=0.32).
        conservative_ratio = min(0.47, 0.32) = 0.32.
        suppression = round((25-15)*0.32, 1) = round(3.2, 1) = 3.2 -> rounds to 3 (non-zero).
        """
        result = compute_structural_floor(egfr=20.0, bun=25.0)
        assert result is not None
        # suppression_points = (25-15) * 0.32 = 3.2
        assert abs(result["suppression_points"] - 3.2) <= 0.15, (
            f"Expected suppression_points ~3.2, got {result['suppression_points']}"
        )

    # --- Suppression ~0 returns None ----------------------------------------

    def test_suppression_rounds_to_zero_returns_none(self):
        """When conservative_ratio=0.0, suppression_points=0.0 -> returns None.

        This prevents a confusing '0 points' callout on the frontend.
        eGFR >= 60 always implies ratio 0.00, so BUN=18 with eGFR=70 returns None.
        """
        result = compute_structural_floor(egfr=70.0, bun=18.0)
        assert result is None, (
            f"Zero suppression (conservative_ratio=0.0) must return None, got {result}"
        )

    def test_suppression_below_half_point_returns_none(self):
        """Conservative ratio that yields < 0.5 rounded suppression returns None.

        BUN=15.5 in bracket (15, 20] -> bun_ratio=0.67.
        eGFR=35 (Stage 3b, 30-44) -> egfr_implied_ratio=0.47.
        conservative_ratio=0.47. suppression=(15.5-15)*0.47=0.235 -> rounds to 0 -> None.
        """
        result = compute_structural_floor(egfr=35.0, bun=15.5)
        assert result is None, (
            f"suppression_points ~0.2 (rounds to 0) must return None, got {result}"
        )

    # --- Return shape — bun_ratio must NOT be present -----------------------

    def test_return_dict_does_not_contain_bun_ratio(self):
        """bun_ratio is an internal coefficient and must not appear in the API response."""
        result = compute_structural_floor(egfr=25.0, bun=35.0)
        assert result is not None, "Expected a payload for BUN=35, eGFR=25"
        assert "bun_ratio" not in result, (
            "bun_ratio must not be exposed in the structural floor response. "
            f"Keys present: {list(result.keys())}"
        )

    def test_return_dict_has_expected_keys(self):
        """Return dict must have exactly structural_floor_egfr and suppression_points."""
        result = compute_structural_floor(egfr=25.0, bun=35.0)
        assert result is not None
        assert set(result.keys()) == {"structural_floor_egfr", "suppression_points"}, (
            f"Unexpected keys: {set(result.keys())}"
        )

    # --- Arithmetic correctness ---------------------------------------------

    def test_structural_floor_egfr_equals_egfr_plus_suppression(self):
        """structural_floor_egfr = egfr + suppression_points (within rounding)."""
        egfr = 25.0
        bun = 40.0
        result = compute_structural_floor(egfr=egfr, bun=bun)
        assert result is not None
        expected_floor = round(egfr + result["suppression_points"], 1)
        assert abs(result["structural_floor_egfr"] - expected_floor) <= 0.05, (
            f"structural_floor_egfr {result['structural_floor_egfr']} != "
            f"egfr + suppression_points ({expected_floor})"
        )

    def test_high_bun_stage4_produces_valid_payload(self):
        """BUN=60, eGFR=22 (Stage 4): should produce a non-None payload with positive suppression."""
        result = compute_structural_floor(egfr=22.0, bun=60.0)
        # eGFR 15-29 -> egfr_implied_ratio=0.32; BUN>50 -> bun_ratio=0.25
        # conservative = min(0.25, 0.32) = 0.25
        # suppression = round((60-15)*0.25, 1) = round(11.25, 1) = 11.2
        assert result is not None
        assert result["suppression_points"] > 0
        assert result["structural_floor_egfr"] > 22.0

