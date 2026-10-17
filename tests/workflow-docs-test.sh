#!/usr/bin/env bash

set -u

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
PASS_COUNT=0
FAIL_COUNT=0

pass() {
  printf 'PASS: %s\n' "$1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

assert_file() {
  relative_path=$1
  if [ -f "$ROOT/$relative_path" ]; then
    pass "$relative_path exists"
  else
    fail "$relative_path exists"
  fi
}

for relative_path in \
  AGENTS.md \
  CLAUDE.md \
  CONTRIBUTING.md \
  README.md \
  .github/ISSUE_TEMPLATE/task.yml \
  .github/pull_request_template.md
do
  assert_file "$relative_path"
done

if [ -f "$ROOT/CLAUDE.md" ] && [ "$(cat "$ROOT/CLAUDE.md")" = "@AGENTS.md" ]; then
  pass "Claude imports the canonical agent contract"
else
  fail "Claude imports the canonical agent contract"
fi

if [ ! -e "$ROOT/.cursorrules" ] && [ ! -d "$ROOT/.cursor/rules" ]; then
  pass "Cursor has no duplicated repository rules"
else
  fail "Cursor has no duplicated repository rules"
fi

if [ -f "$ROOT/.github/ISSUE_TEMPLATE/task.yml" ]; then
  ruby - "$ROOT/.github/ISSUE_TEMPLATE/task.yml" <<'RUBY'
require "yaml"

form = YAML.load_file(ARGV.fetch(0))
raise "missing name" unless form["name"].is_a?(String) && !form["name"].empty?
raise "missing description" unless form["description"].is_a?(String) && !form["description"].empty?
raise "missing body" unless form["body"].is_a?(Array)

fields = form["body"].map { |item| item["id"] }.compact
required = %w[outcome scope non_scope acceptance_criteria base_branch affected_areas verification]
missing = required - fields
raise "missing fields: #{missing.join(", ")}" unless missing.empty?

form["body"].each do |item|
  next unless required.include?(item["id"])
  raise "#{item["id"]} must be required" unless item.dig("validations", "required") == true
end

optional = %w[dependencies risks]
missing_optional = optional - fields
raise "missing optional fields: #{missing_optional.join(", ")}" unless missing_optional.empty?
RUBY
  if [ "$?" -eq 0 ]; then
    pass "GitHub issue form exposes the workflow fields"
  else
    fail "GitHub issue form exposes the workflow fields"
  fi
else
  fail "GitHub issue form exposes the workflow fields"
fi

printf '\n%d passed, %d failed\n' "$PASS_COUNT" "$FAIL_COUNT"
[ "$FAIL_COUNT" -eq 0 ]
