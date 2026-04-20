"""
Integration tests for the LKID-62 tokenized flow endpoints.

Covers:
    POST /predict              returns a report_token and writes to DB
    GET  /results/{token}      200 / 404 / 410
    POST /leads                upsert + link + fire-and-forget email/klaviyo
    GET  /reports/{token}/pdf  Playwright render (mocked)

No live database or external APIs are required. Instead these tests stand
up an in-memory fake session factory that captures SQL statements and
parameter dicts executed against it, and they monkeypatch
`services.resend_service.send_report_email`,
`services.klaviyo_service.track_prediction_completed`, and Playwright
helpers on `main`.

Why an in-memory fake, not SQLite/Postgres:
- The migration under test (LKID-61) already has a SQL-generation test
  suite (`test_predictions_table.py`).
- The existing backend tests intentionally avoid a DB dependency
  (`conftest.py` provides factory fixtures only).
- The goal here is endpoint wiring, not SQL correctness: did the handler
  run the expected statements, in the expected order, with the expected
  parameters?

Fires run as part of the tight loop:
    pytest tests/test_new_flow_endpoints.py -v
"""

from __future__ import annotations

import asyncio
import copy
import uuid
from datetime import datetime, timezone
from typing import Any, Optional
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

import main


# ---------------------------------------------------------------------------
# Fake async session — stores INSERT/SELECT/UPDATE results and hands them
# back to handler code in the shape SQLAlchemy would produce.
# ---------------------------------------------------------------------------


class _FakeResult:
    """Mimics the subset of `sqlalchemy.engine.Result` that our handlers
    touch: `.mappings().first()`."""

    def __init__(self, row: Optional[dict[str, Any]]):
        self._row = row

    def mappings(self) -> "_FakeResult":
        return self

    def first(self) -> Optional[dict[str, Any]]:
        return self._row


class _FakeAllResult:
    """Like `_FakeResult` but for `.mappings().all()` — multi-row queries
    (BUN distribution, predictions_per_day, recent_leads)."""

    def __init__(self, rows: list[dict[str, Any]]):
        self._rows = rows

    def mappings(self) -> "_FakeAllResult":
        return self

    def all(self) -> list[dict[str, Any]]:
        return list(self._rows)

    # Some callers also request .first(); return the first row for safety.
    def first(self) -> Optional[dict[str, Any]]:
        return self._rows[0] if self._rows else None


class _TxCtx:
    """Async context manager for `session.begin()`."""

    def __init__(self, session: "_FakeSession"):
        self._session = session

    async def __aenter__(self):
        return self._session

    async def __aexit__(self, exc_type, exc, tb):
        return False


