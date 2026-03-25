# Agent Teams — Master Reference Guide

> Source: [Claude Code Docs — Agent Teams](https://code.claude.com/docs/en/agent-teams)
> Last updated: 2026-03-24

---

## Overview

Agent teams coordinate multiple Claude Code instances working together. One session acts as the **team lead**, coordinating work, assigning tasks, and synthesizing results. **Teammates** work independently, each in its own context window, and communicate directly with each other.

Unlike subagents (which run within a single session and can only report back to the main agent), you can interact with individual teammates directly without going through the lead.

**Requirements:** Claude Code v2.1.32 or later. Experimental — disabled by default.

---

## When to Use Agent Teams

### Best Use Cases

| Use Case | Why It Works |
|---|---|
| **Research and review** | Multiple teammates investigate different aspects simultaneously, then share and challenge findings |
| **New modules or features** | Teammates each own a separate piece without stepping on each other |
| **Debugging with competing hypotheses** | Teammates test different theories in parallel and converge faster |
| **Cross-layer coordination** | Changes spanning frontend, backend, and tests — each owned by a different teammate |

### When NOT to Use

Agent teams add coordination overhead and use significantly more tokens. Avoid for:

- Sequential tasks
- Same-file edits
- Work with many dependencies
- Routine tasks (a single session is more cost-effective)

### Agent Teams vs Subagents

|  | Subagents | Agent Teams |
|---|---|---|
| **Context** | Own context window; results return to the caller | Own context window; fully independent |
| **Communication** | Report results back to the main agent only | Teammates message each other directly |
| **Coordination** | Main agent manages all work | Shared task list with self-coordination |
| **Best for** | Focused tasks where only the result matters | Complex work requiring discussion and collaboration |
| **Token cost** | Lower: results summarized back to main context | Higher: each teammate is a separate Claude instance |

**Rule of thumb:** Use subagents when you need quick, focused workers that report back. Use agent teams when teammates need to share findings, challenge each other, and coordinate on their own.

---

## Enabling Agent Teams

Set the `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` environment variable to `1`, either in your shell or in settings.json:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

---

## Architecture

| Component | Role |
|---|---|
| **Team lead** | The main Claude Code session — creates the team, spawns teammates, coordinates work |
| **Teammates** | Separate Claude Code instances that each work on assigned tasks |
| **Task list** | Shared list of work items that teammates claim and complete |
| **Mailbox** | Messaging system for communication between agents |

### Storage Locations

- **Team config:** `~/.claude/teams/{team-name}/config.json`
- **Task list:** `~/.claude/tasks/{team-name}/`

The team config contains a `members` array with each teammate's name, agent ID, and agent type. Teammates can read this file to discover other team members.

### Permissions

Teammates start with the lead's permission settings. If the lead runs with `--dangerously-skip-permissions`, all teammates do too. You can change individual teammate modes after spawning, but not at spawn time.

### Context and Communication

Each teammate has its own context window. When spawned, a teammate loads:
- CLAUDE.md
- MCP servers
- Skills
- The spawn prompt from the lead

The lead's conversation history does **not** carry over.

**How teammates share information:**

- **Automatic message delivery** — messages delivered automatically to recipients; no polling needed
- **Idle notifications** — when a teammate finishes, it automatically notifies the lead
- **Shared task list** — all agents can see task status and claim available work

**Messaging types:**

- **message** — send to one specific teammate
- **broadcast** — send to all teammates simultaneously (use sparingly — costs scale with team size)

### Token Usage

Each teammate has its own context window. Token usage scales linearly with active teammates. For research, review, and new feature work, the extra tokens are usually worthwhile.

---

## Starting a Team

Tell Claude to create an agent team and describe the task and team structure in natural language:

```
I'm designing a CLI tool that helps developers track TODO comments across
their codebase. Create an agent team to explore this from different angles: one
teammate on UX, one on technical architecture, one playing devil's advocate.
```

### Two Ways Teams Start

1. **You request a team** — explicitly ask for an agent team
2. **Claude proposes a team** — Claude suggests a team if it determines the task would benefit; you confirm before it proceeds

Claude won't create a team without your approval.

---

## Controlling Your Team

### Display Modes

| Mode | Description | Requirements |
|---|---|---|
| **In-process** (default) | All teammates run inside your main terminal | Any terminal |
| **Split panes** | Each teammate gets its own pane | tmux or iTerm2 |
| **Auto** (default setting) | Uses split panes if inside tmux, otherwise in-process | — |

Configure in settings.json:

```json
{
  "teammateMode": "in-process"
}
```

Or per-session:

```bash
claude --teammate-mode in-process
```

**Split pane setup:**
- **tmux:** Install via package manager
- **iTerm2:** Install the `it2` CLI, then enable Python API in iTerm2 > Settings > General > Magic

### Specifying Teammates and Models

```
Create a team with 4 teammates to refactor these modules in parallel.
Use Sonnet for each teammate.
```

### Requiring Plan Approval

For complex or risky tasks, require teammates to plan before implementing:

```
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
```

The teammate works in read-only plan mode until the lead approves. If rejected, the teammate revises and resubmits. The lead makes approval decisions autonomously — influence its judgment by giving criteria in your prompt (e.g., "only approve plans that include test coverage").

### Talking to Teammates Directly

- **In-process mode:** Shift+Down to cycle through teammates, type to message. Enter to view, Escape to interrupt, Ctrl+T for task list.
- **Split-pane mode:** Click into a teammate's pane.

### Assigning and Claiming Tasks

Tasks have three states: **pending**, **in progress**, **completed**. Tasks can depend on other tasks (blocked until dependencies complete).

- **Lead assigns** — tell the lead which task to give to which teammate
- **Self-claim** — after finishing, a teammate picks up the next unassigned, unblocked task

Task claiming uses file locking to prevent race conditions.

### Shutting Down Teammates

```
Ask the researcher teammate to shut down
```

The lead sends a shutdown request. The teammate can approve (exit gracefully) or reject with an explanation.

### Cleaning Up the Team

```
Clean up the team
```

Always use the lead to clean up. The lead checks for active teammates and fails if any are still running — shut them down first. Teammates should not run cleanup.

---

## Quality Gates with Hooks

| Hook | When It Runs | Behavior |
|---|---|---|
| `TeammateIdle` | When a teammate is about to go idle | Exit code 2 sends feedback and keeps the teammate working |
| `TaskCompleted` | When a task is being marked complete | Exit code 2 prevents completion and sends feedback |

---

## Use Case Examples

### Parallel Code Review

```
Create an agent team to review PR #142. Spawn three reviewers:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

Why it works: splitting review criteria into independent domains means security, performance, and test coverage all get thorough attention simultaneously. The lead synthesizes findings across all three.

### Investigating with Competing Hypotheses

```
Users report the app exits after one message instead of staying connected.
Spawn 5 agent teammates to investigate different hypotheses. Have them talk to
each other to try to disprove each other's theories, like a scientific
debate. Update the findings doc with whatever consensus emerges.
```

Why it works: sequential investigation suffers from anchoring bias. Multiple independent investigators actively trying to disprove each other means the surviving theory is much more likely to be the actual root cause.

---

## Best Practices

### 1. Give Teammates Enough Context

Teammates load project context (CLAUDE.md, MCP servers, skills) but **don't inherit the lead's conversation history**. Include task-specific details in the spawn prompt:

```
Spawn a security reviewer teammate with the prompt: "Review the authentication
module at src/auth/ for security vulnerabilities. Focus on token handling,
session management, and input validation. The app uses JWT tokens stored in
httpOnly cookies. Report any issues with severity ratings."
```

### 2. Choose an Appropriate Team Size

- **Recommended:** 3-5 teammates for most workflows
- **Task ratio:** 5-6 tasks per teammate keeps everyone productive
- **Example:** 15 independent tasks → 3 teammates is a good starting point
- Three focused teammates often outperform five scattered ones

### 3. Size Tasks Appropriately

| Size | Problem |
|---|---|
| Too small | Coordination overhead exceeds the benefit |
| Too large | Teammates work too long without check-ins, increasing wasted effort risk |
| Just right | Self-contained units that produce a clear deliverable (function, test file, review) |

If the lead isn't creating enough tasks, ask it to split the work into smaller pieces.

### 4. Wait for Teammates to Finish

If the lead starts implementing tasks itself instead of waiting:

```
Wait for your teammates to complete their tasks before proceeding
```

### 5. Start with Research and Review

If new to agent teams, start with non-coding tasks: reviewing a PR, researching a library, or investigating a bug. These show the value of parallel exploration without coordination challenges.

### 6. Avoid File Conflicts

Two teammates editing the same file leads to overwrites. Break work so each teammate owns different files.

### 7. Monitor and Steer

Check in on progress, redirect approaches that aren't working, and synthesize findings as they come in. Don't let a team run unattended too long.

---

## Troubleshooting

### Teammates Not Appearing

- In-process mode: press Shift+Down to cycle — they may be running but not visible
- Check if the task was complex enough to warrant a team
- For split panes: verify tmux is installed (`which tmux`) or iTerm2 `it2` CLI is available with Python API enabled

### Too Many Permission Prompts

Pre-approve common operations in permission settings before spawning teammates.

### Teammates Stopping on Errors

Check output via Shift+Down (in-process) or click the pane (split mode), then either:
- Give additional instructions directly
- Spawn a replacement teammate

### Lead Shuts Down Before Work is Done

Tell it to keep going, or tell it to wait for teammates before proceeding.

### Orphaned tmux Sessions

```bash
tmux ls
tmux kill-session -t <session-name>
```

---

## Limitations

| Limitation | Details |
|---|---|
| **No session resumption** | `/resume` and `/rewind` don't restore in-process teammates. Tell lead to spawn new ones after resuming. |
| **Task status can lag** | Teammates sometimes fail to mark tasks complete, blocking dependent tasks. Check and update manually. |
| **Shutdown can be slow** | Teammates finish current request/tool call before shutting down. |
| **One team per session** | Clean up current team before starting a new one. |
| **No nested teams** | Teammates cannot spawn their own teams. Only the lead manages the team. |
| **Lead is fixed** | The creating session is the lead for its lifetime. No transfers. |
| **Permissions set at spawn** | All teammates start with lead's mode. Change individually after spawning. |
| **Split panes limited** | Not supported in VS Code terminal, Windows Terminal, or Ghostty. Requires tmux or iTerm2. |

**CLAUDE.md works normally** — teammates read CLAUDE.md files from their working directory.

---

## Quick Reference: Keyboard Shortcuts (In-Process Mode)

| Key | Action |
|---|---|
| Shift+Down | Cycle through teammates |
| Enter | View a teammate's session |
| Escape | Interrupt teammate's current turn |
| Ctrl+T | Toggle task list |

---

## Related Approaches

| Approach | When to Use |
|---|---|
| [Subagents](https://code.claude.com/docs/en/sub-agents) | Lightweight delegation — spawn helpers for research or verification within your session |
| [Git worktrees](https://code.claude.com/docs/en/common-workflows#run-parallel-claude-code-sessions-with-git-worktrees) | Manual parallel sessions without automated team coordination |
