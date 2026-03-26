"""
Test vectors from Server-Side Calculation Specification v1.0 Section 4.
Tolerance: +/- 0.2 eGFR points.
"""

import pytest
from prediction_engine import predict, compute_bun_suppression_estimate

TOLERANCE = 0.2


def _assert_trajectory(actual, expected, label, tolerance=TOLERANCE):
    """Assert each value in a trajectory matches within tolerance."""
    assert len(actual) == len(expected), f"{label}: length mismatch {len(actual)} != {len(expected)}"
    for i, (a, e) in enumerate(zip(actual, expected)):
        assert abs(a - e) <= tolerance, (
            f"{label} index {i} (month {[0,1,3,6,12,18,24,36,48,60,72,84,96,108,120][i]}): "
            f"got {a}, expected {e}, diff {abs(a-e):.2f}"
        )


# ============================================================
# Test Vector 1 — Spec Example (BUN 35, eGFR 33, Age 58)
# ============================================================

class TestVector1:
    """BUN 35, Creatinine 2.1, Age 58, eGFR 33 (entered)."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.result = predict(bun=35, creatinine=2.1, age=58, egfr_entered=33)

    def test_egfr_baseline(self):
        assert self.result["egfr_baseline"] == 33.0

    def test_no_treatment(self):
        expected = [33.0, 32.8, 32.3, 31.7, 30.6, 29.5, 28.4, 26.3, 24.1, 22.0, 19.8, 17.7, 15.5, 13.4, 11.2]
        _assert_trajectory(self.result["trajectories"]["no_treatment"], expected, "V1 no_tx")

    def test_bun_18_24(self):
        expected = [33.0, 34.0, 35.7, 36.0, 37.0, 37.6, 37.9, 36.4, 34.9, 33.4, 31.9, 30.4, 28.9, 27.4, 25.9]
        _assert_trajectory(self.result["trajectories"]["bun_18_24"], expected, "V1 bun_18_24")

    def test_bun_13_17(self):
        expected = [33.0, 34.6, 36.9, 37.4, 39.4, 40.7, 41.4, 40.4, 39.4, 38.4, 37.4, 36.4, 35.4, 34.4, 33.4]
        _assert_trajectory(self.result["trajectories"]["bun_13_17"], expected, "V1 bun_13_17")

    def test_bun_12(self):
        expected = [33.0, 35.4, 38.7, 39.6, 42.6, 44.5, 45.7, 45.2, 44.7, 44.2, 43.7, 43.2, 42.7, 42.2, 41.7]
        _assert_trajectory(self.result["trajectories"]["bun_12"], expected, "V1 bun_12")

    def test_dial_ages_no_treatment(self):
        dial = self.result["dial_ages"]["no_treatment"]
        assert dial is not None
        assert abs(dial - 68.2) <= 0.2, f"V1 no_tx dial_age: got {dial}, expected ~68.2"

    def test_dial_ages_treatment_none(self):
        assert self.result["dial_ages"]["bun_18_24"] is None
        assert self.result["dial_ages"]["bun_13_17"] is None
        assert self.result["dial_ages"]["bun_12"] is None

    def test_bun_suppression(self):
        assert abs(self.result["bun_suppression_estimate"] - 7.8) <= 0.1


# ============================================================
# Test Vector 2 — Stage 5 High-BUN (BUN 53, eGFR 10, Age 65)
# ============================================================

class TestVector2:
    """BUN 53, eGFR 10 (entered), Age 65. Severe CKD."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.result = predict(bun=53, creatinine=5.0, age=65, egfr_entered=10)

    def test_egfr_baseline(self):
        assert self.result["egfr_baseline"] == 10.0

    def test_no_treatment_selected_points(self):
        traj = self.result["trajectories"]["no_treatment"]
        # Mo 0
        assert abs(traj[0] - 10.0) <= TOLERANCE
        # Mo 3
        assert abs(traj[2] - 8.5) <= TOLERANCE, f"V2 no_tx mo3: {traj[2]}"
        # Mo 12
        assert abs(traj[4] - 5.5) <= TOLERANCE, f"V2 no_tx mo12: {traj[4]}"
        # Mo 24
        assert abs(traj[6] - 2.0) <= TOLERANCE, f"V2 no_tx mo24: {traj[6]}"

    def test_bun_18_24_selected_points(self):
        traj = self.result["trajectories"]["bun_18_24"]
        assert abs(traj[0] - 10.0) <= TOLERANCE
        assert abs(traj[2] - 14.0) <= TOLERANCE, f"V2 bun1824 mo3: {traj[2]}"
        assert abs(traj[4] - 16.1) <= TOLERANCE, f"V2 bun1824 mo12: {traj[4]}"
        assert abs(traj[6] - 17.5) <= TOLERANCE, f"V2 bun1824 mo24: {traj[6]}"
        assert abs(traj[7] - 16.0) <= TOLERANCE, f"V2 bun1824 mo36: {traj[7]}"
        assert abs(traj[14] - 7.5) <= TOLERANCE, f"V2 bun1824 mo120: {traj[14]}"

    def test_bun_13_17_selected_points(self):
        traj = self.result["trajectories"]["bun_13_17"]
        assert abs(traj[2] - 16.4) <= TOLERANCE, f"V2 bun1317 mo3: {traj[2]}"
        assert abs(traj[4] - 20.2) <= TOLERANCE, f"V2 bun1317 mo12: {traj[4]}"
        assert abs(traj[6] - 22.4) <= TOLERANCE, f"V2 bun1317 mo24: {traj[6]}"
        assert abs(traj[7] - 21.4) <= TOLERANCE, f"V2 bun1317 mo36: {traj[7]}"
        assert abs(traj[14] - 15.4) <= TOLERANCE, f"V2 bun1317 mo120: {traj[14]}"

    def test_bun_12_selected_points(self):
        traj = self.result["trajectories"]["bun_12"]
        assert abs(traj[2] - 19.4) <= TOLERANCE, f"V2 bun12 mo3: {traj[2]}"
        assert abs(traj[4] - 24.9) <= TOLERANCE, f"V2 bun12 mo12: {traj[4]}"
        assert abs(traj[6] - 27.4) <= TOLERANCE, f"V2 bun12 mo24: {traj[6]}"
        assert abs(traj[7] - 26.9) <= TOLERANCE, f"V2 bun12 mo36: {traj[7]}"
        assert abs(traj[14] - 22.4) <= TOLERANCE, f"V2 bun12 mo120: {traj[14]}"

    def test_dial_ages(self):
        dial = self.result["dial_ages"]
        # No treatment: ~66.7
        assert dial["no_treatment"] is not None
        assert abs(dial["no_treatment"] - 66.7) <= 0.2, f"V2 no_tx dial: {dial['no_treatment']}"
        # BUN 18-24: ~74.5
        assert dial["bun_18_24"] is not None
        assert abs(dial["bun_18_24"] - 74.5) <= 0.5, f"V2 bun1824 dial: {dial['bun_18_24']}"
        # BUN 13-17 and BUN 12: None (no crossing)
        assert dial["bun_13_17"] is None
        assert dial["bun_12"] is None

    def test_bun_suppression(self):
        # (53 - 10) * 0.31 = 13.33, capped at 12.0
        assert abs(self.result["bun_suppression_estimate"] - 13.3) <= 0.1


