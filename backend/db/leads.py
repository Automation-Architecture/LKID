"""
Lead insert logic for the Clerk user.created webhook (LKID-9).

The webhook fires when a new user signs up via Clerk. We capture their
email, name, and clerk_user_id into the leads table so they enter the
warm email campaign pipeline.

Design choices:
- ON CONFLICT (email) DO UPDATE — if the same email signs up again we
  refresh the name and clerk_user_id rather than silently dropping it.
- Never raises — the webhook endpoint must always return 200 to Clerk.
  Any DB error is logged and swallowed.
- Uses sqlalchemy.text() with the shared async engine from connection.py.
"""

import logging
from typing import Optional

from sqlalchemy import text

from db.connection import get_session_factory

logger = logging.getLogger(__name__)


async def insert_lead_from_webhook(
    email: str,
    name: Optional[str] = None,
    clerk_user_id: Optional[str] = None,
) -> bool:
    """
    Insert (or update) a lead row from a Clerk user.created event.

    Parameters
    ----------
    email : str
        The user's primary email from the Clerk payload.
    name : str | None
        Full name (first + last) if available.
    clerk_user_id : str | None
        Clerk's unique user ID for cross-reference.

    Returns
    -------
    bool
        True if the row was inserted/updated, False on any failure.
    """
    session_factory = get_session_factory()
    if session_factory is None:
        logger.warning("insert_lead_from_webhook: no DB configured, skipping")
        return False

    # The leads table requires name NOT NULL — default to empty string.
    safe_name = (name or "").strip() or "Unknown"

    try:
        async with session_factory() as session:
            async with session.begin():
                await session.execute(
                    text(
                        """
                        INSERT INTO leads (email, name, clerk_user_id)
                        VALUES (:email, :name, :clerk_user_id)
                        ON CONFLICT (email) DO UPDATE
                            SET name           = EXCLUDED.name,
                                clerk_user_id  = EXCLUDED.clerk_user_id,
                                updated_at     = now()
                        """
                    ),
                    {
                        "email": email,
                        "name": safe_name,
                        "clerk_user_id": clerk_user_id,
                    },
                )
        logger.info("Lead upserted from webhook: %s", email)
        return True

    except Exception:
        logger.exception("Failed to insert lead from webhook: %s", email)
        return False
