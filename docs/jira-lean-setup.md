# Jira — Lean KidneyHood Project Setup

> **Status:** Manual setup required. The available Jira MCP tools do not support project creation (requires Jira admin REST API `POST /rest/api/3/project`).

## Current State (SPEC project)

| Item | Value |
|------|-------|
| Project | SPEC |
| Board | 329 — "KidneyHood" (Scrum) |
| Issues | 89+ (SPEC-1 through SPEC-89) |
| Sprints | 5 future sprints (SPEC Sprint 1, spec_product_ux Sprints 1-4) |
| URL | https://automationarchitecture.atlassian.net/jira/software/c/projects/SPEC/boards/329/backlog |

The SPEC project contains the discovery-phase work. The lean launch needs a clean project to separate development from discovery artifacts.

---

## Step 1 — Create the Project (Manual, Jira Admin)

1. Go to **Jira Settings > Projects > Create project**
   - URL: https://automationarchitecture.atlassian.net/jira/projects
2. Select **Scrum** software project template
3. Configure:

| Field | Value |
|-------|-------|
| Name | **Lean KidneyHood** |
| Key | **LKID** |
| Type | Scrum software project (company-managed) |
| Lead | Brad (or project admin) |

4. Click **Create**

---

## Step 2 — Configure the Board

Once the LKID project exists, the Scrum board is created automatically. Verify:

1. Navigate to the LKID board
2. Under **Board settings > Estimation**, set estimation to **Story Points**
3. Under **Board settings > Columns**, confirm columns: To Do | In Progress | Done (add "In Review" if desired)

---

## Step 3 — Create Sprints (Can Be Automated)

Once the LKID project and board exist, run this to create 2 sprints:

```
# After getting the new board ID (check via jira_get_agile_boards with project_key LKID):

Sprint 1: "LKID Sprint 1"
  Start: 2026-03-30  End: 2026-04-12  (2 weeks)
  Goal: "Core MVP — auth, lab entry, eGFR chart"

Sprint 2: "LKID Sprint 2"
  Start: 2026-04-13  End: 2026-04-26  (2 weeks)
  Goal: "Polish & ship — PDF export, error handling, QA"
```

These can be created via MCP tools once the board ID is known:

```python
# mcp__mcp-atlassian__jira_create_sprint
# board_id: <NEW_BOARD_ID>
# name: "LKID Sprint 1"
# start_date: "2026-03-30T09:00:00.000Z"
# end_date: "2026-04-12T17:00:00.000Z"
# goal: "Core MVP — auth, lab entry, eGFR chart"
```

---

## Step 4 — Create Fix Versions (Can Be Automated)

Once LKID exists, create versions via MCP:

```
v0.1.0 — "MVP Alpha"   (release: 2026-04-12)
v1.0.0 — "Lean Launch"  (release: 2026-04-26)
```

---

## Step 5 — Story Point Scheme

Use Fibonacci: 1, 2, 3, 5, 8, 13. Configure in:
- **Board settings > Estimation > Story Points**
- The default Story Points field in Jira Cloud works out of the box.

---

## Step 6 — Issue Types

Ensure these issue types are available in the LKID project:
- **Epic** — feature areas (Auth, Lab Entry, eGFR Chart, PDF Export)
- **Story** — user-facing functionality
- **Task** — technical work
- **Bug** — defects
- **Subtask** — breakdown of stories/tasks

---

## Post-Creation Automation Checklist

Once the LKID project is created manually, the following can be automated via MCP tools:

- [ ] Create 2 sprints (`jira_create_sprint`)
- [ ] Create fix versions (`jira_batch_create_versions`)
- [ ] Create epics and stories (`jira_batch_create_issues`)
- [ ] Add issues to sprints (`jira_add_issues_to_sprint`)
- [ ] Link SPEC discovery items to LKID issues (`jira_create_issue_link`)

---

## Quick Reference

| What | Tool / Method |
|------|--------------|
| Create project | **Manual** — Jira admin UI |
| Find new board ID | `jira_get_agile_boards` with `project_key: LKID` |
| Create sprints | `jira_create_sprint` with board ID |
| Create versions | `jira_batch_create_versions` with `project_key: LKID` |
| Create issues | `jira_batch_create_issues` or `jira_create_issue` |
| Assign to sprint | `jira_add_issues_to_sprint` |
