#!/usr/bin/env python3
"""
refresh-sprint-progress.py — Daily Jira-to-Dashboard Sync
=========================================================

What it does:
  Pulls current card statuses from the LKID Jira project and updates both
  JSON files that power the client dashboard's Sprint Progress tracker:
    - agents/luca/drafts/sprint-progress.json  (source of truth)
    - app/src/app/client/data/sprint-progress.json  (dashboard copy)

  The Next.js dashboard imports sprint-progress.json at build time, so a
  Vercel redeploy is needed after this script runs to reflect changes.

Jira status mapping:
  "Done"        -> "done"
  "In Progress" -> "in_progress"
  "To Do"       -> "upcoming"

Configuration:
  The script auto-loads variables from .env in the repo root. Set the following:
    JIRA_URL='https://automationarchitecture.atlassian.net'  (optional, defaults to this)
    JIRA_EMAIL='your-email@example.com'
    JIRA_API_TOKEN='your-jira-api-token'
    VERCEL_DEPLOY_HOOK_URL='https://api.vercel.com/v1/integrations/deploy/...'

  Generate a Jira API token at: https://id.atlassian.com/manage-profile/security/api-tokens
  Create a Vercel Deploy Hook in Project Settings > Git > Deploy Hooks.
  If VERCEL_DEPLOY_HOOK_URL is not set, the script still refreshes JSON but skips the deploy trigger.

  The script automatically commits and pushes JSON changes to git before
  triggering the deploy hook. Vercel builds from git, so this is required
  for the dashboard to reflect updated data.

Usage:
  python3 scripts/refresh-sprint-progress.py

Scheduling:
  Runs daily at 08:00 local time via cron. The script loads .env automatically,
  so no shell sourcing is needed:
    crontab -e
    0 8 * * * cd /Users/brad/IDE/agent-teams && python3 scripts/refresh-sprint-progress.py >> /tmp/refresh-sprint-progress.log 2>&1

Created: 2026-03-27
"""

import json
import os
import subprocess
import sys
import urllib.parse
import urllib.request
import urllib.error
import base64
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent

# Load .env file if present (no external dependency needed)
_env_file = REPO_ROOT / ".env"
if _env_file.exists():
    with open(_env_file) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _key, _, _val = _line.partition("=")
                _key, _val = _key.strip(), _val.strip().strip("'\"")
                if _key and _val:
                    os.environ.setdefault(_key, _val)
LUCA_JSON = REPO_ROOT / "agents" / "luca" / "drafts" / "sprint-progress.json"
DASHBOARD_JSON = REPO_ROOT / "app" / "src" / "app" / "client" / "data" / "sprint-progress.json"

JIRA_URL = os.environ.get("JIRA_URL", "https://automationarchitecture.atlassian.net")
JIRA_EMAIL = os.environ.get("JIRA_EMAIL", "")
JIRA_API_TOKEN = os.environ.get("JIRA_API_TOKEN", "")
VERCEL_DEPLOY_HOOK_URL = os.environ.get("VERCEL_DEPLOY_HOOK_URL", "")

JQL = "project = LKID ORDER BY key ASC"
JIRA_SEARCH_URL = f"{JIRA_URL}/rest/api/3/search/jql"

# Map Jira status category -> dashboard status value
STATUS_MAP = {
    "Done": "done",
    "In Progress": "in_progress",
    "To Do": "upcoming",
}

# ---------------------------------------------------------------------------
# Jira API helpers
# ---------------------------------------------------------------------------


def fetch_jira_issues() -> dict:
    """Fetch all LKID issues from Jira REST API with pagination."""
    if not JIRA_EMAIL or not JIRA_API_TOKEN:
        print("ERROR: JIRA_EMAIL and JIRA_API_TOKEN environment variables are required.")
        print("  export JIRA_EMAIL='you@example.com'")
        print("  export JIRA_API_TOKEN='your-api-token'")
        sys.exit(1)

    credentials = base64.b64encode(f"{JIRA_EMAIL}:{JIRA_API_TOKEN}".encode()).decode()
    headers = {
        "Authorization": f"Basic {credentials}",
        "Accept": "application/json",
    }

    all_issues = []
    start_at = 0
    max_results = 50

    while True:
        params = (
            f"?jql={urllib.parse.quote(JQL)}"
            f"&fields=summary,status"
            f"&startAt={start_at}"
            f"&maxResults={max_results}"
        )
        url = JIRA_SEARCH_URL + params

        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            print(f"ERROR: Jira API returned HTTP {e.code}: {e.read().decode()}")
            sys.exit(1)

        issues = data.get("issues", [])
        all_issues.extend(issues)

        if len(all_issues) >= data.get("total", 0) or not issues:
            break
        start_at += max_results

    return all_issues


