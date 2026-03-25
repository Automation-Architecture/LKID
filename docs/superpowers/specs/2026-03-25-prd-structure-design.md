# PRD Structure Design Spec

**Date:** 2026-03-25
**Author:** Brad (via brainstorming session)
**Executor:** Husser (Product Manager agent)
**Output:** `artifacts/PRD.md`

---

## Overview

This spec defines the structure, format, and content requirements for the KidneyHood PRD. The PRD is a **synthesis document** — Husser reads all agent V2 drafts and produces a single authoritative document. It is NOT a parallel draft.

The PRD follows **Approach A: Executive-First** — a short, scannable main body with link-heavy references, pushing all domain detail into per-role appendices.

### Relationship to Discovery Phase SOP

This spec **supersedes** the SOP's 17-section PRD structure. The SOP was written for a traditional flat document; this spec restructures for scannability. Here's where each SOP-required section lives:

| SOP Section | Location in This PRD |
|-------------|---------------------|
| 1. Executive Summary | Section 1 |
| 2. Problem Statement | Section 1 (folded into Executive Summary) |
| 3. Goals & Success Criteria | Section 1 (folded into Executive Summary) |
| 4. Scope (MVP vs. deferred) | Section 1 (folded into Executive Summary) |
| 5. User Flows | Appendix D (UX/UI Design) |
| 6. Functional Requirements | Appendix C (Frontend) + Appendix A (API) |
| 7. Technical Architecture | Section 4 (summary) + Appendix F (full) |
| 8. API Contracts | Appendix A (API Design) |
| 9. Database Schema | Appendix B (Database Engineering) |
| 10. Frontend Architecture | Appendix C (Frontend Architecture) |
| 11. Auth & Security | Section 4 (summary) + Appendix A/F (detail) |
| 12. UX/UI Specifications | Appendix D (UX/UI Design) |
| 13. Test Strategy | Appendix E (Test Strategy) |
| 14. Dependency Map | Section 2 (Milestones & Epics) + Section 4 (Technical Considerations — cross-agent dependencies and blockers) |
| 15. Sprint Plan | Section 2 (Milestones & Epics + timeline diagram) |
| 16. Risks & Mitigations | Section 4 (Technical Considerations) |
| 17. Decisions Log | Per-appendix Key Decisions sections |

---

## PRD Structure

### Section 1: Executive Summary

- Half-page plain-language overview
- Covers: what KidneyHood is, the problem it solves, tech stack (Next.js 15 + FastAPI + PostgreSQL), MVP scope, current project status
- No Jira keys — stakeholder-readable language only

### Section 2: Milestones & Epics

Summary table with one row per epic:

| Column | Content |
|--------|---------|
| Epic | Epic name |
| Description | One-line summary |
| Sprint | Sprint number (0-4) |
| Jira Stories | Bare Jira keys (e.g., `SPEC-42`) — MCP-resolvable, no URLs |
| Status | Planned / In Progress / Done |

Below the table: an Excalidraw sprint timeline diagram showing sprints 0-4 as a horizontal lane chart with milestones marked.

