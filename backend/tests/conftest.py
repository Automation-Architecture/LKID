"""
Pytest configuration and shared fixtures for KidneyHood backend tests.

Provides pytest fixtures wrapping the factory functions from
tests.fixtures.factories, so tests can request them via dependency injection.
"""

import pytest

from tests.fixtures.factories import (
    make_lab_entry,
    make_lab_entry_at_max,
    make_lab_entry_at_min,
    make_lab_entry_invalid,
    make_lead,
    make_predict_request,
    make_predict_request_at_max,
    make_predict_request_at_min,
    make_tier1_entry,
    make_tier2_entry,
    # LKID-27: boundary factories
    make_boundary_bun_min,
    make_boundary_bun_max,
    make_boundary_creatinine_min,
    make_boundary_creatinine_max,
    make_boundary_age_min,
    make_boundary_age_max,
    make_boundary_hemoglobin_min,
    make_boundary_hemoglobin_max,
    make_boundary_glucose_min,
    make_boundary_glucose_max,
    make_age_just_below_70,
    make_age_70_boundary,
    make_age_just_above_70,
    make_age_just_below_80,
    make_age_80_boundary,
    make_age_just_above_80,
    make_stage_3a_lower_boundary,
    make_stage_3b_upper_boundary,
    make_stage_4_upper_boundary,
    make_dialysis_threshold_boundary,
)


@pytest.fixture
def lab_entry():
    """A valid lab entry dict with midrange defaults."""
    return make_lab_entry()


@pytest.fixture
def lab_entry_at_min():
    """A lab entry at minimum valid boundaries."""
    return make_lab_entry_at_min()


@pytest.fixture
def lab_entry_at_max():
    """A lab entry at maximum valid boundaries."""
    return make_lab_entry_at_max()


@pytest.fixture
def predict_request():
    """A valid PredictRequest-shaped dict."""
    return make_predict_request()


@pytest.fixture
def predict_request_at_min():
    """PredictRequest at minimum valid Pydantic boundaries."""
    return make_predict_request_at_min()


@pytest.fixture
def predict_request_at_max():
    """PredictRequest at maximum valid Pydantic boundaries."""
    return make_predict_request_at_max()


@pytest.fixture
def lead():
    """A valid leads table row dict with generated UUID and timestamp."""
    return make_lead()


@pytest.fixture
def tier1_entry():
    """A Tier 1 lab entry (bun, creatinine, potassium, age, sex)."""
    return make_tier1_entry()


@pytest.fixture
def tier2_entry():
    """A Tier 2 lab entry (Tier 1 + hemoglobin AND glucose)."""
    return make_tier2_entry()


@pytest.fixture
def lab_entry_factory():
    """Factory fixture -- call with overrides to create custom lab entries.

    Usage in tests:
        def test_something(lab_entry_factory):
            entry = lab_entry_factory(age=85, bun=50)
    """
    return make_lab_entry


@pytest.fixture
def predict_request_factory():
    """Factory fixture -- call with overrides to create custom predict requests."""
    return make_predict_request


@pytest.fixture
def lead_factory():
    """Factory fixture -- call with overrides to create custom leads."""
    return make_lead


# ---------------------------------------------------------------------------
# LKID-27: Boundary value fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def boundary_bun_min():
    """BUN=5 (minimum boundary)."""
    return make_boundary_bun_min()


@pytest.fixture
def boundary_bun_max():
    """BUN=150 (maximum boundary)."""
    return make_boundary_bun_max()


@pytest.fixture
def boundary_creatinine_min():
    """Creatinine=0.3 (minimum boundary)."""
    return make_boundary_creatinine_min()


@pytest.fixture
def boundary_creatinine_max():
    """Creatinine=20.0 (maximum boundary)."""
    return make_boundary_creatinine_max()


@pytest.fixture
def boundary_age_min():
    """Age=18 (minimum boundary)."""
    return make_boundary_age_min()


@pytest.fixture
def boundary_age_max():
    """Age=120 (maximum boundary)."""
    return make_boundary_age_max()


@pytest.fixture
def boundary_hemoglobin_min():
    """Hemoglobin=4.0 (minimum boundary), Tier 2 entry."""
    return make_boundary_hemoglobin_min()


@pytest.fixture
def boundary_hemoglobin_max():
    """Hemoglobin=20.0 (maximum boundary), Tier 2 entry."""
    return make_boundary_hemoglobin_max()


@pytest.fixture
def boundary_glucose_min():
    """Glucose=40 (minimum boundary), Tier 2 entry."""
    return make_boundary_glucose_min()


@pytest.fixture
def boundary_glucose_max():
    """Glucose=500 (maximum boundary), Tier 2 entry."""
    return make_boundary_glucose_max()


@pytest.fixture
def age_just_below_70():
    return make_age_just_below_70()


@pytest.fixture
def age_70_boundary():
    return make_age_70_boundary()


@pytest.fixture
def age_just_above_70():
    return make_age_just_above_70()


@pytest.fixture
def age_just_below_80():
    return make_age_just_below_80()


@pytest.fixture
def age_80_boundary():
    return make_age_80_boundary()


@pytest.fixture
def age_just_above_80():
    return make_age_just_above_80()


@pytest.fixture
def stage_3a_lower_boundary():
    """Lab entry with creatinine producing eGFR ~45."""
    return make_stage_3a_lower_boundary()


@pytest.fixture
def stage_3b_upper_boundary():
    """Lab entry with creatinine producing eGFR ~44."""
    return make_stage_3b_upper_boundary()


@pytest.fixture
def stage_4_upper_boundary():
    """Lab entry with creatinine producing eGFR ~29."""
    return make_stage_4_upper_boundary()


@pytest.fixture
def dialysis_threshold_boundary():
    """Lab entry with creatinine producing eGFR ~12."""
    return make_dialysis_threshold_boundary()