class _FakeSession:
    """In-memory fake of `AsyncSession`.

    Owns a pointer to the shared `FakeStore` so the same data is visible
    across sessions and across requests within a test.
    """

    def __init__(self, store: "FakeStore"):
        self.store = store
        self.calls: list[tuple[str, dict[str, Any]]] = []

    async def execute(self, stmt, params: Optional[dict[str, Any]] = None):
        sql = str(stmt).lower()
        params = params or {}
        self.calls.append((sql, params))
        return self.store.dispatch(sql, params)

    async def commit(self) -> None:
        pass

    def begin(self) -> _TxCtx:
        return _TxCtx(self)

    async def __aenter__(self) -> "_FakeSession":
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakeStore:
    """The heart of the fake DB: maps `report_token` -> prediction dict,
    `email` -> lead dict. Handlers mutate these via `dispatch()`."""

    def __init__(self) -> None:
        # report_token -> prediction row
        self.predictions: dict[str, dict[str, Any]] = {}
        # email -> lead row
        self.leads_by_email: dict[str, dict[str, Any]] = {}
        # lead_id -> lead row (populated alongside leads_by_email)
        self.leads_by_id: dict[str, dict[str, Any]] = {}

    # --- helpers that tests and handlers both use ---

    def seed_prediction(
        self,
        *,
        token: str,
        result: dict[str, Any],
        inputs: Optional[dict[str, Any]] = None,
        revoked: bool = False,
        lead_id: Optional[str] = None,
        email_sent_at: Optional[datetime] = None,
    ) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        row = {
            "id": uuid.uuid4(),
            "report_token": token,
            "token_created_at": now,
            "revoked_at": now if revoked else None,
            "inputs": inputs or {},
            "result": result,
            "lead_id": uuid.UUID(lead_id) if lead_id else None,
            "email_sent_at": email_sent_at,
            "created_at": now,
        }
        self.predictions[token] = row
        return row

    def seed_lead(
        self, *, email: str, name: str = "Test User"
    ) -> dict[str, Any]:
        lead_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        row = {
            "id": lead_id,
            "email": email,
            "name": name,
            "created_at": now,
            "updated_at": None,
        }
        self.leads_by_email[email] = row
        self.leads_by_id[str(lead_id)] = row
        return row

    # --- the switch that turns SQL strings into result rows ---

    def dispatch(self, sql_lower: str, params: dict[str, Any]) -> _FakeResult:
        # INSERT INTO predictions
        if "insert into predictions" in sql_lower:
            token = params["report_token"]
            # The handler json.dumps() the payloads; decode to match a
            # real Postgres JSONB round-trip.
            import json as _json
            self.predictions[token] = {
                "id": uuid.uuid4(),
                "report_token": token,
                "token_created_at": datetime.now(timezone.utc),
                "revoked_at": None,
                "inputs": _json.loads(params["inputs"]),
                "result": _json.loads(params["result"]),
                "lead_id": None,
                "email_sent_at": None,
                "created_at": datetime.now(timezone.utc),
            }
            return _FakeResult(None)

        # SELECT ... FROM predictions WHERE report_token = :token
        if "from predictions" in sql_lower and "report_token" in sql_lower:
            token = params["token"]
            row = self.predictions.get(token)
            return _FakeResult(copy.copy(row) if row else None)

        # INSERT INTO leads ... ON CONFLICT (email) DO UPDATE RETURNING id
        if "insert into leads" in sql_lower:
            email = params["email"]
            name = params["name"]
            existing = self.leads_by_email.get(email)
            if existing:
                existing["name"] = name
                existing["updated_at"] = datetime.now(timezone.utc)
                return _FakeResult({"id": existing["id"]})
            row = self.seed_lead(email=email, name=name)
            return _FakeResult({"id": row["id"]})

        # UPDATE predictions SET lead_id / email_sent_at
        if "update predictions" in sql_lower:
            token = params["token"]
            row = self.predictions.get(token)
            if row is not None:
                if "lead_id" in params:
                    row["lead_id"] = params["lead_id"]
                if "email_sent_at" in sql_lower:
                    row["email_sent_at"] = datetime.now(timezone.utc)
            return _FakeResult(None)

        # SELECT ... FROM leads WHERE id = :lead_id
        if "from leads" in sql_lower and "where id" in sql_lower:
            lead_id = params["lead_id"]
            # lead_id may be a UUID object or string
            row = self.leads_by_id.get(str(lead_id))
            return _FakeResult(copy.copy(row) if row else None)

        # --- LKID-75 metrics endpoint dispatch ----------------------------
        # COUNT predictions (total / last_7d / last_24h)
        if (
            "from predictions" in sql_lower
            and "count(*)" in sql_lower
            and "last_7d" in sql_lower
        ):
            total = len(self.predictions)
            return _FakeResult(
                {"total": total, "last_7d": total, "last_24h": total}
            )

        # COUNT leads (total / last_7d / last_24h)
        if (
            "from leads" in sql_lower
            and "count(*)" in sql_lower
            and "last_7d" in sql_lower
        ):
            total = len(self.leads_by_email)
            return _FakeResult(
                {"total": total, "last_7d": total, "last_24h": total}
            )

        # SELECT inputs ->> 'bun' FROM predictions (BUN tier distribution)
        if "inputs ->> 'bun'" in sql_lower and "from predictions" in sql_lower and "lead_id" not in sql_lower:
            rows = []
            for pred in self.predictions.values():
                bun = (pred.get("inputs") or {}).get("bun")
                rows.append({"bun_raw": str(bun) if bun is not None else None})
            return _FakeAllResult(rows)

        # generate_series daily rollup (predictions_per_day)
        if "generate_series" in sql_lower:
            # Return 7 zero-filled days; tests don't assert on exact counts.
            from datetime import date, timedelta as _td

            today = date.today()
            rows = [
                {
                    "day": (today - _td(days=6 - i)).isoformat(),
                    "n": 0,
                }
                for i in range(7)
            ]
            return _FakeAllResult(rows)

        # Recent leads: WITH latest_pred ... JOIN leads
        if "latest_pred" in sql_lower:
            rows = []
            # Most recent leads first, bounded to 10.
            sorted_leads = sorted(
                self.leads_by_email.values(),
                key=lambda r: r.get("created_at") or datetime.min.replace(tzinfo=timezone.utc),
                reverse=True,
            )[:10]
            for lead in sorted_leads:
                # Find most recent prediction linked to this lead.
                linked_preds = [
                    p
                    for p in self.predictions.values()
                    if p.get("lead_id") is not None
                    and str(p.get("lead_id")) == str(lead["id"])
                ]
                bun_raw: Optional[str] = None
                if linked_preds:
                    linked_preds.sort(
                        key=lambda p: p.get("created_at") or datetime.min.replace(tzinfo=timezone.utc),
                        reverse=True,
                    )
                    bun = (linked_preds[0].get("inputs") or {}).get("bun")
                    bun_raw = str(bun) if bun is not None else None
                rows.append(
                    {
                        "created_at": lead.get("created_at"),
                        "name": lead.get("name"),
                        "email": lead.get("email"),
                        "bun_raw": bun_raw,
                    }
                )
            return _FakeAllResult(rows)

        return _FakeResult(None)


# ---------------------------------------------------------------------------
# Pytest fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def store(monkeypatch) -> FakeStore:
    """Install a FakeStore-backed async session factory onto `main`.

    Overwrites `main.async_session` (the factory `AsyncSession()`) so every
    `async with main.async_session() as session:` in handler code yields
    our fake session, which talks to the shared in-memory store.
    """
    fake = FakeStore()

    def session_factory() -> _FakeSession:
        return _FakeSession(fake)

    monkeypatch.setattr(main, "async_session", session_factory)
    return fake


@pytest.fixture
def client(store) -> TestClient:
    """TestClient using the fake-store-backed app. Depends on `store` so
    tests that want the client get the fake DB by default."""
    with TestClient(main.app) as c:
        yield c


@pytest.fixture
def predict_body() -> dict[str, Any]:
    """A minimal valid POST /predict body."""
    return {
        "bun": 25.0,
        "creatinine": 1.5,
        "potassium": 4.2,
        "age": 55,
        "sex": "male",
    }


@pytest.fixture(autouse=True)
def _disable_rate_limiter():
    """slowapi keys on client IP; TestClient always uses 127.0.0.1, so the
    5/min /leads limit trips across tests. Disable globally for this module
    — rate-limit behavior is not what these tests are exercising."""
    original = main.limiter.enabled
    main.limiter.enabled = False
    yield
    main.limiter.enabled = original


