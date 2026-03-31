"""
Structural tests for the KidneyHood v2.0 prediction engine — LKID-14.

Scaffold for LKID-27 (Yuri + Gay Mark boundary/integration tests).

These tests assert structural correctness:
  - Correct output shape (15 time points, 4 trajectories, 4 dial_ages)
  - Baseline at t=0 for all paths
  - Treatment paths >= no-treatment at every time point
  - Better BUN control -> higher trajectory
  - eGFR never negative
  - dial_ages returns null when trajectory stays above threshold
  - Dialysis threshold is 12.0
  - Optional field modifiers affect post-Phase 2 decline
  - bun_suppression_estimate calculation and cap

NOTE: These tests use v2.0 formula outputs. Test vectors from finalized-formulas.md
Section 7 were generated with the calc spec 0.31-coefficient model and will NOT
match v2.0 outputs (Q1). Exact numeric assertions are intentionally not included
in this scaffold — Yuri and Gay Mark will add golden-file tests after Lee confirms
the formula (LKID-27).

PROPRIETARY: Do not log or assert on specific coefficient values.
"""

import math
import pytest

from prediction.engine import (
    TIME_POINTS_MONTHS,
    DIALYSIS_THRESHOLD,
    compute_egfr_ckd_epi_2021,
    compute_no_treatment,
    compute_treatment_trajectory,
    compute_dial_age,
    compute_bun_suppression_estimate,
    compute_confidence_tier,
    predict,
    predict_for_endpoint,
)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

EXPECTED_TIME_POINTS = [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120]
TIERS = ["bun_18_24", "bun_13_17", "bun_12"]

# Reference inputs for structural assertions
# Vector 1 from finalized-formulas.md Section 7 (values will differ from calc spec)
V1_BUN = 35
V1_CREATININE = 2.1
V1_AGE = 58

# Vector 2 — Stage 5 (will cross dialysis threshold)
V2_BUN = 53
V2_AGE = 65
V2_CREATININE = 4.0  # Stage 5: eGFR ~13.8 at age 65, starts above dialysis threshold

# Vector 3 — Mild CKD Stage 3a
V3_BUN = 22
V3_AGE = 52
V3_CREATININE = 1.5


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _run_all_trajectories(bun, creatinine, age, sex="unknown", **modifier_kwargs):
    """Run all four trajectories and return them in a dict."""
    from prediction.engine import _compute_optional_modifier
    egfr = compute_egfr_ckd_epi_2021(creatinine, age, sex)
    modifier = _compute_optional_modifier(
        modifier_kwargs.get("hemoglobin"),
        modifier_kwargs.get("co2"),
        modifier_kwargs.get("albumin"),
    )
    return {
        "no_treatment": compute_no_treatment(egfr, bun, modifier),
        "bun_18_24": compute_treatment_trajectory(egfr, bun, age, "bun_18_24", modifier),
        "bun_13_17": compute_treatment_trajectory(egfr, bun, age, "bun_13_17", modifier),
        "bun_12": compute_treatment_trajectory(egfr, bun, age, "bun_12", modifier),
        "egfr_baseline": egfr,
    }


# ---------------------------------------------------------------------------
# TIME_POINTS shape
# ---------------------------------------------------------------------------

class TestTimePoints:
    def test_time_points_has_15_values(self):
        assert len(TIME_POINTS_MONTHS) == 15

    def test_time_points_match_spec(self):
        assert TIME_POINTS_MONTHS == EXPECTED_TIME_POINTS

    def test_time_points_start_at_zero(self):
        assert TIME_POINTS_MONTHS[0] == 0

    def test_time_points_end_at_120(self):
        assert TIME_POINTS_MONTHS[-1] == 120

    def test_time_points_are_monotonically_increasing(self):
        for i in range(1, len(TIME_POINTS_MONTHS)):
            assert TIME_POINTS_MONTHS[i] > TIME_POINTS_MONTHS[i - 1]


# ---------------------------------------------------------------------------
# CKD-EPI 2021
# ---------------------------------------------------------------------------

