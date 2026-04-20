# LKID-69 Pre-Delete Verification Memo

**Date:** 2026-04-20
**Verifier:** Luca (orchestrator sub-agent, read-only run)
**Read-only run — NO deletion performed.**

## Summary

**Verdict: GO (safe to delete).** The orphan `Postgres` service has zero user tables, no env-var references from any service in the `kidneyhood-api` Railway project, and no references from any code, config, or `.env*` file in the repo. The live `Postgres-726n` service contains the production schema (3 tables: `alembic_version` at rev `004`, `leads` 8 rows, `predictions` 26 rows) and the backend's `DATABASE_URL` points exclusively at it. Production `/health` returns `200 OK`.

One minor **caveat to be aware of during the delete action** (not a blocker): the orphan's internal hostname is `postgres.railway.internal` — the unqualified name. Railway may resolve that name to a different service after delete (or to nothing). This matters only if any currently-hidden reference exists; the sweep in Step 4 found none.

---

## Step-by-step findings

### Step 1 — `DATABASE_URL` target

- **Expected:** `Postgres-726n`
- **Actual:** `Postgres-726n` ✓
- **Evidence:** `railway variables --service kidneyhood-backend --kv`
  ```
  DATABASE_URL=postgresql://postgres:***@postgres-726n.railway.internal:5432/railway
  ```
  Host is `postgres-726n.railway.internal` → resolves to service ID `a8af2a61-17af-4bac-b9f4-bff02cbb9e93` = `Postgres-726n`. The orphan's host is `postgres.railway.internal` (no suffix). No ambiguity.
- The value is stored as a literal string in the backend service (not a `${{Postgres-726n.DATABASE_URL}}` Railway reference), so deleting the orphan cannot cause the reference to auto-rebind.

### Step 2 — Orphan empty confirmation

- **Connection method:** direct-connect via public TCP proxy (`gondola.proxy.rlwy.net:50792`) using orphan's `DATABASE_PUBLIC_URL` from `railway variables --service Postgres --kv`.
- **`\dt` result:** `Did not find any tables.`
- **`pg_tables` (excluding system schemas):** 0 rows.
- **`SELECT version();`** returned PostgreSQL 18.3 — proves the connection target was alive and correct (not a dead-port fallback).
- **Contrast with live DB** (public proxy `gondola.proxy.rlwy.net:28421`): lists `alembic_version`, `leads`, `predictions`. Row counts — `predictions: 26`, `leads: 8`, `alembic_version: 004`.
- **Evidence quality:** direct-connect (strongest). Confirmed twice (table list + schema enumeration).

Note: the orphan's volume shows `currentSizeMB ≈ 1109` — this is base Postgres overhead (WAL, system catalogs, template DBs). The live service shows a near-identical `1126 MB`. Volume size does not indicate user data in either direction and was not used as a signal.

### Step 3 — Orphan service snapshot (for restore-if-needed)

| Field | Value |
|-------|-------|
| Service name | `Postgres` |
| Service ID | `c544ff17-d7f8-4b3c-81a9-9d57ff4a8be7` |
| Project | `kidneyhood-api` (`ca3efb41-ee0c-42a3-8791-681a0b9188ff`) |
| Environment | `production` (`80d8c1e0-43f0-4056-8923-f4ca8f5d07dd`) |
| Image | `ghcr.io/railwayapp-templates/postgres-ssl:18` |
| Internal host | `postgres.railway.internal:5432` |
| Public proxy | `gondola.proxy.rlwy.net:50792` |
| DB name | `railway` |
| Volume | `postgres-volume` (id `a9c240c9-6383-4d8f-ad6b-f116c9867ca4`), mounted at `/var/lib/postgresql/data`, currently `~1.1 GB` (all system overhead; no user data) |
| Latest deployment | `3afdcd86-0fcf-4943-a5e9-43f57c742919`, status SUCCESS, created **2026-03-27 02:59:28 UTC** |
| Domains | none (no `serviceDomains`, no `customDomains`) |
| Cron | none |
| Source repo | none (template image only) |

To rebuild: add a Postgres service to `kidneyhood-api/production` from the same template image. No data to restore.

### Step 4 — References to the orphan anywhere

**Env-var sweep across all 3 services in the project** (`railway variables --service <name> --kv`):

