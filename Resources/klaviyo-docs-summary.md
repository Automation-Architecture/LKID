# Klaviyo Developer Documentation Summary

> **Sourced from:** [Klaviyo Developer Docs](https://developers.klaviyo.com), [klaviyo-api-python GitHub](https://github.com/klaviyo/klaviyo-api-python)
> **SDK version:** 22.0.0 | **API revision:** 2026-01-15
> **Pulled:** 2026-03-26

---

## Table of Contents

1. [Python SDK Installation & Setup](#1-python-sdk-installation--setup)
2. [Authentication](#2-authentication)
3. [Profiles API — Create/Update Profiles](#3-profiles-api--createupdate-profiles)
4. [Events API — Track Custom Events](#4-events-api--track-custom-events)
5. [Flows — Triggering Automated Email Sequences](#5-flows--triggering-automated-email-sequences)
6. [Webhooks](#6-webhooks)
7. [Rate Limits & Error Handling](#7-rate-limits--error-handling)
8. [LKID-47 Implementation Guide](#8-lkid-47-implementation-guide)

---

## 1. Python SDK Installation & Setup

### Install

```bash
pip install klaviyo-api
```

### Instantiate the Client

```python
from klaviyo_api import KlaviyoAPI

klaviyo = KlaviyoAPI(
    "YOUR_PRIVATE_API_KEY",
    max_delay=60,      # max seconds to wait on rate-limit retry
    max_retries=3,     # number of retries on 429/5xx
)
```

The SDK wraps every Klaviyo v2 endpoint as a Python method. All API calls use JSON:API format (resource objects with `type`, `id`, `attributes`, and optional `relationships`).

### SDK Organization

Methods are grouped by resource namespace:

| Namespace | Example methods |
|-----------|----------------|
| `klaviyo.Profiles` | `create_or_update_profile()`, `get_profile()` |
| `klaviyo.Events` | `create_event()`, `get_events()` |
| `klaviyo.Flows` | `get_flows()`, `get_flow()` |
| `klaviyo.Metrics` | `get_metrics()` |
| `klaviyo.Lists` | `create_list()`, `add_profiles_to_list()` |

---

## 2. Authentication

Klaviyo uses a **private API key** for server-side calls. Set it once when constructing the client.

### Getting an API Key

1. Go to **Klaviyo > Settings > API Keys**
2. Click **Create Private API Key**
3. Grant scopes: `profiles:write`, `events:write`, `flows:read` (minimum for lead capture)
4. Copy the key — it is shown only once

### Required Scopes for LKID

| Scope | Needed for |
|-------|-----------|
| `profiles:write` | Creating/updating lead profiles |
| `events:write` | Firing "Prediction Completed" event |
| `flows:read` | (Optional) Verifying flow triggers |
| `metrics:read` | (Optional) Listing available metrics |

### Auth Header (raw HTTP)

```
Authorization: Klaviyo-API-Key YOUR_PRIVATE_API_KEY
revision: 2026-01-15
```

The Python SDK handles this automatically — just pass the key to `KlaviyoAPI()`.

> **Never expose private keys in client-side code.** Use environment variables on your server.

---

## 3. Profiles API — Create/Update Profiles

### Endpoint: Create or Update Profile

- **Method:** `POST /api/profiles/`
- **SDK:** `klaviyo.Profiles.create_or_update_profile(body)`
- **Behavior:** Returns `201` if new profile created, `200` if existing profile updated
- **Identifier:** Uses `email`, `phone_number`, or `external_id` to match existing profiles

### Request Body Schema (JSON:API)

```python
body = {
    "data": {
        "type": "profile",
        "attributes": {
            # Standard profile fields
            "email": "patient@example.com",
            "first_name": "Jane",
            "last_name": "Doe",
            "phone_number": "+15551234567",       # optional
            "external_id": "lkid_user_abc123",    # optional, your system's ID
            "location": {
                "city": "Austin",
                "region": "TX",
                "country": "US",
                "zip": "78701",
            },
            # Custom properties — arbitrary key/value pairs
            "properties": {
                "eGFR_current": 45.2,
                "eGFR_trend": "declining",
                "BUN_tier": "moderate",
                "creatinine": 1.8,
                "age": 62,
                "prediction_date": "2026-03-26",
                "lead_source": "kidneyhood_app",
                "pdf_downloaded": False,
            },
        },
    }
}
```

### Full Python Example

```python
from klaviyo_api import KlaviyoAPI

klaviyo = KlaviyoAPI("pk_abc123...", max_delay=60, max_retries=3)

profile_body = {
    "data": {
        "type": "profile",
        "attributes": {
            "email": "patient@example.com",
            "first_name": "Jane",
            "last_name": "Doe",
            "properties": {
                "eGFR_current": 45.2,
                "BUN_tier": "moderate",
                "lead_source": "kidneyhood_app",
            },
        },
    }
}

try:
    response = klaviyo.Profiles.create_or_update_profile(profile_body)
    profile_id = response["data"]["id"]
    print(f"Profile upserted: {profile_id}")
except Exception as e:
    print(f"Error creating profile: {e}")
```

### Key Points

- **Custom properties** go in `attributes.properties` — any JSON-serializable key/value. These become segmentable/filterable in Klaviyo.
- **Upsert behavior:** If a profile with the same `email` exists, its properties are merged (new keys added, existing keys updated).
- Profile properties set here are available as template variables in Flows: `{{ person.eGFR_current }}`.

---

## 4. Events API — Track Custom Events

### Endpoint: Create Event

- **Method:** `POST /api/events/`
- **SDK:** `klaviyo.Events.create_event(body)`
- **Behavior:** Creates a new event and associates it with a profile. Can create or update the profile inline.

### Request Body Schema

```python
body = {
    "data": {
        "type": "event",
        "attributes": {
            "metric": {
                "data": {
                    "type": "metric",
                    "attributes": {
                        "name": "Prediction Completed"  # Metric name — creates if new
                    }
                }
            },
            "profile": {
                "data": {
                    "type": "profile",
                    "attributes": {
                        "email": "patient@example.com",
                        # Can also include profile properties here for upsert
                        "properties": {
                            "eGFR_current": 45.2,
                            "BUN_tier": "moderate",
                        }
                    }
                }
            },
            "properties": {
                # Event-specific properties (attached to this event, not the profile)
                "eGFR_value": 45.2,
                "eGFR_stage": "Stage 3a",
                "BUN_value": 28,
                "BUN_tier": "moderate",
                "creatinine": 1.8,
                "age": 62,
                "prediction_summary": "Mild decline projected over 5 years",
            },
            "time": "2026-03-26T14:30:00+00:00",  # ISO 8601, optional (defaults to now)
            "value": 45.2,                          # Numeric value for revenue/metric tracking
            "unique_id": "pred_abc123_20260326",    # Idempotency key — prevents duplicates
        },
    }
}
```

### Full Python Example — Fire "Prediction Completed"

```python
from klaviyo_api import KlaviyoAPI
from datetime import datetime, timezone

klaviyo = KlaviyoAPI("pk_abc123...", max_delay=60, max_retries=3)

event_body = {
    "data": {
        "type": "event",
        "attributes": {
            "metric": {
                "data": {
                    "type": "metric",
                    "attributes": {
                        "name": "Prediction Completed"
                    }
                }
            },
            "profile": {
                "data": {
                    "type": "profile",
                    "attributes": {
                        "email": "patient@example.com",
                        "first_name": "Jane",
                        "last_name": "Doe",
                        "properties": {
                            "eGFR_current": 45.2,
                            "BUN_tier": "moderate",
                            "lead_source": "kidneyhood_app",
                        }
                    }
                }
            },
            "properties": {
                "eGFR_value": 45.2,
                "eGFR_stage": "Stage 3a",
                "BUN_value": 28,
                "BUN_tier": "moderate",
                "creatinine": 1.8,
                "prediction_summary": "Mild decline projected over 5 years",
            },
            "time": datetime.now(timezone.utc).isoformat(),
            "unique_id": f"pred_{patient_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        },
    }
}

try:
    klaviyo.Events.create_event(event_body)
    print("Event 'Prediction Completed' tracked successfully")
except Exception as e:
    print(f"Error tracking event: {e}")
```

### Key Points

- **Metric auto-creation:** If the metric name does not exist, Klaviyo creates it on the first event.
- **Profile upsert:** Including profile attributes in the event body will create or update the profile automatically — you do not need a separate `create_or_update_profile` call.
- **Event properties vs. profile properties:** Event properties are per-occurrence data; profile properties are persistent on the contact record.
- **`unique_id`:** Idempotency key. If you send the same `unique_id` twice, the second call is ignored. Use this to prevent duplicate events on retries.
- **`value`:** Numeric field used for Klaviyo's built-in revenue and metric aggregation.

---

## 5. Flows — Triggering Automated Email Sequences

### How It Works

Flows are **configured in the Klaviyo UI**, not via API. The backend's job is to fire the correct event — Klaviyo's flow engine handles the rest.

### Setup Steps

1. **Backend fires event** → `POST /api/events/` with metric name `"Prediction Completed"`
2. **In Klaviyo UI** → Create a Flow:
   - **Trigger:** Metric = "Prediction Completed"
   - **Filters:** Optional (e.g., only fire for `eGFR_stage == "Stage 3a"`)
   - **Actions:** Email sequence (e.g., immediate welcome email, 2-day follow-up, 7-day educational drip)
3. **Flow emails use event/profile data** as template variables:
   - `{{ event.eGFR_value }}` — from event properties
   - `{{ person.first_name }}` — from profile attributes
   - `{{ person.eGFR_current }}` — from profile custom properties

### Flow Trigger Architecture

```
┌──────────────┐    POST /api/events/     ┌──────────────┐
│  FastAPI      │ ──────────────────────── │  Klaviyo     │
│  Backend      │   "Prediction Completed" │  Events API  │
└──────────────┘                           └──────┬───────┘
                                                  │
                                           ┌──────▼───────┐
                                           │  Flow Engine  │
                                           │  (Klaviyo UI) │
                                           └──────┬───────┘
                                                  │
                                    ┌─────────────┼─────────────┐
                                    │             │             │
                              ┌─────▼────┐  ┌────▼─────┐ ┌────▼─────┐
                              │ Email #1  │  │ Email #2  │ │ Email #3  │
                              │ Immediate │  │ +2 days   │ │ +7 days   │
                              └──────────┘  └──────────┘ └──────────┘
```

### Flows API (Read-Only)

The API can *read* flows but not create/update them:

```python
# List all flows
flows = klaviyo.Flows.get_flows()

# Get flows triggered by a specific metric
# GET /api/metrics/{metric_id}/flows/
```

- **Rate limits:** Burst: 10/s, Steady: 150/m for flow read endpoints.

---

## 6. Webhooks

### Klaviyo Webhooks (Outbound)

Klaviyo can send webhooks *from* flows to your server. This is configured in the Flow editor by adding a **Webhook action**.

> **Note:** The Webhooks API (`/api/webhooks/`) is restricted to **Advanced KDP customers and Klaviyo app partners** only. For LKID, we do not need inbound Klaviyo webhooks — our pattern is: **backend pushes TO Klaviyo** (not Klaviyo pushing to us).

### LKID Pattern: Backend-Initiated (No Webhooks Needed)

For the KidneyHood lead capture, the data flow is one-directional:

```
User submits form → FastAPI processes prediction → FastAPI calls Klaviyo API → Klaviyo triggers Flow
```

We do **not** need Klaviyo to call back to our server. The backend is the initiator.

---

## 7. Rate Limits & Error Handling

### Rate Limits

| Endpoint Category | Burst | Steady |
|-------------------|-------|--------|
| **Create Event** (POST /api/events/) | 350/s | 3,500/m |
| **Create/Update Profile** (POST /api/profiles/) | 75/s | 700/m |
| **Get Profiles / Events** (GET) | 75/s | 700/m |
| **Flow endpoints** (GET) | 10/s | 150/m |

### Error Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| `200` | Profile updated | Success |
| `201` | Profile/event created | Success |
| `400` | Bad request (invalid body) | Fix payload |
| `401` | Invalid API key | Check credentials |
| `403` | Insufficient scopes | Update API key permissions |
| `409` | Conflict (duplicate) | Already exists, safe to ignore |
| `429` | Rate limited | Retry with backoff |
| `500/502/503` | Server error | Retry with backoff |

### Built-in SDK Retry

The Python SDK has **automatic retry with exponential backoff** for 429 and 5xx errors:

```python
klaviyo = KlaviyoAPI(
    "pk_abc123...",
    max_delay=60,   # max wait between retries (seconds)
    max_retries=3,  # total retry attempts
)
```

### Manual Error Handling Pattern

```python
from klaviyo_api import KlaviyoAPI
from openapi_client.exceptions import ApiException

klaviyo = KlaviyoAPI("pk_abc123...", max_delay=60, max_retries=3)

try:
    klaviyo.Events.create_event(event_body)
except ApiException as e:
    if e.status == 429:
        # SDK handles this automatically, but if max_retries exceeded:
        logger.warning(f"Klaviyo rate limited after retries: {e}")
        # Queue for background retry
    elif e.status == 400:
        logger.error(f"Klaviyo bad request: {e.body}")
        # Fix payload — do not retry
    elif e.status >= 500:
        logger.error(f"Klaviyo server error: {e.status}")
        # Queue for background retry
    else:
        logger.error(f"Klaviyo API error: {e.status} - {e.body}")
        raise
```

### Ingestion Limits

- **Events:** Max 350 events/second per account (burst), 3,500/minute (steady).
- **Profile properties:** No hard limit on number of custom properties, but keep payloads under 5MB.
- **Event properties:** Individual event payloads should stay under 5MB.

---

## 8. LKID-47 Implementation Guide

### What Donaldson Needs to Build

**Card:** LKID-47 — Lead capture webhook + Klaviyo integration
**Location:** FastAPI backend (`/tmp/lkid-work/backend/`)

### Architecture

```
POST /api/v1/predict (existing endpoint)
  │
  ├── 1. Run eGFR prediction (existing)
  ├── 2. Store result in PostgreSQL (existing)
  └── 3. NEW: Push lead to Klaviyo
        ├── a. Upsert profile with custom properties
        └── b. Fire "Prediction Completed" event
```

### Implementation Checklist

1. **Add dependency:**
   ```
   pip install klaviyo-api
   ```
   Add `klaviyo-api` to `requirements.txt` / `pyproject.toml`.

2. **Environment variable:**
   ```
   KLAVIYO_PRIVATE_API_KEY=pk_abc123...
   ```
   Set in Railway environment, never commit to repo.

3. **Create a Klaviyo service module** (`app/services/klaviyo_service.py`):

```python
"""Klaviyo integration for lead capture."""

import logging
from datetime import datetime, timezone

from klaviyo_api import KlaviyoAPI
from openapi_client.exceptions import ApiException

from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize client once at module level
_klaviyo: KlaviyoAPI | None = None


def get_klaviyo_client() -> KlaviyoAPI:
    """Lazy-initialize Klaviyo client."""
    global _klaviyo
    if _klaviyo is None:
        _klaviyo = KlaviyoAPI(
            settings.KLAVIYO_PRIVATE_API_KEY,
            max_delay=60,
            max_retries=3,
        )
    return _klaviyo


async def push_lead_to_klaviyo(
    email: str,
    first_name: str | None,
    last_name: str | None,
    egfr_value: float,
    egfr_stage: str,
    bun_value: float | None,
    bun_tier: str | None,
    creatinine: float | None,
    age: int | None,
    prediction_id: str,
) -> None:
    """
    Upsert profile and fire 'Prediction Completed' event.

    Called after a successful prediction. Fires a single Create Event
    call which both upserts the profile and tracks the event.
    """
    klaviyo = get_klaviyo_client()

    event_body = {
        "data": {
            "type": "event",
            "attributes": {
                "metric": {
                    "data": {
                        "type": "metric",
                        "attributes": {
                            "name": "Prediction Completed",
                        },
                    }
                },
                "profile": {
                    "data": {
                        "type": "profile",
                        "attributes": {
                            "email": email,
                            **({"first_name": first_name} if first_name else {}),
                            **({"last_name": last_name} if last_name else {}),
                            "properties": {
                                "eGFR_current": egfr_value,
                                "eGFR_stage": egfr_stage,
                                **({"BUN_tier": bun_tier} if bun_tier else {}),
                                "lead_source": "kidneyhood_app",
                                "last_prediction_date": datetime.now(timezone.utc).isoformat(),
                            },
                        },
                    }
                },
                "properties": {
                    "eGFR_value": egfr_value,
                    "eGFR_stage": egfr_stage,
                    **({"BUN_value": bun_value} if bun_value else {}),
                    **({"BUN_tier": bun_tier} if bun_tier else {}),
                    **({"creatinine": creatinine} if creatinine else {}),
                    **({"age": age} if age else {}),
                },
                "time": datetime.now(timezone.utc).isoformat(),
                "unique_id": f"pred_{prediction_id}",
            },
        }
    }

    try:
        klaviyo.Events.create_event(event_body)
        logger.info(f"Klaviyo event tracked for {email} (prediction {prediction_id})")
    except ApiException as e:
        # Log but do not raise — Klaviyo failure should not break the prediction flow
        logger.error(f"Klaviyo API error ({e.status}): {e.body}")
    except Exception as e:
        logger.error(f"Unexpected Klaviyo error: {e}")
```

4. **Call from the predict endpoint** (fire-and-forget, non-blocking):

```python
# In the predict route handler, after saving to DB:
import asyncio
from app.services.klaviyo_service import push_lead_to_klaviyo

# Fire-and-forget — don't await if you want non-blocking
asyncio.create_task(
    push_lead_to_klaviyo(
        email=request.email,
        first_name=request.first_name,
        last_name=request.last_name,
        egfr_value=result.egfr,
        egfr_stage=result.stage,
        bun_value=request.bun,
        bun_tier=result.bun_tier,
        creatinine=request.creatinine,
        age=request.age,
        prediction_id=str(prediction.id),
    )
)
```

5. **Klaviyo UI setup** (manual, done by marketing/ops):
   - Create Flow triggered by metric "Prediction Completed"
   - First email: immediate — "Your kidney health results are ready"
   - Second email: +3 days — educational content about eGFR stages
   - Third email: +7 days — CTA to schedule consultation
   - Use `{{ event.eGFR_stage }}` and `{{ person.first_name }}` in templates

### Data Mapping: Form Fields to Klaviyo

| Form Field | Profile Property | Event Property | Type |
|-----------|-----------------|----------------|------|
| email | `email` (standard) | — | string |
| first_name | `first_name` (standard) | — | string |
| last_name | `last_name` (standard) | — | string |
| eGFR result | `properties.eGFR_current` | `properties.eGFR_value` | float |
| eGFR stage | `properties.eGFR_stage` | `properties.eGFR_stage` | string |
| BUN value | — | `properties.BUN_value` | float |
| BUN tier | `properties.BUN_tier` | `properties.BUN_tier` | string |
| Creatinine | — | `properties.creatinine` | float |
| Age | — | `properties.age` | int |
| Prediction ID | — | `unique_id` | string |

### Why One API Call (Not Two)

The `create_event` endpoint **upserts the profile inline** when you include `profile.data.attributes`. This means a single API call both:
- Creates or updates the contact with custom properties
- Tracks the event that triggers the Flow

This is the recommended pattern — fewer API calls, atomic operation, stays within rate limits.

---

## Reference Links

- [Python SDK GitHub](https://github.com/klaviyo/klaviyo-api-python) — v22.0.0
- [Create Event API](https://developers.klaviyo.com/en/reference/create_event)
- [Create or Update Profile API](https://developers.klaviyo.com/en/reference/create_or_update_profile)
- [Events API Overview](https://developers.klaviyo.com/en/reference/events_api_overview)
- [Rate Limits & Error Handling](https://developers.klaviyo.com/en/docs/rate_limits_and_error_handling)
- [API Key Setup](https://developers.klaviyo.com/en/docs/set_up_an_api_key)
- [Flows — Getting Started](https://help.klaviyo.com/hc/en-us/articles/115002774932)
- [Webhooks API Overview](https://developers.klaviyo.com/en/reference/webhooks_api_overview)
