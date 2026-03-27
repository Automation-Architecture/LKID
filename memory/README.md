# memory/

Project-scoped learning system. See `docs/memory-system-reference.md` for entry format and rules.

## Status

**Phase:** Development Phase (Sprint 2 in progress)
**Last updated:** 2026-03-26

## Contents

| File | Entries | Description |
|------|---------|-------------|
| `patterns.json` | 31 | What works well — architecture, API design, DB, frontend, UX, testing, SOP |
| `anti_patterns.json` | 19 | What to avoid — security, compliance, process, schema alignment |
| `decisions.json` | 16 | All 14 PRD binding decisions + 2 bootstrap decisions |
| `insights.json` | 17 | Process learnings, capacity planning, coordination patterns |
| `tooling.json` | 31 | Full stack inventory with context and applicability |
| `compressed_summary.md` | — | Post-discovery consolidated playbook with key decisions and learnings |

## How Agents Use This

1. **At project start:** Read all files to load project context.
2. **Before decisions:** Check `decisions.json` for existing binding decisions.
3. **During implementation:** Filter `patterns.json` and `anti_patterns.json` by `applicability` field (matches agent names or domains).
4. **For tool choices:** Reference `tooling.json` for approved tools and their rationale.
5. **At sprint boundaries:** Record new patterns, anti-patterns, and insights from QA cycles.

## Applicability Filtering

Discovery-phase entries use agent names in `applicability` for targeted filtering:
- `harshit` — frontend patterns, tools, and decisions
- `john-donaldson` — API design, backend
- `gay-mark` — database engineering
- `inga` — UX/UI design
- `yuri` — testing and QA
- `husser` — product decisions

Bootstrap entries use generic applicability (`All projects`, `All agent team projects`).