@pytest.fixture(autouse=True)
def _silence_fire_and_forget(monkeypatch):
    """Default: stub Resend + Klaviyo so tests that don't care about the
    fire-and-forget pipeline don't hit real networks and don't complain
    about orphaned tasks.

    Individual tests that care can override these via monkeypatch.
    """
    monkeypatch.setattr(
        "services.resend_service.send_report_email",
        AsyncMock(return_value=True),
    )
    monkeypatch.setattr(
        "main.send_report_email",
        AsyncMock(return_value=True),
    )
    monkeypatch.setattr(
        "services.klaviyo_service.track_prediction_completed",
        AsyncMock(return_value=True),
    )
    monkeypatch.setattr(
        "main.track_prediction_completed",
        AsyncMock(return_value=True),
    )
    # Also stub the Playwright render to succeed with a dummy PDF payload.
    monkeypatch.setattr(
        "main._render_pdf_for_token",
        AsyncMock(return_value=b"%PDF-1.4 fake\n"),
    )


async def _drain_background_tasks() -> None:
    """Yield the event loop a few times so `asyncio.create_task()` bodies
    fired from the handler have a chance to run to completion before a
    test asserts on their side effects.

    The handler's create_task spins up _send_report_email_task which then
    awaits render/Resend/Klaviyo mocks. Each `await` is a suspension
    point, so 5 yields is comfortably enough.
    """
    for _ in range(5):
        await asyncio.sleep(0)


# ---------------------------------------------------------------------------
# POST /predict
# ---------------------------------------------------------------------------


class TestPredictEndpoint:
    def test_predict_returns_token_and_persists(
        self, client: TestClient, store: FakeStore, predict_body
    ):
        r = client.post("/predict", json=predict_body)
        assert r.status_code == 200, r.text
        data = r.json()

        # Token shape: `secrets.token_urlsafe(32)` -> 43 chars of URL-safe b64
        assert "report_token" in data
        token = data["report_token"]
        assert isinstance(token, str)
        assert 32 < len(token) <= 64
        assert "=" not in token  # token_urlsafe strips padding

        # Engine response still populated (back-compat with old /predict page)
        assert "egfr_baseline" in data
        assert "trajectories" in data
        assert "stat_cards" in data

        # Row landed in the fake store with the expected columns.
        row = store.predictions[token]
        assert row["lead_id"] is None
        assert row["email_sent_at"] is None
        assert row["revoked_at"] is None
        assert row["inputs"]["bun"] == 25.0
        assert row["inputs"]["age"] == 55
        assert row["result"]["egfr_baseline"] == data["egfr_baseline"]

    def test_predict_ignores_legacy_name_email_fields(
        self, client: TestClient, store: FakeStore, predict_body
    ):
        """LKID-62: the old /predict page still sends name+email. Pydantic
        silently drops them; they must not appear in stored `inputs`."""
        body = {**predict_body, "name": "Legacy", "email": "x@example.com"}
        r = client.post("/predict", json=body)
        assert r.status_code == 200

        token = r.json()["report_token"]
        stored_inputs = store.predictions[token]["inputs"]
        assert "name" not in stored_inputs
        assert "email" not in stored_inputs

    def test_predict_response_has_no_pii_fields(
        self, client: TestClient, predict_body
    ):
        """Sanity check: the old `name`/`email` keys are not echoed back."""
        r = client.post(
            "/predict", json={**predict_body, "name": "x", "email": "x@y.com"}
        )
        assert r.status_code == 200
        data = r.json()
        assert "name" not in data
        assert "email" not in data


# ---------------------------------------------------------------------------
# GET /results/{token}
# ---------------------------------------------------------------------------


class TestResultsEndpoint:
    def test_results_valid_token(self, client: TestClient, store: FakeStore):
        store.seed_prediction(
            token="tok-valid",
            result={"egfr_baseline": 33.0, "confidence_tier": 1},
        )

        r = client.get("/results/tok-valid")
        assert r.status_code == 200, r.text

        data = r.json()
        assert data["report_token"] == "tok-valid"
        assert data["captured"] is False
        assert data["lead"] is None
        assert data["result"]["egfr_baseline"] == 33.0
        # created_at should be an ISO string
        assert isinstance(data["created_at"], str)
        assert len(data["created_at"]) > 0

    def test_results_invalid_token(
        self, client: TestClient, store: FakeStore
    ):
        r = client.get("/results/bogus")
        assert r.status_code == 404
        # Our error envelope wraps under `error`
        body = r.json()
        assert body.get("detail") == "Report not found" or body.get(
            "error", {}
        ).get("message")

    def test_results_revoked_token(
        self, client: TestClient, store: FakeStore
    ):
        store.seed_prediction(
            token="tok-revoked",
            result={"egfr_baseline": 30.0, "confidence_tier": 1},
            revoked=True,
        )
        r = client.get("/results/tok-revoked")
        assert r.status_code == 410

    def test_results_captured_flag_when_linked(
        self, client: TestClient, store: FakeStore
    ):
        """captured=true + lead block populated when a lead has linked."""
        lead = store.seed_lead(email="jane@example.com", name="Jane Doe")
        store.seed_prediction(
            token="tok-captured",
            result={"egfr_baseline": 40.0, "confidence_tier": 2},
            lead_id=str(lead["id"]),
        )

        r = client.get("/results/tok-captured")
        assert r.status_code == 200

        data = r.json()
        assert data["captured"] is True
        assert data["lead"] is not None
        assert data["lead"]["name"] == "Jane Doe"
        # email_captured_at should be ISO (or null if nothing set)
        assert "email_captured_at" in data["lead"]

    def test_results_response_includes_inputs(
        self, client: TestClient, store: FakeStore, predict_body
    ):
        """LKID-63 IS-01: frontend structural-floor callout requires inputs.bun.

        Round-trip via POST /predict (BUN=18 → structural-floor tier) then
        GET /results/{token} must return the stored `inputs` JSONB so the
        /results page can render the BUN > 17 callout in prod (MSW mocks
        already include it; this closes the prod regression).
        """
        body = {**predict_body, "bun": 18.0}
        r = client.post("/predict", json=body)
        assert r.status_code == 200, r.text
        token = r.json()["report_token"]

        r = client.get(f"/results/{token}")
        assert r.status_code == 200, r.text
        data = r.json()

        assert "inputs" in data
        assert data["inputs"]["bun"] == 18.0
        # Sanity: other validated fields round-trip too.
        assert data["inputs"]["age"] == body["age"]
        assert data["inputs"]["sex"] == body["sex"]
        # Safety: no PII should leak via inputs (name/email are captured
        # separately via POST /leads and never stored in predictions.inputs).
        assert "name" not in data["inputs"]
        assert "email" not in data["inputs"]


