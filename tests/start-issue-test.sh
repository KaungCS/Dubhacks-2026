#!/usr/bin/env bash

set -u

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
SCRIPT="$ROOT/scripts/start-issue"
TEST_TMP=$(mktemp -d "${TMPDIR:-/tmp}/start-issue-test.XXXXXX")
PASS_COUNT=0
FAIL_COUNT=0

cleanup() {
  rm -rf "$TEST_TMP"
}
trap cleanup EXIT

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

pass() {
  printf 'PASS: %s\n' "$1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

assert_failure_contains() {
  name=$1
  expected=$2
  shift 2

  output_file="$TEST_TMP/output"
  : > "$output_file"
  "$@" >"$output_file" 2>&1
  status=$?
  output=$(cat "$output_file")

  if [ "$status" -eq 0 ]; then
    fail "$name (expected a non-zero exit)"
  elif ! printf '%s\n' "$output" | grep -F -- "$expected" >/dev/null; then
    fail "$name (expected output containing: $expected; got: $output)"
  else
    pass "$name"
  fi
}

assert_success_contains() {
  name=$1
  expected=$2
  shift 2

  output_file="$TEST_TMP/output"
  : > "$output_file"
  "$@" >"$output_file" 2>&1
  status=$?
  output=$(cat "$output_file")

  if [ "$status" -ne 0 ]; then
    fail "$name (expected exit 0; got: $output)"
  elif ! printf '%s\n' "$output" | grep -F -- "$expected" >/dev/null; then
    fail "$name (expected output containing: $expected; got: $output)"
  else
    pass "$name"
  fi
}

assert_log_contains() {
  name=$1
  expected=$2
  if grep -F -- "$expected" "$TEST_TMP/commands.log" >/dev/null; then
    pass "$name"
  else
    fail "$name (command log did not contain: $expected)"
  fi
}

assert_log_excludes() {
  name=$1
  unexpected=$2
  if grep -F -- "$unexpected" "$TEST_TMP/commands.log" >/dev/null; then
    fail "$name (command log unexpectedly contained: $unexpected)"
  else
    pass "$name"
  fi
}

make_fakes() {
  fake_bin="$TEST_TMP/bin"
  mkdir -p "$fake_bin"

  cat > "$fake_bin/git" <<'EOF'
#!/usr/bin/env bash
printf 'git %s\n' "$*" >> "$COMMAND_LOG"
case "$1 $2" in
  "rev-parse --is-inside-work-tree") printf 'true\n' ;;
  "rev-parse --show-toplevel") printf '%s\n' "$FAKE_REPO_ROOT" ;;
  "check-ignore -q") exit 0 ;;
  *) exit 0 ;;
esac
EOF

  cat > "$fake_bin/gh" <<'EOF'
#!/usr/bin/env bash
printf 'gh %s\n' "$*" >> "$COMMAND_LOG"
if [ "$1 $2" = "auth status" ]; then
  [ "${FAKE_GH_AUTH:-yes}" = "yes" ]
  exit $?
fi
if [ "$1 $2" = "api user" ]; then
  printf '%s\n' "${FAKE_LOGIN:-octocat}"
  exit 0
fi
if [ "$1 $2" = "issue view" ]; then
  if [ "${FAKE_ISSUE_MALFORMED:-no}" = "yes" ]; then
    printf 'malformed\n'
  else
    printf '%s\n%s\n%s\n%s\n__END__\n' \
      "${FAKE_ISSUE_NUMBER:-123}" \
      "${FAKE_ISSUE_TITLE:-Add Event Search!}" \
      "${FAKE_ISSUE_STATE:-OPEN}" \
      "${FAKE_ISSUE_ASSIGNEES:-}"
  fi
  exit 0
fi
if [ "$1 $2" = "issue develop" ]; then
  while [ "$#" -gt 0 ]; do
    if [ "$1" = "--worktree" ]; then
      mkdir -p "$2"
      break
    fi
    shift
  done
  exit 0
fi
exit 0
EOF

  chmod +x "$fake_bin/git" "$fake_bin/gh"
}

