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
    """All seven LKID-74 headers must land on /health (representative of
    every backend response — the middleware is unconditional)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200

    # Tight backend CSP — default-src 'none' since we only emit JSON/PDF.
    csp = response.headers.get("content-security-policy-report-only", "")
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
