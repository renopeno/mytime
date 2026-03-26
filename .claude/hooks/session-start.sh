#!/bin/bash
set -euo pipefail

# Only run in remote (web) sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Install dependencies
npm install

# Pull latest changes from remote
git fetch origin
current_branch=$(git branch --show-current)
if [ -n "$current_branch" ]; then
  git pull --ff-only origin "$current_branch" 2>/dev/null || echo "Could not fast-forward, branch may have diverged"
fi