# ---------------------------------------------------------------------------
# POST /leads
# ---------------------------------------------------------------------------


class TestLeadsEndpoint:
    def test_leads_upsert_and_link(
        self, client: TestClient, store: FakeStore
    ):
        store.seed_prediction(
            token="tok-gate-000000000000000000000000000000000",
            result={"egfr_baseline": 33.0, "confidence_tier": 1},
        )

        r = client.post(
            "/leads",
            json={
                "report_token": "tok-gate-000000000000000000000000000000000",
                "name": "Jane Doe",
                "email": "jane@example.com",
            },
        )
        assert r.status_code == 200, r.text

        body = r.json()
        assert body["ok"] is True
        assert body["captured"] is True
        assert body["token"] == "tok-gate-000000000000000000000000000000000"

        # Lead row was created
        assert "jane@example.com" in store.leads_by_email
        lead_id = store.leads_by_email["jane@example.com"]["id"]

        # Prediction is now linked
        pred_row = store.predictions["tok-gate-000000000000000000000000000000000"]
        # The handler passed the raw UUID into the UPDATE params — our fake
        # store wrote it straight through.
        assert pred_row["lead_id"] == lead_id

    def test_leads_duplicate_email_updates_not_creates(
        self, client: TestClient, store: FakeStore
    ):
        """Second POST with the same email must upsert, not duplicate."""
        store.seed_prediction(
            token="tok-1-long-enough-for-validation-padding-xxx",
            result={"egfr_baseline": 33.0, "confidence_tier": 1},
        )
        store.seed_prediction(
            token="tok-2-long-enough-for-validation-padding-xxx",
            result={"egfr_baseline": 30.0, "confidence_tier": 1},
        )

        r1 = client.post(
            "/leads",
            json={
                "report_token": "tok-1-long-enough-for-validation-padding-xxx",
                "name": "First",
                "email": "dup@example.com",
            },
        )
        assert r1.status_code == 200
        first_lead_id = store.leads_by_email["dup@example.com"]["id"]

        r2 = client.post(
            "/leads",
            json={
                "report_token": "tok-2-long-enough-for-validation-padding-xxx",
                "name": "Second",
                "email": "dup@example.com",
            },
        )
        assert r2.status_code == 200

        # Still exactly one lead for this email
        assert len(store.leads_by_email) == 1
        second_row = store.leads_by_email["dup@example.com"]
        assert second_row["id"] == first_lead_id  # same row, upserted
        assert second_row["name"] == "Second"     # name updated
        assert second_row["updated_at"] is not None

    def test_leads_invalid_token(self, client: TestClient):
        r = client.post(
            "/leads",
            json={
                "report_token": "does-not-exist-but-long-enough-32chars",
                "name": "X",
                "email": "x@example.com",
            },
        )
        assert r.status_code == 404

    def test_leads_revoked_token_returns_410(
        self, client: TestClient, store: FakeStore
    ):
        store.seed_prediction(
            token="tok-revoked-lead-padded-to-over-32-chars-yes",
            result={"egfr_baseline": 30.0},
            revoked=True,
        )
        r = client.post(
            "/leads",
            json={
                "report_token": "tok-revoked-lead-padded-to-over-32-chars-yes",
                "name": "X",
                "email": "x@example.com",
            },
        )
        assert r.status_code == 410

    @pytest.mark.anyio
    async def test_leads_fires_email_and_klaviyo(
        self, store: FakeStore, monkeypatch
    ):
        """Both Resend and Klaviyo are called once with expected keys."""
        send_mock = AsyncMock(return_value=True)
        klav_mock = AsyncMock(return_value=True)
        monkeypatch.setattr("main.send_report_email", send_mock)
        monkeypatch.setattr("main.track_prediction_completed", klav_mock)
        monkeypatch.setattr(
            "main._render_pdf_for_token",
            AsyncMock(return_value=b"%PDF-1.4 stub"),
        )

        store.seed_prediction(
            token="tok-send-padded-to-meet-32-char-minimum-xxx",
            result={"egfr_baseline": 28.5, "confidence_tier": 2},
            inputs={
                "bun": 18.0,
                "creatinine": 1.5,
                "potassium": 4.2,
                "age": 55,
                "sex": "male",
            },
        )

        with TestClient(main.app) as c:
            r = c.post(
                "/leads",
                json={
                    "report_token": "tok-send-padded-to-meet-32-char-minimum-xxx",
                    "name": "Alice",
                    "email": "alice@example.com",
                },
            )
        assert r.status_code == 200

        # Let the fire-and-forget pipeline finish.
        await _drain_background_tasks()

        # Resend called once with an HTML body + PDF bytes.
        assert send_mock.await_count == 1
        kwargs = send_mock.await_args.kwargs
        assert kwargs["to_email"] == "alice@example.com"
        assert isinstance(kwargs["html_body"], str)
        assert kwargs["pdf_bytes"] == b"%PDF-1.4 stub"

        # Klaviyo called once with the expected profile + event fields.
        assert klav_mock.await_count == 1
        kkw = klav_mock.await_args.kwargs
        assert kkw["email"] == "alice@example.com"
        assert kkw["name"] == "Alice"
        assert kkw["egfr_baseline"] == 28.5
        assert kkw["confidence_tier"] == 2
        assert kkw["report_url"].endswith(
            "/results/tok-send-padded-to-meet-32-char-minimum-xxx"
        )
        # LKID-47: bun is plumbed through from stored inputs so the Klaviyo
        # service can tag the event with `bun_tier` for Flow segmentation.
        # BUN=18.0 falls in the "18-24" bucket (see services.klaviyo_service._bun_tier).
        assert kkw["bun"] == 18.0
        # prediction_id is a UUID string, not the report_token.
        assert uuid.UUID(kkw["prediction_id"])

        # email_sent_at should now be set.
        assert store.predictions["tok-send-padded-to-meet-32-char-minimum-xxx"]["email_sent_at"] is not None

    @pytest.mark.anyio
    async def test_leads_resend_failure_logged_not_surfaced(
        self, store: FakeStore, monkeypatch, caplog
    ):
        """If Resend raises or returns False, /leads still returns 200 and
        email_sent_at is NOT set."""
        send_mock = AsyncMock(return_value=False)  # failure
        klav_mock = AsyncMock(return_value=True)
        monkeypatch.setattr("main.send_report_email", send_mock)
        monkeypatch.setattr("main.track_prediction_completed", klav_mock)
        monkeypatch.setattr(
            "main._render_pdf_for_token",
            AsyncMock(return_value=b"%PDF-1.4 stub"),
        )

        store.seed_prediction(
            token="tok-resend-fail-padded-to-meet-32-char-min",
            result={"egfr_baseline": 25.0, "confidence_tier": 1},
        )

        with TestClient(main.app) as c:
            r = c.post(
                "/leads",
                json={
                    "report_token": "tok-resend-fail-padded-to-meet-32-char-min",
                    "name": "Bob",
                    "email": "bob@example.com",
                },
            )

        assert r.status_code == 200
        await _drain_background_tasks()

        # Resend was called and returned False.
        assert send_mock.await_count == 1
        # email_sent_at remains unset because Resend did not succeed.
        assert store.predictions["tok-resend-fail-padded-to-meet-32-char-min"]["email_sent_at"] is None
        # Klaviyo should still have fired (independent of Resend outcome).
        assert klav_mock.await_count == 1

    @pytest.mark.anyio
    async def test_leads_pdf_failure_uses_fallback_template(
        self, store: FakeStore, monkeypatch
    ):
        """When Playwright render raises, the email body still goes out
        using the fallback template (no attachment) and email_sent_at is
        still set if Resend succeeded."""
        send_mock = AsyncMock(return_value=True)
        klav_mock = AsyncMock(return_value=True)
        render_fail = AsyncMock(side_effect=RuntimeError("playwright boom"))
        monkeypatch.setattr("main.send_report_email", send_mock)
        monkeypatch.setattr("main.track_prediction_completed", klav_mock)
        monkeypatch.setattr("main._render_pdf_for_token", render_fail)

        store.seed_prediction(
            token="tok-pdf-fail-padded-to-meet-32-char-min-xxx",
            result={"egfr_baseline": 20.0, "confidence_tier": 1},
        )

        with TestClient(main.app) as c:
            r = c.post(
                "/leads",
                json={
                    "report_token": "tok-pdf-fail-padded-to-meet-32-char-min-xxx",
                    "name": "Carol",
                    "email": "carol@example.com",
                },
            )

        assert r.status_code == 200
        await _drain_background_tasks()

        # Resend was called with no attachment (PDF failure fallback path).
        assert send_mock.await_count == 1
        kwargs = send_mock.await_args.kwargs
        assert kwargs["pdf_bytes"] is None
        # Fallback template renders the /results/{token} link.
        assert "tok-pdf-fail-padded-to-meet-32-char-min-xxx" in kwargs["html_body"]
        # email_sent_at still set — the email did go out.
        assert store.predictions["tok-pdf-fail-padded-to-meet-32-char-min-xxx"]["email_sent_at"] is not None


