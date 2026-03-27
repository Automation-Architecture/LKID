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
    make_lead,
    make_predict_request,
    make_predict_request_at_max,
    make_predict_request_at_min,
    make_tier1_entry,
    make_tier2_entry,
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
