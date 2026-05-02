# memory/

Project-scoped learning system. See `docs/memory-system-reference.md` for entry format and rules.

## Status

**Phase:** Post-Sprint 5 — active hardening (a11y, engine edge cases, visual regression, UI polish)
**Last updated:** 2026-05-02

## Contents

| File | Entries | Description |
|------|---------|-------------|
| `patterns.json` | 31 | What works well — architecture, API design, DB, frontend, UX, testing, SOP |
| `anti_patterns.json` | 19 | What to avoid — security, compliance, process, schema alignment |
| `decisions.json` | 16 | Binding PRD + bootstrap decisions |
| `insights.json` | 17 | Process learnings, capacity planning, coordination patterns |
| `tooling.json` | 31 | Full stack inventory with context and applicability |
| `compressed_summary.md` | — | Consolidated playbook with key decisions and learnings |

Total: 114 entries. Counts must stay in sync with `CLAUDE.md` (Critical Rules section).

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