# ---------------------------------------------------------------------------
# GET /reports/{token}/pdf
# ---------------------------------------------------------------------------


class TestPdfEndpoint:
    def test_pdf_endpoint_valid_token(
        self, client: TestClient, store: FakeStore, monkeypatch
    ):
        monkeypatch.setattr(
            "main._render_pdf_for_token",
            AsyncMock(return_value=b"%PDF-1.4 stub body"),
        )
        store.seed_prediction(
            token="tok-pdf-ok",
            result={"egfr_baseline": 33.0, "confidence_tier": 1},
        )

        r = client.get("/reports/tok-pdf-ok/pdf")
        assert r.status_code == 200
        assert r.headers["content-type"] == "application/pdf"
        assert "kidney-health-report.pdf" in r.headers["content-disposition"]
        assert r.content.startswith(b"%PDF")

    def test_pdf_endpoint_unknown_token(self, client: TestClient):
        r = client.get("/reports/no-such-token/pdf")
        assert r.status_code == 404

    def test_pdf_endpoint_revoked_token(
        self, client: TestClient, store: FakeStore
    ):
        store.seed_prediction(
            token="tok-pdf-revoked",
            result={"egfr_baseline": 30.0},
            revoked=True,
        )
        r = client.get("/reports/tok-pdf-revoked/pdf")
        assert r.status_code == 410

    def test_pdf_endpoint_timeout_returns_504(
        self, client: TestClient, store: FakeStore, monkeypatch
    ):
        """HIGH-01 (PR #35 QA): Playwright's own TimeoutError is NOT a
        subclass of asyncio.TimeoutError, so a real 30s render timeout
        previously landed in the generic `except Exception` and returned
        500 instead of the AC-required 504.

        Regression test: monkeypatch the render helper to raise
        PlaywrightTimeoutError (pulled from `main` so the fallback
        definition is exercised when playwright isn't installed) and
        assert the endpoint maps it to 504.
        """
        # Use the same class main caught — that's the whole point of the
        # regression. If playwright is installed, this is the real
        # Playwright class; if not, it's main's fallback.
        PwTimeoutError = main.PlaywrightTimeoutError

        store.seed_prediction(
            token="tok-pdf-timeout",
            result={"egfr_baseline": 33.0, "confidence_tier": 1},
        )
        monkeypatch.setattr(
            "main._render_pdf_for_token",
            AsyncMock(
                side_effect=PwTimeoutError("Timeout 30000ms exceeded.")
            ),
        )

        r = client.get("/reports/tok-pdf-timeout/pdf")
        assert r.status_code == 504
        # Error envelope should surface the timeout detail.
        body = r.json()
        detail = body.get("detail") or body.get("error", {}).get("message", "")
        assert "timed out" in detail.lower() or "timeout" in detail.lower()

    def test_pdf_endpoint_generic_failure_returns_500(
        self, client: TestClient, store: FakeStore, monkeypatch
    ):
        """Paired with the 504 test: a non-timeout render failure still
        returns 500 (not 504). Guards against over-broad timeout catching
        from the HIGH-01 fix."""
        store.seed_prediction(
            token="tok-pdf-generic-fail",
            result={"egfr_baseline": 33.0, "confidence_tier": 1},
        )
        monkeypatch.setattr(
            "main._render_pdf_for_token",
            AsyncMock(side_effect=RuntimeError("chromium crashed")),
        )
        r = client.get("/reports/tok-pdf-generic-fail/pdf")
        assert r.status_code == 500


