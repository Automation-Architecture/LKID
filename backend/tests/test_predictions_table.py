"""Tests for the predictions table migration (LKID-61).

These tests verify the Alembic migration `004_add_predictions_table.py`:
  * Migration module imports cleanly (no SQLAlchemy / Alembic syntax errors).
  * Generated SQL for upgrade/downgrade round-trips correctly and contains
    all the columns, constraints, and indexes specified in techspec §4.1.
  * The DDL matches the authoritative schema in
    `agents/gay_mark/drafts/db_schema.sql`.

Why these tests operate on the generated SQL (not a live DB)
------------------------------------------------------------
The existing backend test suite does not spin up a PostgreSQL instance —
`backend/tests/test_health.py` uses `httpx.ASGITransport` against the
FastAPI app directly, and `backend/tests/conftest.py` provides only
in-memory factory fixtures. Adding a live-DB fixture here would require
pytest-postgresql or testcontainers, which is out of scope for LKID-61
(that's endpoint-integration territory owned by John in LKID-62/TICKET-B).

Instead, these tests exercise the migration at the SQL-generation layer
using `alembic upgrade --sql` (offline mode). This catches the 99%
failure modes — typos in column names, missing indexes, broken FK
references, asymmetric upgrade/downgrade — without a DB dependency.
A live-DB integration test for the full INSERT / SELECT / FK behavior
should be added when TICKET-B lands the API endpoints that exercise
the table.
"""

import re
import subprocess
from pathlib import Path

import pytest


BACKEND_DIR = Path(__file__).resolve().parent.parent
MIGRATION_FILE = BACKEND_DIR / "alembic" / "versions" / "004_add_predictions_table.py"
SCHEMA_SQL_FILE = (
    BACKEND_DIR.parent / "agents" / "gay_mark" / "drafts" / "db_schema.sql"
)

# A dummy DATABASE_URL is required by alembic/env.py even in --sql mode.
# The URL is never dialed — offline mode only renders SQL.
OFFLINE_DB_URL = "postgresql://localhost:5432/kidneyhood_dev"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _run_alembic_sql(*args: str) -> str:
    """Run `alembic ... --sql` and return stdout.

    Uses the `python -m alembic` invocation so the test is portable across
    environments that may not have the `alembic` script on PATH but do have
    the Python package installed (e.g. fresh Railway containers, CI).
    """
    result = subprocess.run(
        ["python", "-m", "alembic", *args],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
        env={
            "DATABASE_URL": OFFLINE_DB_URL,
            "PATH": __import__("os").environ.get("PATH", ""),
        },
        check=False,
    )
    # Alembic logs INFO lines to stderr; SQL goes to stdout. We return stdout
    # only — if the command failed, raise with both streams for debug clarity.
    if result.returncode != 0:
        raise RuntimeError(
            f"alembic {' '.join(args)} exited {result.returncode}\n"
            f"--- stdout ---\n{result.stdout}\n"
            f"--- stderr ---\n{result.stderr}"
        )
    return result.stdout


def _normalize(sql: str) -> str:
    """Collapse whitespace to make substring matching robust to formatting."""
    return re.sub(r"\s+", " ", sql).strip()


# ---------------------------------------------------------------------------
# 1. Static checks on the migration file itself
# ---------------------------------------------------------------------------

class TestMigrationFile:
    def test_migration_file_exists(self):
        assert MIGRATION_FILE.exists(), (
            f"Expected migration at {MIGRATION_FILE}; not found"
        )

    def test_migration_imports_cleanly(self):
        """Importing the migration module must not raise.

        Catches syntax errors, bad imports, and typos in `op.` method names
        that only surface at import time.
        """
        import importlib.util

        spec = importlib.util.spec_from_file_location(
            "lkid61_migration", MIGRATION_FILE
        )
        assert spec is not None and spec.loader is not None
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        # Required Alembic module-level attributes
        assert mod.revision == "004"
        assert mod.down_revision == "003"
        assert callable(mod.upgrade)
        assert callable(mod.downgrade)

    def test_migration_references_lkid_61(self):
        """Docstring/comments must reference LKID-61 + techspec §4.1."""
        text = MIGRATION_FILE.read_text()
        assert "LKID-61" in text
        assert "techspec" in text.lower() or "§4.1" in text


