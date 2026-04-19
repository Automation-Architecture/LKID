"""
Tests for the Resend email template renderer (LKID-64).

Verifies:
- Standard template renders personalized values and contains no outbound URLs.
- Fallback template contains the view-online URL with the token.
- Jinja2 autoescape protects against HTML injection via the name field.
- Disclaimer text matches the verbatim DISCLAIMER_FULL constant from
  `app/src/components/disclaimer-block.tsx` (LKID-5).
"""

from __future__ import annotations

import re

import pytest

from email_renderer import render_report_email

# Verbatim from app/src/components/disclaimer-block.tsx line 14-15 (DISCLAIMER_FULL).
# Any change to the source must be mirrored here AND in both HTML templates.
DISCLAIMER_FULL = (
    "This tool is for informational purposes only and does not constitute "
    "medical advice. Consult your healthcare provider before making any "
    "decisions about your kidney health."
)


def test_standard_template_renders() -> None:
    """Standard template contains the name, formatted eGFR, attached-PDF
    messaging, the disclaimer, and zero outbound https:// URLs."""
    html = render_report_email(name="Alice", egfr_baseline=33.0)

    assert "Alice" in html
    assert "33.0" in html
    # PDF-attached messaging (the "Your full personalized report is attached"
    # sentence uses the word "attached").
    assert "attached" in html.lower()

    # Verbatim disclaimer must be present.
    assert DISCLAIMER_FULL in html

    # Per techspec §9 / OQ-5: the standard email must NOT contain any http(s)
    # URL. PDF is the deliverable; no "view online" link. Use a strict regex
    # so a future regression (stray href) fails loudly.
    assert not re.search(r"https?://", html), (
        "Standard template must not contain any http(s):// URLs (OQ-5). "
        "Links only appear in the fallback template."
    )


def test_fallback_includes_token_url() -> None:
    """Fallback template contains the results URL with the provided token."""
    html = render_report_email(
        name="Alice",
        egfr_baseline=33.0,
        token="abc123",
        pdf_failed=True,
    )

    # The view-online URL appears twice (href + visible text) per the template,
    # but presence at least once is what matters.
    expected_url = (
        "https://kidneyhood-automation-architecture.vercel.app/results/abc123"
    )
    assert expected_url in html
    # Fallback MUST also clearly call out the failure condition.
    assert "could not be generated" in html
    # Disclaimer still verbatim in fallback.
    assert DISCLAIMER_FULL in html


def test_html_escapes_name() -> None:
    """Jinja2 autoescape turns malicious name input into inert text."""
    html = render_report_email(
        name="<script>alert(1)</script>",
        egfr_baseline=33.0,
    )
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in html
    # The raw tag must NOT appear anywhere in the output.
    assert "<script>" not in html
    assert "alert(1)" in html  # (inside escaped form)


def test_html_escapes_name_in_fallback() -> None:
    """Autoescape also applies to the fallback template."""
    html = render_report_email(
        name="<img src=x onerror=alert(1)>",
        egfr_baseline=33.0,
        token="tok",
        pdf_failed=True,
    )
    assert "&lt;img" in html
    assert "<img src=x" not in html


def test_disclaimer_text_verbatim() -> None:
    """Disclaimer is byte-for-byte identical to DISCLAIMER_FULL (LKID-5)."""
    html = render_report_email(name="Alice", egfr_baseline=33.0)
    assert DISCLAIMER_FULL in html

    fallback_html = render_report_email(
        name="Alice", egfr_baseline=33.0, token="tok", pdf_failed=True
    )
    assert DISCLAIMER_FULL in fallback_html


def test_egfr_is_formatted_one_decimal() -> None:
    """Int and odd-precision floats both render as one-decimal."""
    html = render_report_email(name="A", egfr_baseline=42)
    assert "42.0" in html

    html = render_report_email(name="A", egfr_baseline=17.6789)
    assert "17.7" in html


def test_brand_header_present() -> None:
    """Both templates must include the KidneyHood.org brand wordmark."""
    html = render_report_email(name="A", egfr_baseline=33.0)
    assert "KidneyHood.org" in html

    fallback_html = render_report_email(
        name="A", egfr_baseline=33.0, token="tok", pdf_failed=True
    )
    assert "KidneyHood.org" in fallback_html


def test_confidence_tier_accepted_but_optional() -> None:
    """Passing confidence_tier must not error; omitting it must not error."""
    # Omitted
    render_report_email(name="A", egfr_baseline=33.0)
    # Provided as string (matches techspec §5.1 PredictResponse.confidence_tier)
    render_report_email(name="A", egfr_baseline=33.0, confidence_tier="Tier 1")
    # No assertion on output content — confidence_tier is reserved for future
    # rendering; the test locks the call signature contract for LKID-62.


def test_fallback_requires_token() -> None:
    """Fallback template (`pdf_failed=True`) MUST refuse to render without a
    non-empty token. Rendering with `token=None` would produce a live
    `.../results/None` link in the user's inbox; rendering with `token=""`
    would produce `.../results/` (equally broken). Guard is in the renderer,
    not the template, so callers cannot accidentally bypass it. (I-34-1)"""
    with pytest.raises(ValueError, match="requires a non-empty token"):
        render_report_email(
            name="x", egfr_baseline=30.0, pdf_failed=True, token=None
        )
    with pytest.raises(ValueError, match="requires a non-empty token"):
        render_report_email(
            name="x", egfr_baseline=30.0, pdf_failed=True, token=""
        )


def test_both_templates_include_unsubscribe_note() -> None:
    """Jira LKID-64 AC + techspec §9 require a plain-text unsubscribe /
    contact footer. Resend transactional emails don't need List-Unsubscribe
    headers, but the human-readable note must be present in both the standard
    and fallback templates. (I-34-2)"""
    standard = render_report_email(name="Alice", egfr_baseline=30.0)
    fallback = render_report_email(
        name="Alice", egfr_baseline=30.0, pdf_failed=True, token="abc123"
    )
    assert "transactional email" in standard
    assert "transactional email" in fallback
    assert "no marketing list" in standard
    assert "no marketing list" in fallback


if __name__ == "__main__":  # pragma: no cover
    pytest.main([__file__, "-v"])