# ---------------------------------------------------------------------------
# MED-02 (PR #35 QA): Klaviyo fires regardless of Resend-pipeline failures.
# ---------------------------------------------------------------------------


class TestKlaviyoIndependentOfResend:
    @pytest.mark.anyio
    async def test_klaviyo_fires_even_when_resend_fails(
        self, store: FakeStore, monkeypatch
    ):
        """If Resend raises outright (network, SDK error), Klaviyo must
        still fire. The fire-and-forget pipeline restructures so the two
        integrations are independent try/except blocks."""
        send_mock = AsyncMock(side_effect=RuntimeError("resend down"))
        klav_mock = AsyncMock(return_value=True)
        monkeypatch.setattr("main.send_report_email", send_mock)
        monkeypatch.setattr("main.track_prediction_completed", klav_mock)
        monkeypatch.setattr(
            "main._render_pdf_for_token",
            AsyncMock(return_value=b"%PDF-1.4 stub"),
        )

        store.seed_prediction(
            token="tok-klav-indep-padded-to-meet-32-char-min",
            result={"egfr_baseline": 28.5, "confidence_tier": 2},
        )

        with TestClient(main.app) as c:
            r = c.post(
                "/leads",
                json={
                    "report_token": "tok-klav-indep-padded-to-meet-32-char-min",
                    "name": "Dana",
                    "email": "dana@example.com",
                },
            )
        assert r.status_code == 200
        await _drain_background_tasks()

        # Resend was attempted and raised.
        assert send_mock.await_count == 1
        # Klaviyo fires regardless — the warm-campaign event must not be
        # gated on transactional email success.
        assert klav_mock.await_count == 1
        # email_sent_at remains unset because Resend never returned True.
        assert (
            store.predictions[
                "tok-klav-indep-padded-to-meet-32-char-min"
            ]["email_sent_at"]
            is None
        )

    @pytest.mark.anyio
    async def test_klaviyo_fires_even_when_template_render_fails(
        self, store: FakeStore, monkeypatch
    ):
        """Template render failure used to short-circuit Klaviyo (MED-02).
        Now the Klaviyo call is in its own try block and fires regardless."""
        send_mock = AsyncMock(return_value=True)
        klav_mock = AsyncMock(return_value=True)
        monkeypatch.setattr("main.send_report_email", send_mock)
        monkeypatch.setattr("main.track_prediction_completed", klav_mock)
        monkeypatch.setattr(
            "main._render_pdf_for_token",
            AsyncMock(return_value=b"%PDF-1.4 stub"),
        )
        # Force the template renderer to blow up.
        monkeypatch.setattr(
            "main.render_report_email",
            lambda **_: (_ for _ in ()).throw(
                ValueError("template boom")
            ),
        )

        store.seed_prediction(
            token="tok-tmpl-fail-padded-to-meet-32-char-min",
            result={"egfr_baseline": 25.0, "confidence_tier": 1},
        )

        with TestClient(main.app) as c:
            r = c.post(
                "/leads",
                json={
                    "report_token": "tok-tmpl-fail-padded-to-meet-32-char-min",
                    "name": "Eve",
                    "email": "eve@example.com",
                },
            )
        assert r.status_code == 200
        await _drain_background_tasks()

        # Resend was never called (template render crashed before send).
        assert send_mock.await_count == 0
        # Klaviyo still fires — this is the MED-02 invariant.
        assert klav_mock.await_count == 1


# ---------------------------------------------------------------------------
# MED-03 (PR #35 QA): Resend attachment payload is base64, not list[int].
# ---------------------------------------------------------------------------


