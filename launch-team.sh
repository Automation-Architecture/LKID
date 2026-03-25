#!/usr/bin/env bash
# Launch the KidneyHood agent team in a tmux dashboard
# Layout: Luca full-height left | 6 agents stacked vertically on right
# Usage: ./launch-team.sh

SESSION="kidneyhood"
PROJECT_DIR="/Users/brad/IDE/agent-teams"

# Kill existing session if it exists
tmux kill-session -t "$SESSION" 2>/dev/null

# Create session with first pane (Luca - Orchestrator)
tmux new-session -d -s "$SESSION" -x "$(tput cols)" -y "$(tput lines)"
tmux rename-window -t "$SESSION" "agents"

# --- Left pane: Luca (full height, ~50% width) ---
tmux send-keys -t "$SESSION" "cd $PROJECT_DIR && printf '\\033]2;Luca (CTO)\\033\\\\'" Enter
tmux send-keys -t "$SESSION" "clear && echo '🎯 Luca — Orchestrator / CTO'" Enter

# --- Right column: 6 agents stacked vertically, top-to-bottom by communication frequency ---

# Pane 1: Husser (PM) — most communication
tmux split-window -t "$SESSION".0 -h -p 50
tmux send-keys -t "$SESSION" "cd $PROJECT_DIR && printf '\\033]2;Husser (PM)\\033\\\\'" Enter
tmux send-keys -t "$SESSION" "clear && echo '📋 Husser — Product Manager'" Enter

# Pane 2: Inga (UX)
tmux split-window -t "$SESSION".1 -v -p 83
tmux send-keys -t "$SESSION" "cd $PROJECT_DIR && printf '\\033]2;Inga (UX)\\033\\\\'" Enter
tmux send-keys -t "$SESSION" "clear && echo '🎨 Inga — UX/UI Senior Designer'" Enter

# Pane 3: Harshit (FE)
tmux split-window -t "$SESSION".2 -v -p 80
tmux send-keys -t "$SESSION" "cd $PROJECT_DIR && printf '\\033]2;Harshit (FE)\\033\\\\'" Enter
tmux send-keys -t "$SESSION" "clear && echo '⚛️  Harshit — Frontend Developer'" Enter

# Pane 4: John (API)
tmux split-window -t "$SESSION".3 -v -p 75
tmux send-keys -t "$SESSION" "cd $PROJECT_DIR && printf '\\033]2;John (API)\\033\\\\'" Enter
tmux send-keys -t "$SESSION" "clear && echo '🔌 John Donaldson — API Designer'" Enter

# Pane 5: Gay Mark (DB)
tmux split-window -t "$SESSION".4 -v -p 67
tmux send-keys -t "$SESSION" "cd $PROJECT_DIR && printf '\\033]2;Gay Mark (DB)\\033\\\\'" Enter
tmux send-keys -t "$SESSION" "clear && echo '🗄️  Gay Mark — Database Engineer'" Enter

# Pane 6: Yuri (QA) — least communication
tmux split-window -t "$SESSION".5 -v -p 50
tmux send-keys -t "$SESSION" "cd $PROJECT_DIR && printf '\\033]2;Yuri (QA)\\033\\\\'" Enter
tmux send-keys -t "$SESSION" "clear && echo '🧪 Yuri — Test Writer / QA'" Enter

# Set pane borders to show titles
tmux set-option -t "$SESSION" pane-border-status top
tmux set-option -t "$SESSION" pane-border-format " #{pane_index}: #T "

# Name each pane explicitly
tmux select-pane -t "$SESSION".0 -T "Luca (CTO)"
tmux select-pane -t "$SESSION".1 -T "Husser (PM)"
tmux select-pane -t "$SESSION".2 -T "Inga (UX)"
tmux select-pane -t "$SESSION".3 -T "Harshit (FE)"
tmux select-pane -t "$SESSION".4 -T "John (API)"
tmux select-pane -t "$SESSION".5 -T "Gay Mark (DB)"
tmux select-pane -t "$SESSION".6 -T "Yuri (QA)"

# Select Luca's pane as starting point
tmux select-pane -t "$SESSION".0

# Attach to the session
tmux attach-session -t "$SESSION"
