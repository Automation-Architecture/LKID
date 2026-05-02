# scripts/

## refresh-sprint-progress.py

Pulls current card statuses from the LKID Jira project, updates `sprint-progress.json` in two locations (`agents/luca/drafts/sprint-progress.json` and `app/src/app/client/data/sprint-progress.json`), commits + pushes both files to git, and triggers a Vercel rebuild via deploy hook.

The Next.js dashboard imports `sprint-progress.json` at build time, so the Vercel rebuild is required for changes to appear live.

### Usage

```bash
python3 scripts/refresh-sprint-progress.py
```

### Required `.env` variables

| Variable | Description |
|----------|-------------|
| `JIRA_EMAIL` | Atlassian account email |
| `JIRA_API_TOKEN` | Jira API token (generate at id.atlassian.com) |
| `VERCEL_DEPLOY_HOOK_URL` | Vercel deploy hook URL (Project Settings > Git > Deploy Hooks); optional — omit to skip rebuild trigger |

### Scheduled agent

This script is a fallback for the scheduled remote agent (trigger ID: `trig_017nHqTJu4Y3tTstg3UtTwb1`) that runs it on an automated cadence. Run manually when the agent is unavailable or a forced sync is needed.