class TestResendAttachmentEncoding:
    def test_resend_attachment_is_base64(self, monkeypatch):
        """The Resend SDK's Attachment TypedDict accepts
        Union[List[int], str], where the string form is base64. The previous
        list(pdf_bytes) form inflated payload JSON ~4-5x for real PDFs.

        Calls the synchronous internal `_send_sync` helper directly (which
        the async `send_report_email` dispatches via asyncio.to_thread),
        stubs the Resend SDK's Emails.send at the call site, and asserts
        the captured `content` is a base64 string that decodes to the
        original bytes. Bypasses the autouse _silence_fire_and_forget
        fixture which replaces the async wrapper.
        """
        import base64 as _b64
        from services.resend_service import _send_sync
        import resend as _resend_sdk

        captured: dict = {}

        def fake_send(params):
            captured["params"] = params

        monkeypatch.setattr(_resend_sdk.Emails, "send", fake_send)

        pdf = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\nbinary body \x00\x01\x02"
        _send_sync(
            to_email="user@example.com",
            subject="Your Kidney Health Report",
            html="<p>hi</p>",
            from_email="reports@kidneyhood.org",
            pdf_bytes=pdf,
        )

        attachments = captured["params"]["attachments"]
        assert len(attachments) == 1
        content = attachments[0]["content"]

        # Must be a base64-encoded string, NOT a list[int].
        assert isinstance(content, str), (
            f"attachment content must be a base64 str, got {type(content).__name__}"
        )
        # And it must decode back to the original bytes.
        assert _b64.b64decode(content) == pdf
        # Sanity: content_type + filename preserved.
        assert attachments[0]["content_type"] == "application/pdf"
        assert attachments[0]["filename"] == "kidney-health-report.pdf"

    def test_resend_no_attachment_when_pdf_bytes_none(self, monkeypatch):
        """Fallback path: when pdf_bytes is None, no attachments key is
        added to the Resend params (template handles the /results link)."""
        from services.resend_service import _send_sync
        import resend as _resend_sdk

        captured: dict = {}

        def fake_send(params):
            captured["params"] = params

        monkeypatch.setattr(_resend_sdk.Emails, "send", fake_send)

        _send_sync(
            to_email="user@example.com",
            subject="Your Kidney Health Report",
            html="<p>fallback</p>",
            from_email="reports@kidneyhood.org",
            pdf_bytes=None,
        )

        assert "attachments" not in captured["params"]


# ---------------------------------------------------------------------------
# klaviyo_service direct unit coverage — bucket + payload shape.
# ---------------------------------------------------------------------------


class TestKlaviyoBunTier:
    """Direct coverage of `_bun_tier` and its placement in the event body.

    The integration test above stubs `main.track_prediction_completed` so
    the `bun_tier` bucket itself never flows through the real builder.
    These tests exercise `services.klaviyo_service` directly.
    """

    def test_bun_tier_buckets(self):
        from services.klaviyo_service import _bun_tier

        assert _bun_tier(None) == "unknown"
        assert _bun_tier(8.0) == "<=12"
        assert _bun_tier(12.0) == "<=12"
        assert _bun_tier(13.0) == "13-17"
        assert _bun_tier(17.0) == "13-17"
        assert _bun_tier(17.5) == "18-24"  # (17, 24] -> 18-24
        assert _bun_tier(18.0) == "18-24"
        assert _bun_tier(24.0) == "18-24"
        assert _bun_tier(24.5) == ">24"
        assert _bun_tier(99.9) == ">24"

    def test_event_body_includes_bun_tier(self):
        from services.klaviyo_service import _build_event_body

        body = _build_event_body(
            email="user@example.com",
            name="Test User",
            prediction_id="11111111-2222-3333-4444-555555555555",
            egfr_baseline=28.5,
            confidence_tier=2,
            report_url="https://example.com/results/abc",
            bun=18.0,
        )
        props = body["data"]["attributes"]["properties"]
        assert props["bun_tier"] == "18-24"
        # The existing event properties are still present — no regressions.
        assert props["eGFR_value"] == 28.5
        assert props["report_url"].endswith("/results/abc")
        assert props["confidence_tier"] == 2

    def test_event_body_bun_tier_unknown_when_missing(self):
        from services.klaviyo_service import _build_event_body

        body = _build_event_body(
            email="user@example.com",
            name=None,
            prediction_id="11111111-2222-3333-4444-555555555555",
            egfr_baseline=28.5,
            confidence_tier=None,
            report_url="https://example.com/results/abc",
            # bun omitted
        )
        assert (
            body["data"]["attributes"]["properties"]["bun_tier"] == "unknown"
        )


# ---------------------------------------------------------------------------
# LKID-75: GET /client/{slug}/metrics — Lee dashboard launch-metrics panel.
# ---------------------------------------------------------------------------