run_script() {
  PATH="$TEST_TMP/bin:/usr/bin:/bin" \
    COMMAND_LOG="$TEST_TMP/commands.log" \
    FAKE_REPO_ROOT="$TEST_TMP/repo" \
    FAKE_GH_AUTH="${FAKE_GH_AUTH:-yes}" \
    FAKE_LOGIN="${FAKE_LOGIN:-octocat}" \
    FAKE_ISSUE_MALFORMED="${FAKE_ISSUE_MALFORMED:-no}" \
    FAKE_ISSUE_NUMBER="${FAKE_ISSUE_NUMBER:-123}" \
    FAKE_ISSUE_TITLE="${FAKE_ISSUE_TITLE:-Add Event Search!}" \
    FAKE_ISSUE_STATE="${FAKE_ISSUE_STATE:-OPEN}" \
    FAKE_ISSUE_ASSIGNEES="${FAKE_ISSUE_ASSIGNEES:-}" \
    "$SCRIPT" "$@"
}

reset_case() {
  rm -rf "$TEST_TMP/repo"
  mkdir -p "$TEST_TMP/repo/.worktrees"
  : > "$TEST_TMP/commands.log"
  FAKE_GH_AUTH=yes
  FAKE_LOGIN=octocat
  FAKE_ISSUE_MALFORMED=no
  FAKE_ISSUE_NUMBER=123
  FAKE_ISSUE_TITLE='Add Event Search!'
  FAKE_ISSUE_STATE=OPEN
  FAKE_ISSUE_ASSIGNEES=
}

make_fakes
reset_case

assert_failure_contains \
  "requires an issue" \
  "Usage:" \
  run_script

assert_failure_contains \
  "requires an explicit base branch" \
  "--base is required" \
  run_script 123

assert_failure_contains \
  "rejects unknown flags" \
  "unknown argument: --wat" \
  run_script 123 --base main --wat

FAKE_GH_AUTH=no
assert_failure_contains \
  "requires GitHub CLI authentication" \
  "GitHub CLI is not authenticated" \
  run_script 123 --base main

reset_case
FAKE_ISSUE_MALFORMED=yes
assert_failure_contains \
  "rejects malformed issue data before writes" \
  "could not read issue details" \
  run_script 123 --base main
assert_log_excludes "malformed issue is not assigned" "gh issue edit"
assert_log_excludes "malformed issue gets no branch" "gh issue develop"

reset_case
FAKE_ISSUE_STATE=CLOSED
assert_failure_contains \
  "rejects a closed issue before writes" \
  "issue #123 is not open" \
  run_script 123 --base main
assert_log_excludes "closed issue is not assigned" "gh issue edit"
assert_log_excludes "closed issue gets no branch" "gh issue develop"

reset_case
FAKE_ISSUE_ASSIGNEES=someone-else
assert_failure_contains \
  "rejects an issue owned by another developer" \
  "already assigned to: someone-else" \
  run_script 123 --base main
assert_log_excludes "owned issue is not reassigned" "gh issue edit"
assert_log_excludes "owned issue gets no branch" "gh issue develop"

reset_case
assert_success_contains \
  "starts an unassigned issue with an issue-numbered branch" \
  "BRANCH_NAME=123-add-event-search" \
  run_script 123 --base release/demo
assert_log_contains "unassigned issue is assigned to the current developer" "gh issue edit 123 --add-assignee @me"
assert_log_contains \
  "linked branch uses the selected base and worktree" \
  "gh issue develop 123 --base release/demo --name 123-add-event-search --checkout --worktree $TEST_TMP/repo/.worktrees/123-add-event-search"

reset_case
FAKE_ISSUE_ASSIGNEES=octocat
assert_success_contains \
  "continues an issue already assigned to the current developer" \
  "ISSUE_NUMBER=123" \
  run_script 123 --base main
assert_log_excludes "self-owned issue is not reassigned" "gh issue edit"

reset_case
mkdir -p "$TEST_TMP/repo/.worktrees/123-add-event-search"
touch "$TEST_TMP/repo/.worktrees/123-add-event-search/keep-me"
assert_failure_contains \
  "refuses an existing worktree path" \
  "worktree path already exists" \
  run_script 123 --base main
if [ -f "$TEST_TMP/repo/.worktrees/123-add-event-search/keep-me" ]; then
  pass "worktree collision preserves existing contents"
else
  fail "worktree collision preserves existing contents"
fi

reset_case
assert_success_contains \
  "dry run reports the intended linked branch" \
  "DRY_RUN: gh issue develop 123 --base main --name 123-add-event-search" \
  run_script 123 --base main --dry-run
assert_log_excludes "dry run does not assign the issue" "gh issue edit"
assert_log_excludes "dry run does not create the branch" "gh issue develop"

printf '\n%d passed, %d failed\n' "$PASS_COUNT" "$FAIL_COUNT"
[ "$FAIL_COUNT" -eq 0 ]