# ---------------------------------------------------------------------------
# 2. Upgrade SQL — contains the full table, indexes, FK
# ---------------------------------------------------------------------------

class TestUpgradeSql:
    """Exercises `alembic upgrade --sql 003:004` and asserts the generated
    DDL matches techspec §4.1."""

    @pytest.fixture(scope="class")
    def sql(self) -> str:
        return _normalize(_run_alembic_sql("upgrade", "--sql", "003:004"))

    def test_creates_predictions_table(self, sql: str):
        assert "CREATE TABLE IF NOT EXISTS predictions" in sql

    # --- columns ---
    @pytest.mark.parametrize(
        "column,sql_type",
        [
            ("id", "UUID"),
            ("report_token", "TEXT"),
            ("token_created_at", "TIMESTAMPTZ"),
            ("revoked_at", "TIMESTAMPTZ"),
            ("inputs", "JSONB"),
            ("result", "JSONB"),
            ("lead_id", "UUID"),
            ("email_sent_at", "TIMESTAMPTZ"),
            ("created_at", "TIMESTAMPTZ"),
        ],
    )
    def test_column_present_with_type(self, sql: str, column: str, sql_type: str):
        # Column name and type appear together (allow whitespace between them)
        pattern = re.compile(rf"\b{re.escape(column)}\b\s+{re.escape(sql_type)}")
        assert pattern.search(sql), (
            f"Column `{column}` with type `{sql_type}` missing from upgrade SQL"
        )

    # --- constraints ---
    def test_id_is_primary_key_with_uuid_default(self, sql: str):
        assert re.search(r"id\s+UUID\s+PRIMARY KEY\s+DEFAULT\s+gen_random_uuid\(\)", sql)

    def test_report_token_is_unique_not_null(self, sql: str):
        assert re.search(r"report_token\s+TEXT\s+NOT NULL\s+UNIQUE", sql)

    def test_inputs_is_not_null(self, sql: str):
        assert re.search(r"inputs\s+JSONB\s+NOT NULL", sql)

    def test_result_is_not_null(self, sql: str):
        assert re.search(r"result\s+JSONB\s+NOT NULL", sql)

    def test_token_created_at_defaults_now(self, sql: str):
        assert re.search(
            r"token_created_at\s+TIMESTAMPTZ\s+NOT NULL\s+DEFAULT\s+now\(\)", sql
        )

    def test_created_at_defaults_now(self, sql: str):
        assert re.search(
            r"created_at\s+TIMESTAMPTZ\s+NOT NULL\s+DEFAULT\s+now\(\)", sql
        )

    def test_lead_id_foreign_key_to_leads(self, sql: str):
        # FK clause may be inline or out-of-line; match the essential tokens.
        assert re.search(
            r"lead_id\s+UUID\s+REFERENCES\s+leads\(id\)\s+ON DELETE SET NULL",
            sql,
        )

    # --- indexes ---
    @pytest.mark.parametrize(
        "index_name,column",
        [
            ("idx_predictions_report_token", "report_token"),
            ("idx_predictions_lead_id", "lead_id"),
            ("idx_predictions_created_at", "created_at"),
        ],
    )
    def test_index_present(self, sql: str, index_name: str, column: str):
        assert re.search(
            rf"CREATE INDEX IF NOT EXISTS {index_name}\s+ON\s+predictions\({column}\)",
            sql,
        ), f"Missing index {index_name} on predictions({column})"

    # --- idempotency ---
    def test_create_table_uses_if_not_exists(self, sql: str):
        """AC: migration is idempotent. Raw CREATE TABLE would fail on re-run."""
        assert "CREATE TABLE IF NOT EXISTS predictions" in sql

    def test_create_indexes_use_if_not_exists(self, sql: str):
        assert sql.count("CREATE INDEX IF NOT EXISTS") >= 3

    def test_pgcrypto_extension_guarded(self, sql: str):
        """Extension guard is belt-and-suspenders — should still appear."""
        assert "CREATE EXTENSION IF NOT EXISTS pgcrypto" in sql

    # --- does not touch leads ---
    def test_leads_table_not_modified(self, sql: str):
        """The 003->004 step must NOT emit any ALTER TABLE leads."""
        assert "ALTER TABLE leads" not in sql
        assert "DROP TABLE leads" not in sql