# ============================================================
# Test Vector 3 — Mild CKD (BUN 22, eGFR 48, Age 52)
# ============================================================

class TestVector3:
    """BUN 22, eGFR 48 (entered), Age 52. Stage 3a, low BUN delta."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.result = predict(bun=22, creatinine=1.5, age=52, egfr_entered=48)

    def test_egfr_baseline(self):
        assert self.result["egfr_baseline"] == 48.0

    def test_no_treatment_selected_points(self):
        traj = self.result["trajectories"]["no_treatment"]
        assert abs(traj[0] - 48.0) <= TOLERANCE
        assert abs(traj[2] - 47.6) <= TOLERANCE, f"V3 no_tx mo3: {traj[2]}"
        assert abs(traj[6] - 44.8) <= TOLERANCE, f"V3 no_tx mo24: {traj[6]}"
        assert abs(traj[14] - 29.2) <= TOLERANCE, f"V3 no_tx mo120: {traj[14]}"

    def test_bun_18_24_selected_points(self):
        traj = self.result["trajectories"]["bun_18_24"]
        assert abs(traj[0] - 48.0) <= TOLERANCE
        assert abs(traj[2] - 48.3) <= TOLERANCE, f"V3 bun1824 mo3: {traj[2]}"
        assert abs(traj[6] - 49.0) <= TOLERANCE, f"V3 bun1824 mo24: {traj[6]}"
        assert abs(traj[14] - 34.0) <= TOLERANCE, f"V3 bun1824 mo120: {traj[14]}"

    def test_bun_13_17_selected_points(self):
        traj = self.result["trajectories"]["bun_13_17"]
        assert abs(traj[2] - 49.3) <= TOLERANCE, f"V3 bun1317 mo3: {traj[2]}"
        assert abs(traj[6] - 52.2) <= TOLERANCE, f"V3 bun1317 mo24: {traj[6]}"
        assert abs(traj[14] - 42.2) <= TOLERANCE, f"V3 bun1317 mo120: {traj[14]}"

    def test_bun_12_selected_points(self):
        traj = self.result["trajectories"]["bun_12"]
        assert abs(traj[2] - 51.1) <= TOLERANCE, f"V3 bun12 mo3: {traj[2]}"
        assert abs(traj[6] - 57.4) <= TOLERANCE, f"V3 bun12 mo24: {traj[6]}"
        assert abs(traj[14] - 52.9) <= TOLERANCE, f"V3 bun12 mo120: {traj[14]}"

    def test_bun_suppression(self):
        # (22 - 10) * 0.31 = 3.72 -> 3.7
        assert abs(self.result["bun_suppression_estimate"] - 3.7) <= 0.1