- **File:** `docs/prd-sprint-timeline.excalidraw`
- **Brand colors:** Automation Architecture palette (Teal #004D43, Lime #E6FF2B, Cream #F9F7F2, etc.)
- **Referenced from PRD** as a relative link

### Section 3: Agent Responsibility Matrix

Table with one row per role:

| Column | Content |
|--------|---------|
| Role | Role title (e.g., "Frontend Developer") — no agent names |
| Stories | Count of assigned stories |
| Subtasks | Count of assigned subtasks |
| Key Deliverables | Brief list of what this role produces |

Below the table: an Excalidraw pie chart showing role work effort as a ratio of total assigned items. Pie slices labeled by Role.

- **File:** `docs/prd-agent-workload.excalidraw`
- **Brand colors:** Automation Architecture palette
- **Referenced from PRD** as a relative link

### Section 4: Technical Considerations

Concise section covering project-level technical decisions and constraints. Not a full architecture doc (that's Appendix F). Each item is a short paragraph with a link to the relevant appendix for detail:

- Tech stack rationale — why Next.js 15 + FastAPI + PostgreSQL
- HIPAA compliance constraints — data handling, session management, guest purge
- Two-endpoint API pattern — minimal API surface decision
- Magic link auth — no passwords, session management implications
- Infrastructure dependencies — what must exist before Sprint 1 (unowned infra tickets SPEC-74, 75, 78)
- Cross-agent dependencies — blockers and handoffs between roles (maps to SOP Section 14: Dependency Map)

### Section 5: Open Questions

Table of genuinely unresolved items only. No answers — just the inventory.

| Column | Content |
|--------|---------|
| Domain | Which domain area (API Design, Database, Frontend, UX, etc.) |
| Question | The unresolved question |

**Source:** Husser scans every agent's `notes.md` and files in `drafts/` for items flagged as TBD, open, undecided, or needing clarification. Resolved items go into the relevant appendix's Key Decisions — only open items land here.

### Sections 6-11: Appendices

Six appendices, one per agent role. Each is a **synthesized summary** of the agent's V2 drafts — not a copy-paste.

| Appendix | Label | Source Files |
|----------|-------|-------------|
| A | API Design | All files in `agents/john-donaldson/drafts/` |
| B | Database Engineering | All files in `agents/gay-mark/drafts/` |
| C | Frontend Architecture | All files in `agents/harshit/drafts/` |
| D | UX/UI Design | All files in `agents/inga/drafts/` |
| E | Test Strategy | All files in `agents/yuri/drafts/` |
| F | System Architecture | All files in `agents/luca/drafts/` |

Appendix headings use the role label only (e.g., "Appendix A: API Design") — no agent names in headings.

Each appendix follows a consistent internal format:

1. **Scope** — what this domain covers
2. **Key Decisions** — choices made and why
3. **Requirements Summary** — essential specs (tables, schemas, endpoint lists)
4. **Jira Stories** — relevant bare Jira keys for this domain

**Appendix depth:** Each appendix should be roughly 30-50% the length of its source V2 drafts. The goal is to distill, not truncate.

---

## Excalidraw Diagrams

Two branded Excalidraw diagrams are generated as part of the PRD:

| Diagram | File | Description |
|---------|------|-------------|
| Sprint Timeline | `docs/prd-sprint-timeline.excalidraw` | Horizontal lane chart, sprints 0-4, milestones marked |
| Agent Workload | `docs/prd-agent-workload.excalidraw` | Pie chart, work effort ratio by role |

Both use the Automation Architecture brand palette:

| Role | Hex |
|------|-----|
| Teal (primary fills) | `#004D43` |
| Lime (accents) | `#E6FF2B` |
| Cream (backgrounds) | `#F9F7F2` |
| Body (secondary text) | `#636363` |
| Black (text, arrows) | `#010101` |
| Gray (borders) | `#898A8D` |
| Divider (separators) | `#D8D8D8` |
| White (card fills) | `#FFFFFF` |

---

## Jira Reference Format

All Jira references in the PRD use bare keys (e.g., `SPEC-42`) — no full URLs. This keeps the document clean and allows MCP tools (Atlassian MCP) to resolve them programmatically.

---

## Target Length

- **Main body (Sections 1-5):** 3-5 pages
- **Each appendix:** 1-3 pages (30-50% of source V2 draft length)
- **Total PRD:** ~15-25 pages including appendices

---

## Execution Instructions for Husser

1. Read ALL agent V2 drafts in `agents/*/drafts/`
2. Read ALL agent `notes.md` files for open questions
3. Derive sprint-to-epic mapping from Jira board sprint assignments (query via Atlassian MCP using project key `SPEC`)
4. Write the PRD to `artifacts/PRD.md` following this spec exactly
5. Generate both Excalidraw diagrams using the Excalidraw MCP tool (`mcp__claude_ai_Excalidraw__create_view`) with the brand palette, then save as `.excalidraw` files
6. The PRD is a synthesis — do not copy-paste from drafts, distill and summarize
7. Appendix content should be comprehensive enough to stand alone but not duplicate the full draft files
8. All Jira references as bare keys only
9. Submit completed PRD to Luca (CTO) for technical review and approval
10. Submit to Yuri (QA) for sign-off that test strategy and coverage are accurately represented