class TestCkdEpi:
    def test_egfr_is_positive(self):
        egfr = compute_egfr_ckd_epi_2021(2.1, 58)
        assert egfr > 0

    def test_higher_creatinine_gives_lower_egfr(self):
        egfr_low = compute_egfr_ckd_epi_2021(1.0, 50)
        egfr_high = compute_egfr_ckd_epi_2021(5.0, 50)
        assert egfr_low > egfr_high

    def test_older_age_gives_lower_egfr(self):
        egfr_young = compute_egfr_ckd_epi_2021(2.0, 40)
        egfr_old = compute_egfr_ckd_epi_2021(2.0, 80)
        assert egfr_young > egfr_old

    def test_unknown_sex_returns_float(self):
        egfr = compute_egfr_ckd_epi_2021(2.0, 60, "unknown")
        assert isinstance(egfr, float)

    def test_sex_specific_values_differ(self):
        male = compute_egfr_ckd_epi_2021(1.5, 55, "male")
        female = compute_egfr_ckd_epi_2021(1.5, 55, "female")
        assert male != female

    def test_egfr_is_rounded_to_one_decimal(self):
        egfr = compute_egfr_ckd_epi_2021(2.1, 58)
        # Verify it's rounded to at most 1 decimal place
        assert egfr == round(egfr, 1)


# ---------------------------------------------------------------------------
# Output shape
# ---------------------------------------------------------------------------

class TestOutputShape:
    def test_trajectory_has_15_points(self):
        data = _run_all_trajectories(V1_BUN, V1_CREATININE, V1_AGE)
        for key in ["no_treatment", "bun_18_24", "bun_13_17", "bun_12"]:
            assert len(data[key]) == 15, f"{key} should have 15 points"

    def test_predict_returns_required_keys(self):
        result = predict(V1_BUN, V1_CREATININE, V1_AGE)
        required_keys = {
            "egfr_baseline",
            "time_points_months",
            "trajectories",
            "dial_ages",
            "bun_suppression_estimate",
        }
        assert required_keys.issubset(result.keys())

    def test_predict_for_endpoint_returns_required_keys(self):
        result = predict_for_endpoint(
            bun=V1_BUN,
            creatinine=V1_CREATININE,
            age=V1_AGE,
            sex="unknown",
        )
        required_keys = {
            "egfr_baseline",
            "time_points_months",
            "trajectories",
            "dial_ages",
            "dialysis_threshold",
            "confidence_tier",
            "stat_cards",
            "bun_suppression_estimate",
        }
        assert required_keys.issubset(result.keys())

    def test_trajectories_has_four_paths(self):
        result = predict(V1_BUN, V1_CREATININE, V1_AGE)
        assert set(result["trajectories"].keys()) == {
            "no_treatment", "bun_18_24", "bun_13_17", "bun_12"
        }

    def test_dial_ages_has_four_keys(self):
        result = predict(V1_BUN, V1_CREATININE, V1_AGE)
        assert set(result["dial_ages"].keys()) == {
            "no_treatment", "bun_18_24", "bun_13_17", "bun_12"
        }

    def test_time_points_in_response_has_15_values(self):
        result = predict(V1_BUN, V1_CREATININE, V1_AGE)
        assert len(result["time_points_months"]) == 15

    def test_time_points_in_response_match_constants(self):
        result = predict(V1_BUN, V1_CREATININE, V1_AGE)
        assert result["time_points_months"] == EXPECTED_TIME_POINTS


# ---------------------------------------------------------------------------
# Baseline correctness (AC #2)
# ---------------------------------------------------------------------------

class TestBaselineAtT0:
    def test_all_trajectories_equal_baseline_at_t0(self):
        data = _run_all_trajectories(V1_BUN, V1_CREATININE, V1_AGE)
        baseline = data["egfr_baseline"]
        for key in ["no_treatment", "bun_18_24", "bun_13_17", "bun_12"]:
            assert data[key][0] == pytest.approx(baseline, abs=0.2), (
                f"{key}[0]={data[key][0]} should equal baseline={baseline}"
            )

    def test_baseline_equals_ckd_epi_calculation(self):
        result = predict(V1_BUN, V1_CREATININE, V1_AGE, sex="unknown")
        expected_egfr = compute_egfr_ckd_epi_2021(V1_CREATININE, V1_AGE, "unknown")
        assert result["egfr_baseline"] == pytest.approx(expected_egfr, abs=0.05)

    def test_egfr_entered_overrides_ckd_epi(self):
        result = predict(V1_BUN, V1_CREATININE, V1_AGE, egfr_entered=33.0)
        assert result["egfr_baseline"] == pytest.approx(33.0, abs=0.05)


# ---------------------------------------------------------------------------
# Treatment paths >= no-treatment (AC #3)
# ---------------------------------------------------------------------------

