"""
Sentry ``before_send`` scrubber (LKID-72).

Strips ``report_token`` bearer credentials from every Sentry event payload
before it leaves the process. Tokens are 256-bit bearer credentials
(LKID-62 MED-01 policy); a token leaking into Sentry's ingest is equivalent
to handing an attacker the keys to every stored prediction for that user.

We walk the event dict recursively and scrub any token-shaped path segment
(`/results/<token>`, `/gate/<token>`, `/reports/<token>`) we can find in:
- exception values + messages
- request URL / query string
- breadcrumb messages + data
- extra / tags dicts

The scrubber accepts both a string and a dict path and returns a scrubbed
copy (mutating the input dict in place is fine — Sentry's ``before_send``
hook expects the event dict back).
"""

from __future__ import annotations

import re
from typing import Any

# Matches any path segment of the form
#   /results/<token>, /gate/<token>, /reports/<token>
# followed by either end-of-string or a `?`, `/`, `&`, `#`, whitespace, quote.
# The token pattern mirrors `secrets.token_urlsafe(32)` output (>=20 URL-safe
# base64 chars), so it is conservative: we will not scrub unrelated short
# path ids.
REPORT_TOKEN_PATH_RE = re.compile(
    r"/(results|gate|reports)/[A-Za-z0-9_-]{20,}"
)

REDACTED = "/\\1/[REDACTED]"


def _scrub_string(value: str) -> str:
    """Replace any token-shaped path in ``value`` with ``/<route>/[REDACTED]``."""
    return REPORT_TOKEN_PATH_RE.sub(lambda m: f"/{m.group(1)}/[REDACTED]", value)


def _scrub_any(value: Any) -> Any:
    """Recursively walk ``value`` and scrub any string member."""
    if isinstance(value, str):
        return _scrub_string(value)
    if isinstance(value, list):
        return [_scrub_any(item) for item in value]
    if isinstance(value, tuple):
        return tuple(_scrub_any(item) for item in value)
    if isinstance(value, dict):
        return {key: _scrub_any(val) for key, val in value.items()}
    return value


def scrub_report_token(event: dict, hint: dict | None = None) -> dict | None:
    """Sentry ``before_send`` hook — scrub ``report_token`` from every field.

    Visits the well-known locations where tokens can land:

      * ``event['request']['url']`` / ``['query_string']`` / ``['data']``
      * ``event['exception']['values'][*]['value']`` (exception messages)
      * ``event['breadcrumbs']['values'][*]`` — both ``message`` + ``data``
      * ``event['extra']``
      * ``event['tags']``
      * ``event['logentry']['message']`` / ``['params']``

    Unknown fields are left untouched to minimise the blast radius.

    Returns the (mutated) event dict. Returning ``None`` from a
    ``before_send`` hook would drop the event entirely, which is not what
    we want — we want to forward a scrubbed copy.
    """
    del hint  # unused; Sentry passes it for callers that need raw exc info

    if not isinstance(event, dict):
        return event  # pragma: no cover — defensive only

    # Request metadata
    request = event.get("request")
    if isinstance(request, dict):
        for key in ("url", "query_string", "data"):
            if key in request:
                request[key] = _scrub_any(request[key])

    # Exception values (messages + stack frame locals, if any)
    exception = event.get("exception")
    if isinstance(exception, dict):
        values = exception.get("values")
        if isinstance(values, list):
            for exc_entry in values:
                if isinstance(exc_entry, dict):
                    if "value" in exc_entry:
                        exc_entry["value"] = _scrub_any(exc_entry["value"])
                    stacktrace = exc_entry.get("stacktrace")
                    if isinstance(stacktrace, dict):
                        frames = stacktrace.get("frames")
                        if isinstance(frames, list):
                            for frame in frames:
                                if isinstance(frame, dict) and "vars" in frame:
                                    frame["vars"] = _scrub_any(frame["vars"])

    # Breadcrumbs — messages + data payloads
    breadcrumbs = event.get("breadcrumbs")
    if isinstance(breadcrumbs, dict):
        values = breadcrumbs.get("values")
        if isinstance(values, list):
            for crumb in values:
                if isinstance(crumb, dict):
                    if "message" in crumb:
                        crumb["message"] = _scrub_any(crumb["message"])
                    if "data" in crumb:
                        crumb["data"] = _scrub_any(crumb["data"])

    # Logentry (from the logging integration — `logger.exception(...)` calls)
    logentry = event.get("logentry")
    if isinstance(logentry, dict):
        for key in ("message", "formatted", "params"):
            if key in logentry:
                logentry[key] = _scrub_any(logentry[key])

    # Extra + tags — arbitrary user-supplied context
    if "extra" in event:
        event["extra"] = _scrub_any(event["extra"])
    if "tags" in event:
        event["tags"] = _scrub_any(event["tags"])

    return event


__all__ = ["scrub_report_token", "REPORT_TOKEN_PATH_RE"]
