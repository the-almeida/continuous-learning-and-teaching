# claude-setup

User-level Claude Code configuration shared by all my Claude Code cloud environments. Each environment's setup script fetches and runs [`cloud-environment-setup.sh`](./cloud-environment-setup.sh), so a change here reaches every environment on its next fresh container.

## What it installs

| File | Purpose |
| --- | --- |
| `~/.claude/hooks/pre-push-branch-name.sh` | `PreToolUse(Bash)` hook. Blocks `git push` to a `claude/*` branch that doesn't match `claude/<conventional-type>-<kebab-slug>`. Only active when `CLAUDE_CODE_REMOTE=true`; fails open on anything unexpected. |
| `~/.claude/settings.json` | Registers the hook. Merged with `jq`, so other settings are kept. |
| `~/.claude/CLAUDE.md` | Tells Claude to rename the random branch before the first push, and gives standing permission to push to the renamed branch. Without it, the cloud harness instruction "push only to the assigned branch" fights the hook. |

Running it twice changes nothing.

## Add it to an environment

claude.ai → Code → environment menu → **Edit** → **Setup script**, append:

```bash
curl -fsSL https://raw.githubusercontent.com/the-almeida/continuous-learning-and-teaching/main/ai-tooling/claude-setup/cloud-environment-setup.sh | bash || echo "claude-setup skipped"
```

The `|| echo` keeps a download failure from blocking the session start. The environment's network must reach `raw.githubusercontent.com`.

Repeat for every new environment: setup scripts are per environment and aren't inherited.

## Security

The setup script runs as root, so whatever is on `main` here runs in every environment. Keep `main` protected. To freeze an environment on a reviewed version, replace `main` in the URL with a commit SHA.

## Test

```bash
H=~/.claude/hooks/pre-push-branch-name.sh
printf '{"tool_input":{"command":"git push -u origin claude/nifty-cray-c5i9qp"}}' | CLAUDE_CODE_REMOTE=true bash $H; echo $?  # 2 (blocked)
printf '{"tool_input":{"command":"git push -u origin claude/feat-audit-log"}}' | CLAUDE_CODE_REMOTE=true bash $H; echo $?  # 0
```