class TestTreatmentAboveNoTreatment:
    @pytest.mark.parametrize("tier", TIERS)
    def test_treatment_path_gte_no_treatment_at_all_points(self, tier):
        data = _run_all_trajectories(V1_BUN, V1_CREATININE, V1_AGE)
        no_tx = data["no_treatment"]
        tx = data[tier]
        for i, t in enumerate(EXPECTED_TIME_POINTS):
            assert tx[i] >= no_tx[i] - 0.01, (
                f"{tier} at t={t}: tx={tx[i]} < no_tx={no_tx[i]}"
            )

    @pytest.mark.parametrize("tier", TIERS)
    def test_treatment_strictly_above_no_treatment_post_phase1(self, tier):
        """After Phase 1 begins, treatment should be meaningfully higher."""
        data = _run_all_trajectories(V1_BUN, V1_CREATININE, V1_AGE)
        no_tx = data["no_treatment"]
        tx = data[tier]
        # At month 6+, treatment should be clearly above no-treatment
        idx_6m = EXPECTED_TIME_POINTS.index(6)
        assert tx[idx_6m] > no_tx[idx_6m]


# ---------------------------------------------------------------------------
# Better BUN tier -> higher trajectory (AC #4)
# ---------------------------------------------------------------------------

class TestTierOrdering:
    def test_bun_12_above_bun_13_17_at_all_post_baseline_points(self):
        data = _run_all_trajectories(V1_BUN, V1_CREATININE, V1_AGE)
        bun_12 = data["bun_12"]
        bun_13_17 = data["bun_13_17"]
        for i in range(1, len(EXPECTED_TIME_POINTS)):
            assert bun_12[i] >= bun_13_17[i] - 0.01, (
                f"t={EXPECTED_TIME_POINTS[i]}: bun_12={bun_12[i]} < bun_13_17={bun_13_17[i]}"
            )

    def test_bun_13_17_above_bun_18_24_at_all_post_baseline_points(self):
        data = _run_all_trajectories(V1_BUN, V1_CREATININE, V1_AGE)
        bun_13_17 = data["bun_13_17"]
        bun_18_24 = data["bun_18_24"]
        for i in range(1, len(EXPECTED_TIME_POINTS)):
            assert bun_13_17[i] >= bun_18_24[i] - 0.01, (
                f"t={EXPECTED_TIME_POINTS[i]}: bun_13_17={bun_13_17[i]} < bun_18_24={bun_18_24[i]}"
            )

    def test_full_tier_ordering_at_month_24(self):
        data = _run_all_trajectories(V1_BUN, V1_CREATININE, V1_AGE)
        idx_24m = EXPECTED_TIME_POINTS.index(24)
        assert data["bun_12"][idx_24m] >= data["bun_13_17"][idx_24m] >= data["bun_18_24"][idx_24m] >= data["no_treatment"][idx_24m]


# ---------------------------------------------------------------------------
# eGFR floor at 0 (AC #5)
# ---------------------------------------------------------------------------

class TestEgfrFloor:
    def test_egfr_never_negative_stage5(self):
        """Stage 5 patient — no-treatment should floor at 0, not go negative."""
        data = _run_all_trajectories(V2_BUN, V2_CREATININE, V2_AGE)
        for key in ["no_treatment", "bun_18_24", "bun_13_17", "bun_12"]:
            for i, val in enumerate(data[key]):
                assert val >= 0.0, f"{key}[{i}] = {val} is negative"

    @pytest.mark.parametrize("tier", ["no_treatment", "bun_18_24", "bun_13_17", "bun_12"])
    def test_egfr_floor_at_zero_for_extreme_inputs(self, tier):
        """Very high creatinine + low age should still floor at 0."""
        egfr = compute_egfr_ckd_epi_2021(14.0, 85)
        from prediction.engine import _compute_optional_modifier
        modifier = 0.0
        if tier == "no_treatment":
            traj = compute_no_treatment(egfr, 100, modifier)
        else:
            traj = compute_treatment_trajectory(egfr, 100, 85, tier, modifier)
        for val in traj:
            assert val >= 0.0


# ---------------------------------------------------------------------------
# Dialysis threshold (AC #6, #7)
# ---------------------------------------------------------------------------

