"""Database module — shared connection pool + lead insert logic."""

from db.connection import get_engine, get_session_factory
from db.leads import insert_lead_from_webhook

__all__ = ["get_engine", "get_session_factory", "insert_lead_from_webhook"]