| Service | Any ref to `postgres.railway.internal` / `gondola:50792` / orphan password / orphan service ID `c544ff17` |
|---------|----|
| `kidneyhood-backend` | None. Its `DATABASE_URL` hardcodes `postgres-726n.railway.internal`. No `${{Postgres.*}}` reference syntax anywhere. |
| `Postgres-726n` | None (service only has its own vars). |
| `Postgres` (orphan) | N/A — it IS the orphan. |

**Repo sweep** (git-tracked files + untracked files via `Grep` on the whole repo):

| Search | Result |
|--------|--------|
| `postgres.railway.internal` | Hits only in `agents/luca/drafts/lkid-68-*.md` (postmortem documents). |
| `gondola.proxy.rlwy.net:50792` | No hits. |
| Orphan password | No hits. |
| Orphan service ID `c544ff17` | Hits only in the same two postmortem docs. |
| `postgresql://` / `DATABASE_URL` in `app/` | Only a narrative mention inside `app/src/components/dashboard/WeeklyUpdate.tsx` (string describing env vars configured during a previous sprint — not an actual config value). |
| `.env*` files in repo | Only `backend/.env.example` (git-tracked, placeholder values, no orphan refs). No real `.env` committed. |

**Vercel (frontend) cross-check:** the frontend proxies to `NEXT_PUBLIC_API_URL` → backend HTTPS; it does not carry a `DATABASE_URL`. No direct DB coupling.

**Verdict:** clean. No live reference to the orphan from env, code, or config.

### Step 5 — Production health baseline

- **Request:** `curl -fsS https://kidneyhood-backend-production.up.railway.app/health`
- **Response:** `HTTP 200` — body `{"status":"ok","version":"2.0.0"}`
- **Latency:** 5.73s (first request; likely a cold start — acceptable for a baseline)
- **Timestamp:** 2026-04-20 (session time, see git log commit timestamps)
- Cross-checked with live DB query: `predictions = 26`, `leads = 8`, `alembic_version = 004` (rev matches deployed migrations).

---

## Risks identified

1. **Hostname collision (low).** The orphan's internal hostname is `postgres.railway.internal` (bare), while the live one is `postgres-726n.railway.internal`. If any operator or script ever copy-pastes a generic `postgres.railway.internal` string elsewhere (e.g., a local `.env`, a team chat message, a setup doc), that string becomes invalid post-delete. The sweep found zero such strings in the repo and in the Railway env sweep, but a human operator's local `.env` on their laptop can't be swept from here.
2. **Password value recurrence (none found).** The orphan's password `lwtcVAJY…` does not appear anywhere in the repo or in other services' env vars. Clean.
3. **Volume data destruction is permanent.** Railway's "Delete Service" removes the attached volume (`postgres-volume`, ~1.1 GB). There is no user data, but the system-level WAL/catalog is still gone. Backup not needed.
4. **Deletion is non-reversible via the CLI** (no undelete). The snapshot in Step 3 is sufficient to rebuild an empty service from template. No migration state is stored in the orphan.
5. **Other environments.** The project has only one environment (`production`) per `railway status --json`. No `staging`/`preview` environment silently using the orphan.

---

## Recommendation

**GO — safe to delete.**

Rationale: (a) live service confirmed as the sole target of `DATABASE_URL`, (b) orphan confirmed empty by direct connect (0 user tables), (c) no references from any service's env vars, from code, or from any `.env*` file, (d) production healthy on the live DB right now, (e) snapshot captured for worst-case rebuild.

Proceed via the dashboard path (Project → `Postgres` (not `-726n`) → Settings → Danger → Delete Service) — the guide notes CLI `railway service delete` syntax may be version-dependent; dashboard is the dependable route.

---

## Post-delete verification checklist (for when Brad greenlights)

Run these in order immediately after the service is deleted. If any step fails, the backend still points at `-726n` so rollback = stop and investigate, no prod impact from the delete itself.

1. **Confirm only `Postgres-726n` remains:**
   ```bash
   cd backend
   railway status --json | jq '.services.edges[].node.name'
   # Expect: "kidneyhood-backend", "Postgres-726n" — NO "Postgres".
   ```

2. **Confirm `DATABASE_URL` unchanged on backend:**
   ```bash
   railway variables --service kidneyhood-backend --kv | grep DATABASE_URL
   # Expect host = postgres-726n.railway.internal
   ```

3. **Health check (baseline comparison):**
   ```bash
   curl -fsS https://kidneyhood-backend-production.up.railway.app/health
   # Expect: {"status":"ok","version":"2.0.0"}  HTTP 200
   ```

