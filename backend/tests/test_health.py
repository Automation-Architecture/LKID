"""Basic health endpoint test + LKID-74 security header coverage."""
import pytest
from httpx import AsyncClient, ASGITransport

from main import app


@pytest.mark.anyio
async def test_health_returns_ok():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


# ---------------------------------------------------------------------------
# LKID-74 — Security headers on every response
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_security_headers_present_on_health():
    """All seven LKID-74 / LKID-87 headers must land on /health
    (representative of every backend response — the middleware is
    unconditional). LKID-87 flipped CSP from Report-Only to enforcing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200

    # Tight backend CSP — default-src 'none' since we only emit JSON/PDF.
    # LKID-87: header key is now `Content-Security-Policy` (enforcing).
    # The legacy Report-Only key MUST NOT appear.
    assert "content-security-policy-report-only" not in {
        k.lower() for k in response.headers.keys()
    }
    csp = response.headers.get("content-security-policy", "")
    assert "default-src 'none'" in csp
    assert "frame-ancestors 'none'" in csp

    assert response.headers.get("x-frame-options") == "DENY"
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert (
        response.headers.get("referrer-policy")
        == "strict-origin-when-cross-origin"
    )

    perms = response.headers.get("permissions-policy", "")
    assert "camera=()" in perms
    assert "microphone=()" in perms
    assert "geolocation=()" in perms

    assert response.headers.get("x-dns-prefetch-control") == "on"


@pytest.mark.anyio
async def test_csp_enforcing_on_strict_routes():
    """LKID-87: non-docs routes get the strict `default-src 'none'` policy
    under the enforcing header key. Catches a regression where a future
    refactor accidentally serves the relaxed-docs CSP everywhere."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    csp = response.headers.get("content-security-policy", "")
    # The Swagger UI exemption pulls jsdelivr; if that string lands on
    # /health the path-branching has broken.
    assert "cdn.jsdelivr.net" not in csp
    assert "default-src 'none'" in csp


@pytest.mark.anyio
async def test_csp_relaxed_on_swagger_docs():
    """LKID-87: `/docs` and `/redoc` get a relaxed CSP so the bundled
    Swagger / ReDoc UIs can pull their JS/CSS from jsdelivr. The strict
    `default-src 'none'` would otherwise block the page from rendering."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        for path in ("/docs", "/redoc"):
            response = await client.get(path)
            # FastAPI may 200 the HTML or 404 in test envs without docs
            # routes wired — the header behavior is what we care about.
            csp = response.headers.get("content-security-policy", "")
            assert "cdn.jsdelivr.net" in csp, (
                f"{path} should get the relaxed Swagger CSP"
            )
            # Swagger exemption MUST keep frame-ancestors locked down.
            assert "frame-ancestors 'none'" in csp


@pytest.mark.anyio
async def test_csp_strict_on_openapi_json():
    """LKID-87: `/openapi.json` is a pure JSON document — it must stay
    under the strict policy, not the relaxed Swagger one."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/openapi.json")
    csp = response.headers.get("content-security-policy", "")
    assert "cdn.jsdelivr.net" not in csp
    assert "default-src 'none'" in csp


@pytest.mark.anyio
async def test_hsts_only_when_proxy_reports_https():
    """HSTS must appear behind an HTTPS-terminating proxy (Railway/Vercel
    set X-Forwarded-Proto=https) and MUST NOT leak on a plain-HTTP request
    (localhost dev should not emit HSTS)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Plain HTTP — no HSTS
        plain = await client.get("/health")
        assert "strict-transport-security" not in {
            k.lower() for k in plain.headers.keys()
        }

        # Simulated HTTPS edge — HSTS present with the preload directive
        https = await client.get(
            "/health", headers={"X-Forwarded-Proto": "https"}
        )
        hsts = https.headers.get("strict-transport-security", "")
        assert "max-age=31536000" in hsts
        assert "includeSubDomains" in hsts
        assert "preload" in hsts
