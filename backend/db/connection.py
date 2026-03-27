"""
Shared async SQLAlchemy engine and session factory.

Reads DATABASE_URL from environment. Converts the Railway-provided
postgresql:// scheme to postgresql+asyncpg:// for asyncpg compatibility.

Import get_engine() and get_session_factory() from here — both the
webhook handler and the predict endpoint should share one pool.
"""

import os
from functools import lru_cache

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


def _build_url() -> str:
    """Return the async-compatible DATABASE_URL."""
    url = os.environ.get("DATABASE_URL", "")
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


@lru_cache(maxsize=1)
def get_engine():
    """
    Return a singleton async engine.

    Returns None when DATABASE_URL is empty (local dev without DB).
    """
    url = _build_url()
    if not url:
        return None
    return create_async_engine(url, echo=False, pool_pre_ping=True)


def get_session_factory():
    """
    Return an async session factory bound to the shared engine.

    Returns None when the engine is unavailable.
    """
    eng = get_engine()
    if eng is None:
        return None
    return async_sessionmaker(eng, class_=AsyncSession, expire_on_commit=False)
