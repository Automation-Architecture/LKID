# Document Structure Chatroom Report

**Problem**: Should we restructure ~150 repo documents into centralized directories before Sprint 3?
**Agents**: 2 | **Rounds**: 2 (converged early)
**Date**: 2026-03-27

## Participants

| Agent | Role | Final Confidence |
|-------|------|-----------------|
| Husser | Product Manager / Board Nanny | 8/10 |
| Luca | CTO / Orchestrator | 9/10 |

## Consensus

Both agents converged on the same conclusion by Round 2:

1. **Do NOT restructure directories before ship date (April 9).** The risk of broken path references in CLAUDE.md and agent SOPs outweighs the discoverability benefit. CLAUDE.md is code-adjacent config — corrupting it mid-sprint affects every agent simultaneously.

2. **The real problem is an incomplete Key Documents table in CLAUDE.md**, not directory structure. Fix the index, not the filesystem.

3. **Empty outputs/ folders are a process gap.** Nobody graduates docs because there's no graduation criteria — adding new folders doesn't fix that.

4. **Defer the full restructure to post-ship (after April 9 retrospective)** as a standalone maintenance PR with a script that updates all path references atomically.

## Recommended Action (3 items, all doable today)

### 1. Expand Key Documents table in CLAUDE.md
Add all missing binding documents with a Status column. Zero risk, fixes discoverability immediately.

### 2. Add graduation trigger to Development Phase SOP
One paragraph: any artifact that enters the Key Documents table must move to the agent's `outputs/` folder. Cross-agent, not just Yuri. Agent who owns the artifact is responsible for updating the CLAUDE.md row when it graduates.

### 3. Add CLAUDE.md maintenance rule to merge checklist
Any agent whose artifact is referenced in Key Documents updates that row when the artifact changes. Prevents table drift.

### Post-ship (after April 9)
Execute the full restructure (docs/governance/, docs/technical/, docs/clinical/, docs/reports/, docs/specs/, docs/reference/) as a dedicated PR. Use `artifacts/registry.json` as the graduation mechanism. Husser executes promotions; Luca reviews the PR.

## Key Disagreement (Minor)

- **Husser** wanted the restructure PR at "Sprint 3 close" (April 9)
- **Luca** pushed for "post-ship, post-retrospective" to avoid collision with the QA gate

Luca's timing is more conservative and both agreed the difference is days, not weeks.

## Unresolved Risks

- The Key Documents table will drift again by mid-Sprint 3 unless the maintenance rule is actually enforced during Husser's daily sweeps
- Yuri's QA reports folder will grow by 8-10 more files in Sprint 3 before restructure happens
- "Defer to post-ship" is what was said last sprint — needs a concrete Jira card to prevent indefinite deferral

## Debate Highlights

- **Strongest shared insight:** "Two copies of truth is worse than one imperfect location" (Husser, Round 1). Both agents independently identified that a promotion workflow creating duplicates would be worse than the current scattered-but-single-source state.
- **Mind change:** Husser conceded entirely on the restructure timing after Luca framed CLAUDE.md as "code-adjacent config." Husser also dropped the QA SOP promotion idea in favor of Luca's Dev SOP location.
- **Convergence speed:** Both agents arrived at nearly identical proposals independently in Round 1, then refined to full agreement in Round 2. High confidence in the conclusion.
