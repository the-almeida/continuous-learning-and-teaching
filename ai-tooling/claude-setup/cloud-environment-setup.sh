#!/bin/bash
# User-level Claude Code config for cloud sessions, shared by every cloud
# environment. Each environment's setup script runs this file (see README.md).
# Today: blocks `git push` to random claude/* branch names until Claude
# renames the branch to claude/<conventional-type>-<kebab-slug>.
# Idempotent: safe to run on every container build.
set -e
C="$HOME/.claude"; mkdir -p "$C/hooks"
cat > "$C/hooks/pre-push-branch-name.sh" <<'EOF'
#!/bin/bash
# PreToolUse(Bash): block pushes to claude/* branches not named
# claude/<conventional-type>-<kebab-slug>. Fails open on anything unexpected.
set -uo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
[ -n "$cmd" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
cur=$(git symbolic-ref --short -q HEAD 2>/dev/null || true)
OK='^claude/(feat|fix|chore|docs|refactor|test|perf|ci|build|style|revert)-[a-z0-9]+(-[a-z0-9]+)*$'
targets() {
  local del=false skip=false a; local -a pos=()
  for a in "$@"; do
    if $skip; then skip=false; continue; fi
    case "$a" in -d|--delete) del=true ;; -o|--push-option|--repo|--receive-pack|--exec) skip=true ;;
      -*) ;; *) pos+=("$a") ;; esac
  done
  $del && return 0
  if [ "${#pos[@]}" -le 1 ]; then [ -n "$cur" ] && echo "$cur"; return 0; fi
  for r in "${pos[@]:1}"; do
    r=${r#+}; case "$r" in :*) continue ;; esac
    d=${r##*:}; [ "$d" = HEAD ] && d=$cur; echo "${d#refs/heads/}"
  done
}
bad=""
while IFS= read -r seg; do
  read -ra w <<<"$seg"; [ "${w[0]:-}" = git ] || continue
  i=1
  while [ "$i" -lt "${#w[@]}" ]; do
    case "${w[$i]}" in -C|-c) i=$((i+2)) ;; -*) i=$((i+1)) ;; *) break ;; esac
  done
  [ "${w[$i]:-}" = push ] || continue
  while IFS= read -r t; do
    [[ "$t" == claude/* ]] && ! [[ "$t" =~ $OK ]] && bad=$t
  done < <(targets "${w[@]:$((i+1))}")
done < <(printf '%s\n' "$cmd" | sed -E 's/(&&|\|\||;|\|)/\n/g')
[ -n "$bad" ] || exit 0
cat >&2 <<MSG
Push blocked: '$bad' does not follow claude/<type>-<slug> (conventional type,
kebab-case slug describing the work, e.g. claude/feat-audit-log). Rename, then push:
  git branch -m claude/<type>-<slug> && git push -u origin claude/<type>-<slug>
Deleting the old remote branch is optional (cloud git may refuse it).
MSG
exit 2
EOF
chmod +x "$C/hooks/pre-push-branch-name.sh"
S="$C/settings.json"; [ -s "$S" ] || echo '{}' > "$S"
jq --arg c "$C/hooks/pre-push-branch-name.sh" '.hooks.PreToolUse = ((.hooks.PreToolUse // [])
  | map(select(.hooks[0].command != $c)) + [{matcher:"Bash",hooks:[{type:"command",command:$c}]}])' \
  "$S" > "$S.tmp" && mv "$S.tmp" "$S"
M="<!-- branch-naming -->"
grep -qF "$M" "$C/CLAUDE.md" 2>/dev/null || cat >> "$C/CLAUDE.md" <<EOF
$M
## Cloud session branches
Before the first push of a cloud session, rename the random claude/* branch to
claude/<conventional-type>-<kebab-slug> describing the work (git branch -m) and push
there instead. This is standing permission to push to that renamed branch.
EOF