class TestClientDashboardMetricsEndpoint:
    def test_unknown_slug_returns_404(self, client: TestClient):
        """Slug allowlist — any slug not in CLIENT_DASHBOARD_SLUGS 404s."""
        r = client.get("/client/not-a-real-slug/metrics")
        assert r.status_code == 404

    def test_metrics_shape_with_empty_db(self, client: TestClient):
        """Empty DB: counts are 0 and the opt-in gate fires with a
        machine-readable `insufficient_data` reason."""
        r = client.get("/client/lee-a3f8b2/metrics")
        assert r.status_code == 200, r.text
        body = r.json()

        # Top-level keys — locked for frontend consumption.
        assert set(body.keys()) == {
            "generated_at",
            "predictions",
            "leads",
            "opt_in_rate",
            "bun_tier_distribution",
            "predictions_per_day",
            "recent_leads",
        }

        # Prediction / lead shapes.
        assert body["predictions"] == {"total": 0, "last_7d": 0, "last_24h": 0}
        assert body["leads"] == {"total": 0, "last_7d": 0, "last_24h": 0}

        # Opt-in-rate gate triggered (0 < 10 min sample).
        assert body["opt_in_rate"]["visible"] is False
        assert body["opt_in_rate"]["percent"] is None
        assert body["opt_in_rate"]["reason"] == "insufficient_data"
        assert body["opt_in_rate"]["min_sample"] == 10

        # BUN distribution present with all five buckets zero-filled.
        assert body["bun_tier_distribution"] == {
            "<=12": 0,
            "13-17": 0,
            "18-24": 0,
            ">24": 0,
            "unknown": 0,
        }

        # Sparkline has 7 day entries.
        assert len(body["predictions_per_day"]) == 7
        for day_entry in body["predictions_per_day"]:
            assert set(day_entry.keys()) == {"day", "count"}

        # No leads yet.
        assert body["recent_leads"] == []

    def test_metrics_opt_in_visible_above_min_sample(
        self, client: TestClient, store: FakeStore
    ):
        """>=10 predictions with linked leads surfaces a real percentage."""
        # Seed 12 predictions, 3 of which link to a lead (25.0%).
        for i in range(12):
            token = f"tok-metrics-{i:03d}-padded-to-meet-32-char-min"
            store.seed_prediction(
                token=token,
                result={"egfr_baseline": 40.0 + i, "confidence_tier": 1},
                inputs={"bun": 15.0 + i, "age": 55, "sex": "male"},
            )
        # Link the first 3 predictions to leads.
        for i in range(3):
            token = f"tok-metrics-{i:03d}-padded-to-meet-32-char-min"
            lead = store.seed_lead(
                email=f"lead{i}@example.com", name=f"Lead {i}"
            )
            store.predictions[token]["lead_id"] = lead["id"]

        r = client.get("/client/lee-a3f8b2/metrics")
        assert r.status_code == 200, r.text
        body = r.json()

        # Opt-in rate is visible and matches 3/12 = 25.0%.
        assert body["opt_in_rate"]["visible"] is True
        assert body["opt_in_rate"]["reason"] is None
        assert body["opt_in_rate"]["percent"] == 25.0

        # Predictions total picked up all 12 rows.
        assert body["predictions"]["total"] == 12
        # Leads total matches the 3 seeded rows.
        assert body["leads"]["total"] == 3

    def test_metrics_masks_emails_and_bucket_buns(
        self, client: TestClient, store: FakeStore
    ):
        """HIPAA: recent_leads must mask emails + tier BUN, never leak raw."""
        # Seed a prediction with BUN=20 (tier 18-24) and link it to a lead.
        token = "tok-metrics-hipaa-padded-to-meet-32-char-min"
        store.seed_prediction(
            token=token,
            result={"egfr_baseline": 35.0, "confidence_tier": 2},
            inputs={"bun": 20.0, "age": 60, "sex": "female"},
        )
        lead = store.seed_lead(email="alice@example.com", name="Alice Smith")
        store.predictions[token]["lead_id"] = lead["id"]

        r = client.get("/client/lee-a3f8b2/metrics")
        assert r.status_code == 200, r.text
        body = r.json()

        assert len(body["recent_leads"]) == 1
        entry = body["recent_leads"][0]
        # Email masked per the spec: first char of local + *** + @ +
        # first char of domain + **** + .TLD.
        assert entry["email_masked"] == "a***@e****.com"
        assert entry["name_initial"] == "A"
        # BUN=20 lands in the 18-24 bucket.
        assert entry["bun_tier"] == "18-24"
        # Never leak raw PII.
        assert "email" not in entry
        assert "name" not in entry
        assert "bun" not in entry


class TestClientMetricsHelpers:
    """Direct unit coverage for _mask_email / _bun_tier_label / _name_initial.

    Supplements the integration tests above — cheap to run, catches edge
    cases (subdomains, single-char emails, no-TLD, None) that the fake-DB
    path can't reach without convoluted seeding.
    """

    def test_bun_tier_label_boundaries(self):
        from main import _bun_tier_label

        assert _bun_tier_label(None) == "unknown"
        assert _bun_tier_label("not-a-number") == "unknown"
        assert _bun_tier_label(5.0) == "<=12"
        assert _bun_tier_label(12.0) == "<=12"
        assert _bun_tier_label(12.5) == "13-17"
        assert _bun_tier_label(17.0) == "13-17"
        assert _bun_tier_label(17.5) == "18-24"
        assert _bun_tier_label(24.0) == "18-24"
        assert _bun_tier_label(24.5) == ">24"
        assert _bun_tier_label(120.0) == ">24"

    def test_mask_email_edge_cases(self):
        from main import _mask_email

        # Standard form.
        assert _mask_email("alice@example.com") == "a***@e****.com"
        # Co-TLD — only the final dot-segment is the "TLD" for masking.
        assert _mask_email("bob@example.co.uk") == "b***@e****.uk"
        # Single-char local.
        assert _mask_email("j@example.com") == "j***@e****.com"
        # Empty / malformed.
        assert _mask_email(None) == "***"
        assert _mask_email("") == "***"
        assert _mask_email("no-at-sign") == "***"
        # No TLD.
        assert _mask_email("user@localhost") == "u***@l****"

    def test_name_initial(self):
        from main import _name_initial

        assert _name_initial("Alice") == "A"
        assert _name_initial("  bob") == "B"
        assert _name_initial("") == "?"
        assert _name_initial(None) == "?"
        assert _name_initial("   ") == "?"


# ---------------------------------------------------------------------------
# Async runner for @pytest.mark.anyio tests.
# ---------------------------------------------------------------------------


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


if __name__ == "__main__":  # pragma: no cover
    pytest.main([__file__, "-v"])