# ---------------------------------------------------------------------------
# 3. Downgrade SQL — drops table + indexes cleanly
# ---------------------------------------------------------------------------

class TestDowngradeSql:
    """Exercises `alembic downgrade --sql 004:003`."""

    @pytest.fixture(scope="class")
    def sql(self) -> str:
        return _normalize(_run_alembic_sql("downgrade", "--sql", "004:003"))

    def test_drops_predictions_table(self, sql: str):
        assert "DROP TABLE IF EXISTS predictions" in sql

    @pytest.mark.parametrize(
        "index_name",
        [
            "idx_predictions_report_token",
            "idx_predictions_lead_id",
            "idx_predictions_created_at",
        ],
    )
    def test_drops_each_index(self, sql: str, index_name: str):
        assert f"DROP INDEX IF EXISTS {index_name}" in sql

    def test_version_rolled_back(self, sql: str):
        """After downgrade, alembic_version should be '003'."""
        assert "UPDATE alembic_version SET version_num='003'" in sql

    def test_leads_table_not_modified(self, sql: str):
        assert "ALTER TABLE leads" not in sql
        assert "DROP TABLE leads" not in sql


# ---------------------------------------------------------------------------
# 4. Schema SQL snapshot matches migration
# ---------------------------------------------------------------------------

class TestSchemaSqlSnapshot:
    """`db_schema.sql` is the human-readable snapshot of the live schema.
    The migration and the snapshot must agree on columns + indexes.
    """

    @pytest.fixture(scope="class")
    def schema_sql(self) -> str:
        return _normalize(SCHEMA_SQL_FILE.read_text())

    def test_schema_sql_has_predictions_table(self, schema_sql: str):
        assert "CREATE TABLE predictions" in schema_sql

    @pytest.mark.parametrize(
        "column,sql_type",
        [
            ("id", "UUID"),
            ("report_token", "TEXT"),
            ("token_created_at", "TIMESTAMPTZ"),
            ("revoked_at", "TIMESTAMPTZ"),
            ("inputs", "JSONB"),
            ("result", "JSONB"),
            ("lead_id", "UUID"),
            ("email_sent_at", "TIMESTAMPTZ"),
            ("created_at", "TIMESTAMPTZ"),
        ],
    )
    def test_schema_column_present(self, schema_sql: str, column: str, sql_type: str):
        pattern = re.compile(rf"\b{re.escape(column)}\b\s+{re.escape(sql_type)}")
        assert pattern.search(schema_sql), (
            f"db_schema.sql: column `{column}` ({sql_type}) missing from "
            f"predictions table"
        )

    def test_schema_has_all_indexes(self, schema_sql: str):
        for idx in (
            "idx_predictions_report_token",
            "idx_predictions_lead_id",
            "idx_predictions_created_at",
        ):
            assert f"CREATE INDEX {idx}" in schema_sql, (
                f"db_schema.sql: index `{idx}` missing"
            )

    def test_schema_fk_to_leads(self, schema_sql: str):
        assert re.search(
            r"lead_id\s+UUID\s+REFERENCES\s+leads\(id\)\s+ON DELETE SET NULL",
            schema_sql,
        )