def build_status_lookup(issues: list) -> dict:
    """Build a dict mapping issue key -> dashboard status string."""
    lookup = {}
    for issue in issues:
        key = issue["key"]
        jira_status = issue["fields"]["status"]["name"]
        dashboard_status = STATUS_MAP.get(jira_status, "upcoming")
        lookup[key] = {
            "status": dashboard_status,
            "summary": issue["fields"]["summary"],
        }
    return lookup


# ---------------------------------------------------------------------------
# JSON update
# ---------------------------------------------------------------------------


def refresh_json(lookup: dict) -> dict:
    """Read existing sprint-progress.json, update statuses from Jira, return updated data."""
    if not LUCA_JSON.exists():
        print(f"ERROR: Source file not found: {LUCA_JSON}")
        sys.exit(1)

    with open(LUCA_JSON, "r") as f:
        data = json.load(f)

    updated_count = 0
    for sprint in data["sprints"]:
        for card in sprint["cards"]:
            card_id = card["id"]
            if card_id in lookup:
                old_status = card["status"]
                new_status = lookup[card_id]["status"]
                if old_status != new_status:
                    print(f"  {card_id}: {old_status} -> {new_status}")
                    card["status"] = new_status
                    updated_count += 1

    print(f"\nUpdated {updated_count} card(s).")
    return data


def write_json(data: dict) -> None:
    """Write updated JSON to both file locations."""
    for path in [LUCA_JSON, DASHBOARD_JSON]:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
            f.write("\n")
        print(f"  Wrote: {path}")


# ---------------------------------------------------------------------------
# Vercel deploy hook
# ---------------------------------------------------------------------------


def trigger_vercel_deploy() -> None:
    """POST to the Vercel deploy hook to trigger a rebuild.

    Skips with a warning if VERCEL_DEPLOY_HOOK_URL is not set.
    Logs success or failure but never exits the script on error.
    """
    if not VERCEL_DEPLOY_HOOK_URL:
        print("  VERCEL_DEPLOY_HOOK_URL not set — skipping deploy trigger.")
        return

    print(f"  Triggering Vercel deploy hook...")
    req = urllib.request.Request(VERCEL_DEPLOY_HOOK_URL, method="POST", data=b"")
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.getcode()
            print(f"  Vercel deploy triggered (HTTP {status}).")
    except urllib.error.HTTPError as e:
        print(f"  WARNING: Vercel deploy hook failed (HTTP {e.code}): {e.read().decode()}")
    except urllib.error.URLError as e:
        print(f"  WARNING: Vercel deploy hook unreachable: {e.reason}")


# ---------------------------------------------------------------------------
# Git push
# ---------------------------------------------------------------------------


def git_commit_and_push() -> None:
    """Stage updated JSON files, commit, and push to trigger Vercel build.

    Vercel builds from git, so local file changes alone don't update the
    deployed dashboard. This ensures the deploy hook rebuilds with fresh data.
    Skips if there are no changes to commit.
    """
    files = [str(LUCA_JSON), str(DASHBOARD_JSON)]
    try:
        # Check if there are actual changes to commit
        result = subprocess.run(
            ["git", "diff", "--quiet", "--"] + files,
            cwd=REPO_ROOT, capture_output=True,
        )
        if result.returncode == 0:
            print("  No changes to commit — JSON already up to date in git.")
            return

        subprocess.run(
            ["git", "add"] + files,
            cwd=REPO_ROOT, check=True, capture_output=True,
        )
        subprocess.run(
            ["git", "commit", "-m", "chore: sync sprint-progress.json from Jira"],
            cwd=REPO_ROOT, check=True, capture_output=True,
        )
        subprocess.run(
            ["git", "push"],
            cwd=REPO_ROOT, check=True, capture_output=True,
        )
        print("  Committed and pushed sprint-progress.json updates.")
    except subprocess.CalledProcessError as e:
        print(f"  WARNING: git push failed: {e.stderr.decode().strip() if e.stderr else e}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    print("Refreshing sprint-progress.json from Jira (LKID)...\n")

    issues = fetch_jira_issues()
    print(f"Fetched {len(issues)} issues from Jira.\n")

    lookup = build_status_lookup(issues)
    data = refresh_json(lookup)
    write_json(data)

    print("\nPushing to git...")
    git_commit_and_push()

    print("\nTriggering Vercel rebuild...")
    trigger_vercel_deploy()

    print("\nDone.")


if __name__ == "__main__":
    main()
