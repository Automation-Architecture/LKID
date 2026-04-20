"""
Resend transactional email integration (LKID-62).

Sends the "Your Kidney Health Report" email from POST /leads via Resend. The
Resend Python SDK (`resend==2.29.0`) is synchronous, so every send call is
dispatched through `asyncio.to_thread()` to avoid blocking the event loop —
the caller is itself a fire-and-forget `asyncio.create_task()` started from
the /leads handler, so neither the user request nor the FastAPI loop blocks
on SMTP latency.

Env vars:
- RESEND_API_KEY       — Resend private API key. If unset, `send_report_email`
                         logs a warning and returns False; it never raises.
- RESEND_FROM_EMAIL    — From address (default: reports@kidneyhood.org).
                         Must be on a verified Resend sending domain per
                         techspec §8.4 / Jira LKID-62 "Env prerequisites".

HIPAA note (`agents/yuri/drafts/hipaa-verification-notes.md`): this module
never logs email addresses at INFO+ and never logs PHI. Failures log the
Resend error category only (status code, message), never the recipient or
lab values.
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Optional

import resend

logger = logging.getLogger(__name__)

# Subject line is fixed per techspec §9 / Jira AC.
REPORT_EMAIL_SUBJECT = "Your Kidney Health Report"

# Default sender — overridable via RESEND_FROM_EMAIL so ops can rotate
# sending domains without a code change.
DEFAULT_FROM_EMAIL = "reports@kidneyhood.org"


def _configure_api_key() -> bool:
    """Set `resend.api_key` from env. Returns False if no key is configured."""
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    if not api_key:
        return False
    # The SDK reads this module-level attribute on every request.
    resend.api_key = api_key
    return True


def _send_sync(
    *,
    to_email: str,
    subject: str,
    html: str,
    from_email: str,
    pdf_bytes: Optional[bytes],
) -> None:
    """Synchronous Resend send — runs inside `asyncio.to_thread`.

    Raises on Resend API failure so the async caller can log it. The SDK
    returns a dict-like SendResponse on success.
    """
    params: dict = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "html": html,
    }

    if pdf_bytes is not None:
        # Resend accepts `content` as either a base64 string or a list[int].
        # `list(pdf_bytes)` is the safest cross-SDK shape.
        params["attachments"] = [
            {
                "filename": "kidney-health-report.pdf",
                "content": list(pdf_bytes),
                "content_type": "application/pdf",
            }
        ]

    # Raises on network / 4xx / 5xx — caller wraps in try/except.
    resend.Emails.send(params)


async def send_report_email(
    *,
    to_email: str,
    html_body: str,
    pdf_bytes: Optional[bytes],
    subject: str = REPORT_EMAIL_SUBJECT,
    from_email: Optional[str] = None,
) -> bool:
    """Send the report email via Resend. Returns True on success, False on
    misconfiguration or API failure.

    Never raises — this is called from a fire-and-forget task and must not
    crash the background loop. Callers MUST still guard with try/except
    because `asyncio.to_thread` can surface cancellation.

    Args:
        to_email:   Recipient email address (lead.email).
        html_body:  Fully-rendered HTML body from `email_renderer`.
        pdf_bytes:  Optional PDF bytes to attach. When None, no attachment
                    is sent (used on the PDF-render-failure fallback path —
                    the html_body itself contains the /results/{token} link).
        subject:    Email subject; defaults to "Your Kidney Health Report".
        from_email: Optional override for the From address; falls back to
                    $RESEND_FROM_EMAIL and then DEFAULT_FROM_EMAIL.
    """
    if not _configure_api_key():
        # Misconfiguration: log and no-op. Do not raise — lead capture has
        # already returned 200 to the client.
        logger.warning(
            "RESEND_API_KEY not configured; skipping report email send"
        )
        return False

    sender = (
        from_email
        or os.environ.get("RESEND_FROM_EMAIL", "").strip()
        or DEFAULT_FROM_EMAIL
    )

    try:
        await asyncio.to_thread(
            _send_sync,
            to_email=to_email,
            subject=subject,
            html=html_body,
            from_email=sender,
            pdf_bytes=pdf_bytes,
        )
        # Intentionally do not log the recipient address (HIPAA / PII).
        logger.info(
            "Resend send succeeded (pdf_attached=%s)", pdf_bytes is not None
        )
        return True
    except Exception as exc:
        # Keep the log message free of PII. `repr(exc)` includes the
        # exception type and any message Resend returned, which may include
        # a sanitized error like "invalid_from_address" — safe to log.
        logger.exception("Resend send failed: %s", type(exc).__name__)
        return False
