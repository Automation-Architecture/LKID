# agents/

Isolated workspaces for each team member. Each agent has its own `notes.md`, `drafts/`, and `outputs/`. Agents write ONLY in their own folder, and may **read** but NOT **modify** another agent's artifacts.

## How Agents Work

Luca (CTO) orchestrates. Husser (PM) runs the board. Inga owns UX/UI. John builds the API and prediction engine. Gay Mark owns the database. Harshit owns the frontend. Yuri owns QA. Each feature card gets a branch, a PR, Copilot + CodeRabbit review, and a Yuri QA verdict before merge.

## Authoritative Team + Deliverables

See `CLAUDE.md` for the live team table and per-agent deliverables. This README does not enumerate artifacts — to prevent drift, the **Key Documents** table in `CLAUDE.md` is the single source of truth.

## Rules

- Agents write ONLY in their own `/agents/{name}/` folder
- Agents may read but NOT modify another agent's artifacts
- Approved contracts are binding; QA approval required before merge
- See `CLAUDE.md` → *Critical Rules* for the full list
