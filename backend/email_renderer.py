"""
Email template renderer for KidneyHood transactional emails (LKID-64).

Renders the Resend report email that is sent after the email-gate step of the
new tokenized flow (see `agents/luca/drafts/techspec-new-flow.md` §8.4, §9).

Two variants:
- `report_email.html`          — standard (PDF attached, NO links in body)
- `report_email_fallback.html` — fallback (PDF render failed, includes /results/[token] link)

Per resolved decision OQ-5 (techspec §13): the PDF attachment IS the deliverable.
No "View online" CTA in the standard template. The fallback template is the
only path where a results URL appears in the email body.

Interface consumed by LKID-62 (`_send_report_email()` in `backend/main.py`):

    from email_renderer import render_report_email

    html = render_report_email(
        name=lead.name,
        egfr_baseline=result["egfr_baseline"],
        confidence_tier=result.get("confidence_tier"),
        token=prediction.report_token,   # only used on fallback path
        pdf_failed=False,                # set True if Playwright rendering failed
    )
"""

from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape

_TEMPLATES_DIR = Path(__file__).parent / "templates"

_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "htm"]),
    trim_blocks=False,
    lstrip_blocks=False,
)


def render_report_email(
    *,
    name: str,
    egfr_baseline: float,
    confidence_tier: Optional[str] = None,
    token: Optional[str] = None,
    pdf_failed: bool = False,
) -> str:
    """Render the transactional report email HTML.

    Args:
        name: Lead's display name (user-supplied). Autoescaped by Jinja2.
        egfr_baseline: Baseline eGFR value from the prediction engine
            (mL/min/1.73m²). Formatted to 1 decimal in the template.
        confidence_tier: Engine confidence tier label (e.g. "Tier 1").
            Reserved for future use in the template; currently unrendered.
            Pass-through is preserved so LKID-62 does not need to change its
            call site when/if the template starts surfacing this field.
        token: The `report_token` for the prediction. Only rendered in the
            fallback template as part of the view-online URL. Required when
            `pdf_failed=True`; otherwise ignored.
        pdf_failed: When True, renders `report_email_fallback.html` (with the
            view-online link). When False (default), renders `report_email.html`
            (no links, PDF-attached-only).

    Returns:
        Fully rendered HTML string ready to pass to Resend as the `html` body.

    Raises:
        ValueError: If `pdf_failed=True` but `token` is falsy (None or empty).
            The fallback template's only purpose is to link the user to
            `/results/{token}`; without a token the email would render
            `/results/None` (or `/results/`) and deliver a broken link.
        jinja2.exceptions.TemplateNotFound: If the template file is missing.
    """
    if pdf_failed and not token:
        raise ValueError(
            "pdf_failed=True requires a non-empty token; fallback template "
            "must link to a valid /results/{token} URL"
        )

    template_name = (
        "report_email_fallback.html" if pdf_failed else "report_email.html"
    )
    template = _env.get_template(template_name)
    return template.render(
        name=name,
        egfr_baseline=egfr_baseline,
        confidence_tier=confidence_tier,
        token=token,
    )
