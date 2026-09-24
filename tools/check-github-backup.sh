#!/usr/bin/env bash
set -uo pipefail

MAX_AGE_HOURS=24
FETCH=true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --max-age-hours) MAX_AGE_HOURS="$2"; shift 2 ;;
    --no-fetch) FETCH=false; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 64 ;;
  esac
done

ROOT="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)" || exit 1
NOW="$(date +%s)"
MAX_AGE_SECONDS=$((MAX_AGE_HOURS * 3600))
ATTENTION=()
REPORT=()

if $FETCH; then
  if ! git -C "$ROOT" fetch --quiet origin --prune; then
    ATTENTION+=("Could not refresh origin; remote backup state is unknown.")
  fi
fi

inspect_worktree() {
  local path="$1" branch_ref="$2" branch remote_ref ahead oldest age_hours dirty
  if [[ -z "$branch_ref" ]]; then
    ATTENTION+=("Detached worktree: $path")
    return
  fi
  branch="${branch_ref#refs/heads/}"
  remote_ref="refs/remotes/origin/$branch"
  dirty="$(git -C "$path" status --porcelain --untracked-files=all | grep -v '^?? \.mirror/' || true)"
  if [[ -n "$dirty" ]]; then
    ATTENTION+=("Uncommitted changes: $branch")
  fi
  if ! git -C "$ROOT" show-ref --verify --quiet "$remote_ref"; then
    ATTENTION+=("Unpublished branch: $branch")
    return
  fi
  ahead="$(git -C "$ROOT" rev-list --count "$remote_ref..$branch_ref")"
  if (( ahead > 0 )); then
    oldest="$(git -C "$ROOT" log --reverse --format=%ct "$remote_ref..$branch_ref" | head -n 1)"
    age_hours=$(( (NOW - oldest) / 3600 ))
    if (( NOW - oldest >= MAX_AGE_SECONDS )); then
      ATTENTION+=("$branch is $ahead commit(s) ahead; oldest unpushed commit is ${age_hours}h old.")
    else
      REPORT+=("$branch: $ahead unpushed commit(s), still within ${MAX_AGE_HOURS}h window")
    fi
  else
    REPORT+=("$branch: synchronized")
  fi
}

worktree_path=""
worktree_branch=""
while IFS= read -r line || [[ -n "$line" ]]; do
  case "$line" in
    worktree\ *) worktree_path="${line#worktree }" ;;
    branch\ *) worktree_branch="${line#branch }" ;;
    "")
      [[ -n "$worktree_path" ]] && inspect_worktree "$worktree_path" "$worktree_branch"
      worktree_path=""; worktree_branch=""
      ;;
  esac
done < <(git -C "$ROOT" worktree list --porcelain; echo)

printf 'WhatsApp Focus GitHub backup check — %s\n' "$(date --iso-8601=seconds)"
if (( ${#REPORT[@]} > 0 )); then printf '  OK: %s\n' "${REPORT[@]}"; fi
if (( ${#ATTENTION[@]} > 0 )); then
  printf '  ATTENTION: %s\n' "${ATTENTION[@]}"
  exit 2
fi
printf '  No backup drift detected.\n'
