"""
Klaviyo "Prediction Completed" event integration (LKID-62 / LKID-47).

Fires a single `create_event` call that both upserts the Klaviyo profile and
tracks the "Prediction Completed" event. One API call, atomic upsert — the
pattern recommended in `Resources/klaviyo-docs-summary.md` §8.

The Klaviyo Python SDK (`klaviyo-api==23.0.0`) is synchronous; we dispatch
through `asyncio.to_thread` for parity with Resend. The event payload shape
mirrors techspec §8.5 / Jira LKID-62 Implementation Notes.

Env vars:
- KLAVIYO_PRIVATE_API_KEY — required. If unset, `track_prediction_completed`
                            logs a warning and returns False.

Failure policy: never raises. The /leads handler has already returned 200
to the user; a Klaviyo failure must never surface.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

logger = logging.getLogger(__name__)

EVENT_METRIC_NAME = "Prediction Completed"
LEAD_SOURCE = "kidneyhood_app"

# Cache the KlaviyoAPI client per api_key so successive calls don't
# re-initialize the HTTP client. Keyed by api_key because Railway env changes
# are rare but not impossible (e.g. key rotation) and we want the next request
# after a rotation to pick up the new key.
_client_cache: dict[str, Any] = {}


def _bun_tier(bun: float | None) -> str:
    """Klaviyo segmentation category for BUN level.

    Mirrors the 4 scenarios shown in the results chart (<=12 best ->
    >24 worst). ASCII-only labels so they match the rest of this
    service's string conventions (no non-ASCII values live elsewhere
    in the event payload).
    """
    if bun is None:
        return "unknown"
    if bun <= 12:
        return "<=12"
    if bun <= 17:
        return "13-17"
    if bun <= 24:
        return "18-24"
    return ">24"


def _get_client(api_key: str) -> Any:
    """Return a cached KlaviyoAPI client for the given api_key.

    Import is lazy so `import services.klaviyo_service` stays cheap even
    when tests do not need the SDK.
    """
    cached = _client_cache.get(api_key)
    if cached is not None:
        return cached
    from klaviyo_api import KlaviyoAPI

    client = KlaviyoAPI(api_key, max_delay=60, max_retries=3)
    _client_cache[api_key] = client
    return client


def _build_event_body(
    *,
    email: str,
    name: Optional[str],
    prediction_id: str,
    egfr_baseline: float,
    confidence_tier: Optional[Any],
    report_url: str,
    bun: Optional[float] = None,
) -> dict:
    """Construct the JSON:API body for Klaviyo Events.create_event."""
    # Split name into first/last for Klaviyo's standard profile fields.
    first_name = ""
    last_name = ""
    if name:
        parts = name.strip().split(maxsplit=1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) == 2 else ""

    profile_attributes: dict = {"email": email}
    if first_name:
        profile_attributes["first_name"] = first_name
    if last_name:
        profile_attributes["last_name"] = last_name

    # Custom profile properties — persistent on the contact for segmentation.
    profile_properties: dict = {
        "eGFR_current": egfr_baseline,
        "lead_source": LEAD_SOURCE,
        "last_prediction_date": datetime.now(timezone.utc).isoformat(),
    }
    if confidence_tier is not None:
        profile_properties["confidence_tier"] = confidence_tier
    profile_attributes["properties"] = profile_properties

    # Event-specific properties — per-occurrence; available as
    # {{ event.eGFR_value }} in Flow templates.
    event_properties: dict = {
        "eGFR_value": egfr_baseline,
        "bun_tier": _bun_tier(bun),
        "report_url": report_url,
    }
    if confidence_tier is not None:
        event_properties["confidence_tier"] = confidence_tier

    return {
        "data": {
            "type": "event",
            "attributes": {
                "metric": {
                    "data": {
                        "type": "metric",
                        "attributes": {"name": EVENT_METRIC_NAME},
                    }
                },
                "profile": {
                    "data": {
                        "type": "profile",
                        "attributes": profile_attributes,
                    }
                },
                "properties": event_properties,
                "time": datetime.now(timezone.utc).isoformat(),
                # Idempotency — resending the same prediction_id is a no-op.
                "unique_id": f"pred_{prediction_id}",
            },
        }
    }


def _send_sync(*, api_key: str, event_body: dict) -> None:
    """Synchronous Klaviyo create_event — called from asyncio.to_thread."""
    client = _get_client(api_key)
    client.Events.create_event(event_body)


async def track_prediction_completed(
    *,
    email: str,
    name: Optional[str],
    prediction_id: str,
    egfr_baseline: float,
    confidence_tier: Optional[Any] = None,
    report_url: str,
    bun: Optional[float] = None,
) -> bool:
    """Fire the "Prediction Completed" Klaviyo event. Never raises.

    Returns True on success, False on misconfiguration or API failure.

    Args:
        email:            Lead email (event profile key).
        name:             Optional full name; split into first/last.
        prediction_id:    UUID from `predictions.id` (NOT the report_token).
                          Used as the Klaviyo `unique_id` for idempotency.
        egfr_baseline:    Engine output eGFR (mL/min/1.73m²).
        confidence_tier:  Optional engine confidence tier (1 or 2). Accepted
                          as Any to handle int or str callers gracefully.
        report_url:       Full https URL to /results/{token}; included in
                          event properties for use in Flow email templates.
        bun:              Optional BUN value from prediction inputs. Bucketed
                          into `bun_tier` (<=12 / 13-17 / 18-24 / >24) for
                          Klaviyo Flow segmentation. Missing -> "unknown".
    """
    api_key = os.environ.get("KLAVIYO_PRIVATE_API_KEY", "").strip()
    if not api_key:
        logger.warning(
            "KLAVIYO_PRIVATE_API_KEY not configured; skipping event fire"
        )
        return False

    event_body = _build_event_body(
        email=email,
        name=name,
        prediction_id=prediction_id,
        egfr_baseline=egfr_baseline,
        confidence_tier=confidence_tier,
        report_url=report_url,
        bun=bun,
    )

    try:
        await asyncio.to_thread(
            _send_sync, api_key=api_key, event_body=event_body
        )
        logger.info(
            "Klaviyo 'Prediction Completed' event tracked (pred=%s)",
            prediction_id,
        )
        return True
    except Exception as exc:
        # Log type + prediction_id only — no email/PHI.
        logger.exception(
            "Klaviyo create_event failed for pred %s: %s",
            prediction_id,
            type(exc).__name__,
        )
        return False
