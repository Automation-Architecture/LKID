# QA Report: Client Dashboard Sprint Progress Not Updating

**Tester:** Yuri (QA / Test Writer)
**Date:** 2026-03-27
**URL:** https://kidneyhood.vercel.app/client/lee-a3f8b2
**Severity:** Medium (client-facing data is stale but not broken)

---

## Summary

The client dashboard Sprint Progress section displays stale card statuses. The `refresh-sprint-progress.py` script successfully pulled updated statuses from Jira and wrote them to local JSON files, but **the changes were never committed or pushed to git**. Since Vercel builds from the git repo, the deploy hook triggered a rebuild using the old committed data -- effectively a no-op rebuild.

## Root Cause

**The refresh script does not commit or push changes to git.**

The pipeline has a gap:

```
Jira API  -->  Local JSON files  -->  [MISSING: git add + commit + push]  -->  Vercel deploy hook  -->  Vercel build (from git)
```

The script (`scripts/refresh-sprint-progress.py`) correctly:
1. Fetches card statuses from Jira
2. Writes updated JSON to both `agents/luca/drafts/sprint-progress.json` and `app/src/app/client/data/sprint-progress.json`
3. Triggers the Vercel deploy hook (received HTTP 201)

But it does NOT:
4. Stage the changed files (`git add`)
5. Commit the changes (`git commit`)
6. Push to origin (`git push`)

Without step 6, the Vercel deploy hook simply rebuilds from the same commit that was already deployed, so the dashboard shows the old data.

### Evidence

- `git status` shows `modified: agents/luca/drafts/sprint-progress.json` (unstaged)
- `git diff` confirms both JSON files have local changes (23 cards moved to "done") that are not committed
- The last commit touching these files is `15f4f48` ("chore: align all sprint dates to Friday-to-Friday cadence"), which predates the refresh
- The current `origin/main` HEAD is `c8a3123`, which does not include the sprint data updates

## Dashboard Observations

### Page Load
- Page loads successfully, no broken sections
- All 7 dashboard sections render: hero/timeline, weekly updates, prototype embed, sprint progress, spec tracker, document library
- No visible JavaScript errors or broken UI elements

### Sprint Progress Section (STALE DATA)

| Sprint | Displayed | Expected (from Jira) |
|--------|-----------|---------------------|
| Sprint 1 -- Design Sprint | 7 of 17 complete | 17 of 17 complete |
| Sprint 2 -- Core Flow | 0 of 17 complete | 14 of 17 complete |
| Sprint 3 -- Polish & QA | 0 of 12 complete | 0 of 12 complete (correct) |

Specific card discrepancies on Sprint 1:
- LKID-30 (Design sprint kickoff): shows "upcoming", should be "done"
- LKID-38 (Design sign-off): shows "in_progress", should be "done"
- LKID-39 through LKID-46 (all client dashboard cards): show "upcoming", should be "done"

Specific card discrepancies on Sprint 2:
- LKID-1, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18: all show "upcoming", should be "done"
- LKID-2, 3, 14, 19: correctly show "upcoming"

### Other Sections
- Timeline bar at top: renders correctly, shows sprint date ranges
- Weekly Updates: Week 1 content displays properly
- Live Prototype section: renders with 3 placeholder cards (Landing Page, Prediction Form, Results Chart)
- No console errors observed

## Recommended Fix

Add git commit and push to the refresh script after writing JSON files. Insert between `write_json(data)` and `trigger_vercel_deploy()` in `main()`:

```python
import subprocess

def git_commit_and_push() -> None:
    """Stage, commit, and push the updated JSON files."""
    files = [str(LUCA_JSON), str(DASHBOARD_JSON)]
    try:
        subprocess.run(["git", "add"] + files, check=True, cwd=REPO_ROOT)
        subprocess.run(
            ["git", "commit", "-m", "chore(data): refresh sprint progress from Jira"],
            check=True, cwd=REPO_ROOT
        )
        subprocess.run(["git", "push"], check=True, cwd=REPO_ROOT)
        print("  Committed and pushed sprint data updates.")
    except subprocess.CalledProcessError as e:
        print(f"  WARNING: Git operation failed: {e}")
```

Call `git_commit_and_push()` in `main()` after `write_json(data)` and before `trigger_vercel_deploy()`.

### Alternatively (immediate fix)

To unblock the dashboard right now, manually commit and push the already-updated local files:

```bash
git add agents/luca/drafts/sprint-progress.json app/src/app/client/data/sprint-progress.json
git commit -m "chore(data): refresh sprint progress from Jira (23 cards done)"
git push
```

The existing Vercel deploy hook will auto-build on push, or trigger it manually from the Vercel dashboard.

## Additional Notes

- The cron job (daily at 8am ET) will hit the same issue every day until the script is patched
- Consider whether the deploy hook is even needed if the script pushes to git -- Vercel auto-deploys on push to `main` by default, making the hook redundant
- The script docstring (line 12-13) says "a Vercel redeploy is needed after this script runs" but does not mention that the JSON must be committed first -- this should be updated