4. **Row-count sanity check on live DB** (same public proxy + creds as baseline):
   ```bash
   /opt/homebrew/opt/libpq/bin/psql \
     "postgresql://postgres:<Postgres-726n password>@gondola.proxy.rlwy.net:28421/railway?connect_timeout=15" \
     -c "SELECT (SELECT count(*) FROM predictions) AS predictions,
                (SELECT count(*) FROM leads) AS leads,
                (SELECT version_num FROM alembic_version) AS rev;"
   # Expect: predictions ≥ 26, leads ≥ 8, rev = 004
   ```

5. **Smoke the token flow end-to-end** (production):
   ```bash
   # Create a lead + prediction via /labs or the API, receive token email,
   # hit /results/<token>. If /results returns 200 and data, the live DB writes + reads are healthy.
   ```

6. **Tail backend logs for 5 minutes:**
   ```bash
   railway logs --service kidneyhood-backend 2>&1 | tail -100
   # Look for: no connection-refused errors, no "postgres.railway.internal" DNS failures,
   # alembic upgrade head completes on next redeploy.
   ```

7. **Update Jira LKID-69:**
   > Duplicate `Postgres` service deleted on 2026-MM-DD. `/health` 200. `DATABASE_URL` unchanged (points to `Postgres-726n`). Live DB row counts preserved. Pre-delete verification memo: `agents/luca/drafts/lkid-69-predelete-verification.md`.

   Then transition to **Done**.

8. **(Optional) Document the service name going forward.** Rename `Postgres-726n` → `Postgres` (now that the name is free) only if desired — low value, cosmetic. Skip unless Brad asks; leaving `-726n` is fine.

---

## Delete execution — 2026-04-20

**Executor:** Luca (orchestrator sub-agent)
**Greenlight:** Brad, after reviewing this memo
**Deleted:** Postgres service `c544ff17-d7f8-4b3c-81a9-9d57ff4a8be7` on Railway
**Timestamp:** 2026-04-20 13:23:30 UTC
**Method:** Railway GraphQL API `serviceDelete(id: String!)` mutation — the Railway CLI (`railway service`) does not expose a service-level delete subcommand. Mutation response: `{"data":{"serviceDelete":true}}` HTTP 200.

### Pre-delete snapshot (for audit)

- Project `kidneyhood-api` services list: `kidneyhood-backend`, `Postgres-726n`, `Postgres` (orphan, target).
- Backend `DATABASE_URL` = `postgresql://postgres:***@postgres-726n.railway.internal:5432/railway` (literal string; not a `${{...}}` reference).
- Production `/health` = 200 OK, `{"status":"ok","version":"2.0.0"}`.
- Most recent `predictions.created_at` before delete: `2026-04-20 13:16:08 UTC` (~7 min prior).

### Post-delete verification

| Check | Expected | Actual | Result |
|---|---|---|---|
| Project service list | 2 services (`kidneyhood-backend`, `Postgres-726n`); orphan absent | 2 services; orphan absent | PASS |
| `/health` | 200 OK, `{"status":"ok","version":"2.0.0"}` | 200 OK, `{"status":"ok","version":"2.0.0"}` | PASS |
| `DATABASE_URL` target | `postgres-726n.railway.internal` | `postgres-726n.railway.internal` | PASS |
| `predictions` row count | ≥ 26 (baseline) | 28 | PASS (+2 from live user traffic post-baseline — expected) |
| `leads` row count | 8 | 8 | PASS |
| `alembic_version` | 004 | 004 | PASS |

The +2 predictions row delta is **expected**: the no-auth tokenized flow is live, and two new submissions arrived between the pre-delete memo (earlier in the day) and the delete execution. Most recent prediction timestamped `2026-04-20 13:16:08 UTC`. `leads` and `alembic_version` unchanged — schema and lead table untouched. This is evidence the live DB is healthy and the backend is routing writes correctly to `Postgres-726n`.

### Jira updates

- **LKID-69:** commented + transitioned to Done — comment [10603](https://automationarchitecture.atlassian.net/browse/LKID-69?focusedCommentId=10603)
- **LKID-68:** commented + transitioned to Done (AI-1 paired closure) — comment [10604](https://automationarchitecture.atlassian.net/browse/LKID-68?focusedCommentId=10604)

**Overall outcome:** GREEN — orphan removed, production unaffected.
