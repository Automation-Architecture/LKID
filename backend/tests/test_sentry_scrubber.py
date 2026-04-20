"""
Tests for `sentry_scrubber.scrub_report_token` (LKID-72).

The scrubber is a `before_send` hook that must redact every occurrence of a
`report_token` bearer path (`/results/<token>`, `/gate/<token>`,
`/reports/<token>`) from an outgoing Sentry event. MED-01 policy: tokens
are 256-bit bearer credentials and must never appear in Sentry logs.

We assert the scrubber walks:
- request.url / request.query_string / request.data
- exception.values[*].value
- breadcrumbs.values[*].message + .data.url
- logentry.message / .formatted
- extra + tags

and that the redaction preserves the route prefix so Sentry grouping is
still useful (`/results/[REDACTED]` ≠ `/reports/[REDACTED]`).
"""

from __future__ import annotations

# Make the backend package importable when pytest is run from repo root.
import os
import sys

BACKEND_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), os.pardir)
)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from sentry_scrubber import (  # noqa: E402 — path munged above
    REPORT_TOKEN_PATH_RE,
    _scrub_string,
    scrub_report_token,
)

# A realistic, 43-char `secrets.token_urlsafe(32)` style token.
SAMPLE_TOKEN = "Abc123xyz_DEF456-uvw789GHI012jkl345MNO678pqr"


def test_scrub_string_redacts_each_route() -> None:
    assert (
        _scrub_string(f"/results/{SAMPLE_TOKEN}")
        == "/results/[REDACTED]"
    )
    assert (
        _scrub_string(f"/gate/{SAMPLE_TOKEN}") == "/gate/[REDACTED]"
    )
    assert (
        _scrub_string(f"/reports/{SAMPLE_TOKEN}/pdf")
        == "/reports/[REDACTED]/pdf"
    )


def test_scrub_string_leaves_non_token_paths_alone() -> None:
    # Short path segments (e.g. pagination ids) must NOT be scrubbed.
    assert _scrub_string("/api/v1/users/42") == "/api/v1/users/42"
    assert _scrub_string("/labs") == "/labs"
    # Unrelated routes with a long segment are still untouched because
    # the regex anchors on the three token-bearing route prefixes only.
    assert (
        _scrub_string(f"/health/{SAMPLE_TOKEN}")
        == f"/health/{SAMPLE_TOKEN}"
    )


def test_regex_is_exported_for_frontend_parity_checks() -> None:
    # The exported pattern is the single source of truth — a future
    # refactor that tweaks the regex will be caught by this assertion
    # if the value diverges.
    assert REPORT_TOKEN_PATH_RE.pattern == (
        r"/(results|gate|reports)/[A-Za-z0-9_-]{20,}"
    )


def test_scrub_event_redacts_all_known_locations() -> None:
    event: dict = {
        "request": {
            "url": f"https://api.example.com/results/{SAMPLE_TOKEN}",
            "query_string": f"redirect=/gate/{SAMPLE_TOKEN}",
            "data": {
                "token_url": f"/reports/{SAMPLE_TOKEN}/pdf",
                "unrelated": "keep-me",
            },
        },
        "exception": {
            "values": [
                {
                    "type": "HTTPException",
                    "value": (
                        "Upstream 500 while fetching "
                        f"/results/{SAMPLE_TOKEN}"
                    ),
                }
            ]
        },
        "breadcrumbs": {
            "values": [
                {
                    "category": "http",
                    "message": f"GET /gate/{SAMPLE_TOKEN}",
                    "data": {
                        "url": f"https://x.example.com/gate/{SAMPLE_TOKEN}",
                        "method": "GET",
                    },
                }
            ]
        },
        "logentry": {
            "message": "Token rotated token_url=%s",
            "formatted": (
                f"Token rotated token_url=/reports/{SAMPLE_TOKEN}"
            ),
        },
        "extra": {
            "report_ref": f"/results/{SAMPLE_TOKEN}",
        },
        "tags": {
            "last_seen": f"/gate/{SAMPLE_TOKEN}",
        },
    }

    scrubbed = scrub_report_token(event, None)
    assert scrubbed is event  # in-place mutation, returns same object

    # Nothing token-shaped survives anywhere.
    rendered = repr(scrubbed)
    assert SAMPLE_TOKEN not in rendered, (
        "Scrubber left a token in the event payload: " + rendered
    )

    # Route prefix is preserved to keep Sentry grouping meaningful.
    assert "/results/[REDACTED]" in scrubbed["request"]["url"]
    assert "/gate/[REDACTED]" in scrubbed["request"]["query_string"]
    assert (
        "/reports/[REDACTED]/pdf"
        == scrubbed["request"]["data"]["token_url"]
    )
    assert (
        scrubbed["exception"]["values"][0]["value"].endswith(
            "/results/[REDACTED]"
        )
    )
    assert (
        scrubbed["breadcrumbs"]["values"][0]["message"]
        == "GET /gate/[REDACTED]"
    )
    assert (
        scrubbed["breadcrumbs"]["values"][0]["data"]["url"]
        == "https://x.example.com/gate/[REDACTED]"
    )
    assert scrubbed["logentry"]["formatted"].endswith(
        "/reports/[REDACTED]"
    )
    assert scrubbed["extra"]["report_ref"] == "/results/[REDACTED]"
    assert scrubbed["tags"]["last_seen"] == "/gate/[REDACTED]"

    # Unrelated fields are passed through untouched.
    assert (
        scrubbed["request"]["data"]["unrelated"] == "keep-me"
    )
    assert (
        scrubbed["breadcrumbs"]["values"][0]["data"]["method"] == "GET"
    )


def test_scrub_event_is_safe_on_empty_event() -> None:
    assert scrub_report_token({}, None) == {}


def test_scrub_event_tolerates_missing_subtrees() -> None:
    event = {"level": "error", "message": "boom"}
    # Must return a usable dict, not None (None would drop the event).
    assert scrub_report_token(event, None) is event