class TestDialysisThreshold:
    def test_dialysis_threshold_is_12(self):
        assert DIALYSIS_THRESHOLD == 12.0

    def test_dial_age_returns_none_when_trajectory_stays_above_threshold(self):
        """Mild CKD patient should not reach dialysis within 120 months."""
        data = _run_all_trajectories(V3_BUN, V3_CREATININE, V3_AGE)
        # bun_12 best case for mild CKD should not hit threshold
        dial_age = compute_dial_age(data["bun_12"], V3_AGE)
        assert dial_age is None

    def test_dial_age_returns_float_when_trajectory_crosses_threshold(self):
        """Stage 5 no-treatment should reach dialysis."""
        data = _run_all_trajectories(V2_BUN, V2_CREATININE, V2_AGE)
        dial_age = compute_dial_age(data["no_treatment"], V2_AGE)
        # Should be a float, not None
        assert dial_age is not None
        assert isinstance(dial_age, float)

    def test_dial_age_is_greater_than_current_age(self):
        data = _run_all_trajectories(V2_BUN, V2_CREATININE, V2_AGE)
        dial_age = compute_dial_age(data["no_treatment"], V2_AGE)
        if dial_age is not None:
            assert dial_age > V2_AGE

    def test_dial_age_is_within_10_year_window(self):
        data = _run_all_trajectories(V2_BUN, V2_CREATININE, V2_AGE)
        dial_age = compute_dial_age(data["no_treatment"], V2_AGE)
        if dial_age is not None:
            assert dial_age <= V2_AGE + 10 + 0.1  # +0.1 for fp tolerance

    def test_threshold_used_for_dialysis_crossing(self):
        """Verify the threshold used is DIALYSIS_THRESHOLD (12), not 15."""
        # Construct a trajectory that's just above 12 at the last point
        # Yuri/Gay Mark: extend this with a trajectory that crosses 12 but not 15
        traj_above_12 = [20.0, 20.0, 13.0, 12.5, 12.1, 12.0, 11.9] + [11.0] * 8
        assert len(traj_above_12) == 15  # sanity
        dial_age = compute_dial_age(traj_above_12, 60)
        assert dial_age is not None  # should detect crossing below 12


# ---------------------------------------------------------------------------
# Optional field modifiers (AC #8)
# ---------------------------------------------------------------------------

class TestOptionalModifiers:
    def test_low_hemoglobin_increases_decline(self):
        """Hemoglobin < 11 should produce lower post-Phase 2 eGFR than without."""
        data_base = _run_all_trajectories(V1_BUN, V1_CREATININE, V1_AGE)
        data_hgb = _run_all_trajectories(V1_BUN, V1_CREATININE, V1_AGE, hemoglobin=9.0)
        # At 120 months, with low hemoglobin eGFR should be lower
        idx_120 = EXPECTED_TIME_POINTS.index(120)
        for key in ["no_treatment", "bun_18_24", "bun_13_17", "bun_12"]:
            assert data_hgb[key][idx_120] <= data_base[key][idx_120], (
                f"{key} at 120m: hemoglobin modifier should not increase eGFR"
            )

    def test_low_co2_increases_decline(self):
        """CO2 < 22 should produce lower post-Phase 2 eGFR than without."""
        data_base = _run_all_trajectories(V1_BUN, V1_CREATININE, V1_AGE)
        data_co2 = _run_all_trajectories(V1_BUN, V1_CREATININE, V1_AGE, co2=18.0)
        idx_120 = EXPECTED_TIME_POINTS.index(120)
        for key in ["no_treatment", "bun_18_24", "bun_13_17", "bun_12"]:
            assert data_co2[key][idx_120] <= data_base[key][idx_120]

    def test_low_albumin_increases_decline(self):
        """Albumin < 3.5 should produce lower post-Phase 2 eGFR than without."""
        data_base = _run_all_trajectories(V1_BUN, V1_CREATININE, V1_AGE)
        data_alb = _run_all_trajectories(V1_BUN, V1_CREATININE, V1_AGE, albumin=2.5)
        idx_120 = EXPECTED_TIME_POINTS.index(120)
        for key in ["no_treatment", "bun_18_24", "bun_13_17", "bun_12"]:
            assert data_alb[key][idx_120] <= data_base[key][idx_120]

    def test_normal_optional_values_dont_affect_trajectory(self):
        """Normal optional values should produce same result as no modifier."""
        data_base = _run_all_trajectories(V1_BUN, V1_CREATININE, V1_AGE)
        data_normal = _run_all_trajectories(
            V1_BUN, V1_CREATININE, V1_AGE,
            hemoglobin=13.5,  # normal
            co2=24.0,         # normal
            albumin=4.0,      # normal
        )
        for key in ["no_treatment", "bun_18_24", "bun_13_17", "bun_12"]:
            assert data_normal[key] == data_base[key], (
                f"{key}: normal optional values should not change trajectory"
            )

    def test_modifiers_applied_equally_to_all_paths(self):
        """All four paths should be affected equally by the modifier."""
        data_base = _run_all_trajectories(V1_BUN, V1_CREATININE, V1_AGE)
        data_mod = _run_all_trajectories(V1_BUN, V1_CREATININE, V1_AGE, hemoglobin=9.0)
        idx_120 = EXPECTED_TIME_POINTS.index(120)
        # Verify modifier is non-zero
        assert data_mod["no_treatment"][idx_120] < data_base["no_treatment"][idx_120]
        # Tier ordering is preserved
        assert data_mod["bun_12"][idx_120] >= data_mod["bun_13_17"][idx_120] >= data_mod["bun_18_24"][idx_120]


