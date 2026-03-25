# Memory System Reference

> Reference documentation for the project-scoped memory system.
> Referenced by: `discovery-phase-engineering-sop.md`, `development-phase-engineering-sop.md`

---

## Location

All memory files live in `/memory/`.

```
/memory/
├── patterns.json         # What works well
├── anti_patterns.json    # What to avoid
├── decisions.json        # Key decisions and rationale
├── insights.json         # Performance and process learnings
├── tooling.json          # Tools and integrations used
└── compressed_summary.md # End-of-project consolidated playbook
```

---

## Entry Format

Each memory entry follows this structure:

```json
{
  "id": "",
  "artifact": "",
  "category": "pattern | anti-pattern | decision | insight | tooling",
  "summary": "",
  "context": "",
  "impact": "",
  "applicability": "",
  "created_by": "",
  "timestamp": ""
}
```

---

## Rules

- Agents MUST read memory at project start.
- Agents SHOULD reference memory before making decisions.
- Agents MUST NOT use memory outside this project directory.
- Entries must be specific, actionable, and relevant to this project.

---

## Write Checkpoints

| Checkpoint | What to Record |
|------------|----------------|
| After Discovery Phase | Patterns, decisions, and insights from meetings and planning |
| After Architecture decisions | Key architectural choices and trade-offs |
| After QA cycles | What passed, what failed, what was learned |
| At Final Completion | Consolidated learnings and compressed summary |

---

## Artifact Registry Schema

`/artifacts/registry.json` tracks all project artifacts. The registry is populated during the Development Phase (see `development-phase-engineering-sop.md`, Step 1).

```json
{
  "artifacts": [
    {
      "id": "",
      "name": "",
      "type": "prd | architecture | api_contract | db_schema | component | test | report",
      "path": "",
      "status": "draft | review | approved | superseded",
      "owner": "",
      "created_at": "",
      "updated_at": "",
      "dependencies": [],
      "notes": ""
    }
  ]
}
```