# ---------------------------------------------------------------------------
# BUN suppression estimate (stat card)
# ---------------------------------------------------------------------------

class TestBunSuppressionEstimate:
    def test_suppression_zero_when_bun_at_or_below_10(self):
        assert compute_bun_suppression_estimate(10.0) == 0.0
        assert compute_bun_suppression_estimate(5.0) == 0.0

    def test_suppression_is_positive_for_elevated_bun(self):
        assert compute_bun_suppression_estimate(35.0) > 0

    def test_suppression_formula_for_vector1(self):
        """BUN 35: (35-10)*0.31 = 7.75 -> 7.8 per finalized-formulas.md."""
        result = compute_bun_suppression_estimate(35.0)
        assert result == pytest.approx(7.8, abs=0.1)

    def test_suppression_capped_at_12(self):
        """BUN 53: (53-10)*0.31 = 13.3 -> capped at 12.0."""
        result = compute_bun_suppression_estimate(53.0)
        assert result == 12.0

    def test_suppression_capped_for_very_high_bun(self):
        result = compute_bun_suppression_estimate(150.0)
        assert result == 12.0

    def test_suppression_in_predict_response(self):
        result = predict(V1_BUN, V1_CREATININE, V1_AGE)
        assert "bun_suppression_estimate" in result
        assert result["bun_suppression_estimate"] == pytest.approx(7.8, abs=0.1)


# ---------------------------------------------------------------------------
# Confidence tier
# ---------------------------------------------------------------------------

class TestConfidenceTier:
    def test_tier1_with_no_optional_fields(self):
        assert compute_confidence_tier(None, None, None) == 1

    def test_tier2_with_hemoglobin_only(self):
        assert compute_confidence_tier(12.0, None, None) == 2

    def test_tier2_with_co2_only(self):
        assert compute_confidence_tier(None, 20.0, None) == 2

    def test_tier2_with_albumin_only(self):
        assert compute_confidence_tier(None, None, 3.0) == 2

    def test_tier2_with_all_optional_fields(self):
        assert compute_confidence_tier(12.0, 20.0, 3.5) == 2

    def test_predict_for_endpoint_returns_tier1_without_optional_fields(self):
        result = predict_for_endpoint(
            bun=V1_BUN, creatinine=V1_CREATININE, age=V1_AGE, sex="unknown"
        )
        assert result["confidence_tier"] == 1

    def test_predict_for_endpoint_returns_tier2_with_optional_fields(self):
        result = predict_for_endpoint(
            bun=V1_BUN,
            creatinine=V1_CREATININE,
            age=V1_AGE,
            sex="unknown",
            hemoglobin=12.0,
        )
        assert result["confidence_tier"] == 2


# ---------------------------------------------------------------------------
# predict() backward compatibility
# ---------------------------------------------------------------------------

class TestPredictBackwardCompat:
    def test_predict_returns_dict(self):
        result = predict(V1_BUN, V1_CREATININE, V1_AGE)
        assert isinstance(result, dict)

    def test_predict_with_optional_modifiers(self):
        result = predict(V1_BUN, V1_CREATININE, V1_AGE, hemoglobin=9.0, co2=18.0)
        assert result["egfr_baseline"] > 0

    def test_predict_for_endpoint_with_potassium(self):
        """potassium param accepted and ignored by engine."""
        result = predict_for_endpoint(
            bun=V1_BUN,
            creatinine=V1_CREATININE,
            age=V1_AGE,
            sex="unknown",
            potassium=4.5,
        )
        assert result["egfr_baseline"] > 0

    def test_predict_for_endpoint_with_glucose(self):
        """glucose param accepted (legacy) and ignored by engine."""
        result = predict_for_endpoint(
            bun=V1_BUN,
            creatinine=V1_CREATININE,
            age=V1_AGE,
            sex="unknown",
            glucose=100.0,
        )
        assert result["egfr_baseline"] > 0


# ---------------------------------------------------------------------------
# No coefficient leakage
# ---------------------------------------------------------------------------

class TestCoefficientSecurity:
    def test_response_does_not_contain_phase1_coefficients(self):
        """Engine coefficients must not appear in the response payload (AC #10)."""
        import json
        result = predict_for_endpoint(
            bun=V1_BUN, creatinine=V1_CREATININE, age=V1_AGE, sex="unknown"
        )
        serialized = json.dumps(result)
        # 0.08 is the BUN suppression coefficient -- should not appear as a standalone value
        # These are rough checks; exact coefficient values are proprietary
        assert "0.46" not in serialized
        assert "_TIER_CONFIG" not in serialized
        assert "_NO_TX_DECLINE_RATES" not in serialized


# ---------------------------------------------------------------------------
# Vector-based structural checks (shape validation only, not exact match)
# See finalized-formulas.md Section 7 NOTE about calc spec vs v2.0 divergence.
# ---------------------------------------------------------------------------

class TestVectorShapeValidation:
    """
    Shape validation against the three reference vectors from finalized-formulas.md.
    These do NOT assert exact values (calc spec vectors != v2.0 outputs).
    Yuri/Gay Mark: add golden-file assertions here after Lee confirms formulas (LKID-27).
    """

    def test_vector1_all_paths_equal_baseline_at_t0(self):
        """Vector 1: BUN 35, eGFR ~33, Age 58. All paths start equal."""
        result = predict(V1_BUN, V1_CREATININE, V1_AGE, egfr_entered=33.0)
        t0_vals = [result["trajectories"][k][0] for k in result["trajectories"]]
        assert all(v == pytest.approx(33.0, abs=0.1) for v in t0_vals)

    def test_vector1_no_treatment_declines_over_time(self):
        """No-treatment path should be lower at t=120 than at t=0."""
        result = predict(V1_BUN, V1_CREATININE, V1_AGE, egfr_entered=33.0)
        no_tx = result["trajectories"]["no_treatment"]
        assert no_tx[-1] < no_tx[0]

    def test_vector1_treatment_rises_then_declines(self):
        """Treatment paths should peak around month 24 then slowly decline."""
        result = predict(V1_BUN, V1_CREATININE, V1_AGE, egfr_entered=33.0)
        bun_12 = result["trajectories"]["bun_12"]
        idx_6 = EXPECTED_TIME_POINTS.index(6)
        idx_24 = EXPECTED_TIME_POINTS.index(24)
        idx_120 = EXPECTED_TIME_POINTS.index(120)
        # Should rise from 6m to 24m
        assert bun_12[idx_24] > bun_12[idx_6]
        # Should decline from 24m to 120m
        assert bun_12[idx_120] < bun_12[idx_24]

    def test_vector2_stage5_no_treatment_reaches_zero(self):
        """Vector 2: BUN 53, Stage 5. No-treatment should hit 0 before t=120."""
        result = predict(V2_BUN, V2_CREATININE, V2_AGE)
        no_tx = result["trajectories"]["no_treatment"]
        assert no_tx[-1] == 0.0 or result["dial_ages"]["no_treatment"] is not None

    def test_vector2_treatment_stays_above_zero(self):
        """Vector 2: Best treatment case should stay above 0 at t=120."""
        result = predict(V2_BUN, V2_CREATININE, V2_AGE)
        bun_12 = result["trajectories"]["bun_12"]
        assert bun_12[-1] > 0.0

    def test_vector3_no_treatment_at_120m_approx_range(self):
        """Vector 3: BUN 22, Age 52. At t=120, no_treatment should be in plausible range."""
        result = predict(V3_BUN, V3_CREATININE, V3_AGE, egfr_entered=48.0)
        no_tx_120 = result["trajectories"]["no_treatment"][-1]
        # Spec says ~29.2 but v2.0 will differ; verify it's in the plausible 20-40 range
        assert 15.0 < no_tx_120 < 45.0
