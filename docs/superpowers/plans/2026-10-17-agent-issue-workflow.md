# Agent Issue Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a developer and any supported coding agent turn an agreed task into a complete GitHub issue, then start that issue on a linked branch in an isolated worktree from an explicitly selected base branch.

**Architecture:** `AGENTS.md` is the canonical workflow contract; `CLAUDE.md` imports it and Cursor reads it directly. Agents use GitHub CLI to create approved issues, while a tested Bash helper owns the repeatable assignment, branch naming, linked-branch, and worktree setup steps.

**Tech Stack:** Bash 3.2+, Git, GitHub CLI (`gh`), Markdown, GitHub issue-form YAML

**Spec:** `docs/superpowers/specs/2026-10-17-collaborative-agent-workflow-design.md`

## Global Constraints

- Support Codex, Claude Code, and Cursor from one canonical instruction source.
- Preview complete issue drafts by default; create immediately only when the developer explicitly authorizes it for the current request or establishes a standing instruction.
- Discuss and preserve scope, non-scope, testable acceptance criteria, dependencies, selected base branch, affected areas, verification expectations, and known risks.
- Start exactly one selected issue and require an explicit base branch; creating other issues does not authorize implementing them.
- Use issue-numbered implementation branches and conventional commits in the form `feat (#123): description`.
- Require GitHub CLI authentication and repository permissions; never store credentials in the repository.
- Keep the workflow lightweight and avoid product-stack assumptions.

## Review Focus

- An issue assigned to another developer must stop before assignment or branch creation; Task 1 tests this ownership conflict.
- A closed or malformed issue must stop before any GitHub write; Task 1 tests both cases.
- Dry-run mode may perform GitHub reads but must never assign an issue or create a branch/worktree; Task 1 tests the command log.
- A worktree-path collision must fail without modifying the existing directory; Task 1 tests the collision.
- Tool-specific files must not diverge from `AGENTS.md`; Task 2 verifies that `CLAUDE.md` only imports it and that Cursor-specific duplicated rules are absent.

---

### Task 1: Linked issue branch and worktree helper

**Files:**
- Create: `.gitignore`
- Create: `scripts/start-issue`
- Create: `tests/start-issue-test.sh`

**Interfaces:**
- Consumes: `gh auth status`, `gh api user --jq .login`, `gh issue view`, `gh issue edit`, `gh issue develop`, and the current Git repository.
- Produces: `scripts/start-issue ISSUE --base BRANCH [--dry-run]`; on success, prints `ISSUE_NUMBER`, `BRANCH_NAME`, and absolute `WORKTREE_PATH` lines for the invoking agent.

- [ ] **Step 1: Write the shell test harness and failing interface tests**

Create a dependency-free Bash test harness that puts fake `gh` and `git` executables first on `PATH`, records invocations, and isolates each case in a temporary directory. Add assertions for usage without an issue, missing `--base`, an unknown flag, and missing GitHub CLI authentication.

- [ ] **Step 2: Run the interface tests and verify they fail**

Run: `bash tests/start-issue-test.sh`

Expected: FAIL because `scripts/start-issue` does not exist.

- [ ] **Step 3: Implement argument parsing and prerequisite checks**

Implement Bash 3.2-compatible functions `usage`, `die`, `require_command`, and `main`. Accept one issue number or URL, require `--base BRANCH`, accept optional `--dry-run`, reject extra input, require `git` and `gh`, require a Git worktree, and require successful `gh auth status`.

- [ ] **Step 4: Run the interface tests**

Run: `bash tests/start-issue-test.sh`

Expected: interface and prerequisite cases PASS; lifecycle cases remain absent.

- [ ] **Step 5: Add failing issue-state, ownership, naming, collision, and dry-run tests**

Extend the fake CLI fixtures and assert:

- malformed issue output and `state != OPEN` fail before writes;
- assignees other than the authenticated login fail before writes;
- an unassigned issue triggers `gh issue edit ISSUE --add-assignee @me`;
- an issue already assigned to the authenticated login skips reassignment;
- title `Add Event Search!` for issue `123` becomes branch `123-add-event-search`;
- an existing `.worktrees/123-add-event-search` path fails without deletion;
- `--dry-run` prints intended assignment/develop actions but the fake command log contains no `issue edit` or `issue develop` call.

- [ ] **Step 6: Run the expanded tests and verify they fail**

Run: `bash tests/start-issue-test.sh`

Expected: FAIL because lifecycle behavior is not implemented.

- [ ] **Step 7: Implement issue resolution and safe lifecycle checks**

Implement `slugify` and lifecycle logic in `main`: retrieve the authenticated login; read issue number, title, state, and assignees using `gh issue view --json number,title,state,assignees --jq`; require an open issue; enforce zero or self-only ownership; derive the issue-numbered slug; require `.worktrees/` to be ignored; and refuse an existing target path.

- [ ] **Step 8: Implement dry-run and linked worktree creation**

For an unassigned issue, run `gh issue edit ISSUE --add-assignee @me`. Then run `gh issue develop ISSUE --base BRANCH --name ISSUE-SLUG --checkout --worktree ABSOLUTE_PATH`. In `--dry-run`, print both intended write commands without executing them. On success, print the three output fields defined in Interfaces.

- [ ] **Step 9: Ignore generated worktrees and run the full helper tests**

Add `/.worktrees/` to `.gitignore`, mark both scripts executable, then run: `bash tests/start-issue-test.sh`

Expected: all cases PASS and temporary directories are removed by the test trap.

- [ ] **Step 10: Commit the helper**

```bash
git add .gitignore scripts/start-issue tests/start-issue-test.sh
git commit -m "feat (#5): add linked issue worktree helper"
```

### Task 2: Cross-tool issue workflow and GitHub templates

**Files:**
- Create: `AGENTS.md`
- Create: `CLAUDE.md`
- Create: `CONTRIBUTING.md`
- Create: `.github/ISSUE_TEMPLATE/task.yml`
- Create: `.github/pull_request_template.md`
- Modify: `README.md`
- Test: `tests/workflow-docs-test.sh`

**Interfaces:**
- Consumes: `scripts/start-issue ISSUE --base BRANCH [--dry-run]` from Task 1 and the approved design spec.
- Produces: one canonical agent contract, a Claude import adapter, human instructions, and GitHub forms that collect the same required issue and verification fields.

- [ ] **Step 1: Write failing structural documentation tests**

Create a dependency-free Bash test that asserts all files exist; `CLAUDE.md` contains exactly `@AGENTS.md`; no `.cursor/rules` or `.cursorrules` file exists; `AGENTS.md` documents preview-by-default, explicit immediate creation, explicit base selection, the `scripts/start-issue` command, issue-numbered commits, verification, and preservation of unrelated changes; the issue form contains scope, non-scope, acceptance criteria, dependencies, base branch, affected areas, verification, and risks; and the PR template contains issue linkage, base branch, validation evidence, risk, and overlap checks.

- [ ] **Step 2: Run the documentation tests and verify they fail**

Run: `bash tests/workflow-docs-test.sh`

Expected: FAIL because the workflow files do not exist.

- [ ] **Step 3: Create the canonical agent contract and Claude adapter**

Write concise `AGENTS.md` sections for project state, issue discussion and decomposition, creation authorization, issue kickoff, ownership/concurrency, implementation boundaries, verification, commits, and PR handoff. Use exact commands from Task 1. Create `CLAUDE.md` with only the import line `@AGENTS.md`.

- [ ] **Step 4: Create the human guide and GitHub templates**

Write `CONTRIBUTING.md` as a five-minute quick start with GitHub CLI authentication, issue discussion, preview/immediate modes, explicit base selection, helper usage, and PR completion. Create the task issue form and PR template with the fields asserted by the test; do not add labels, assignees, or project identifiers that may not exist.

- [ ] **Step 5: Update project entry-point documentation**

Keep the pending product description in `README.md`, add links to `CONTRIBUTING.md` and `AGENTS.md`, and state that product-specific setup commands will be documented after the stack is selected.

- [ ] **Step 6: Run structural and YAML checks**

Run: `bash tests/workflow-docs-test.sh`

Expected: all structural cases PASS.

Run: `ruby -e 'require "yaml"; YAML.load_file(".github/ISSUE_TEMPLATE/task.yml"); puts "YAML valid"'`

Expected: `YAML valid` and exit 0.

- [ ] **Step 7: Run full repository verification**

Run: `bash tests/start-issue-test.sh && bash tests/workflow-docs-test.sh && git diff --check`

Expected: both suites PASS and `git diff --check` exits 0 without output.

- [ ] **Step 8: Commit the cross-tool workflow**

```bash
git add AGENTS.md CLAUDE.md CONTRIBUTING.md README.md .github/ISSUE_TEMPLATE/task.yml .github/pull_request_template.md tests/workflow-docs-test.sh
git commit -m "docs (#5): add cross-agent issue workflow"
```

### Task 3: End-to-end dry-run verification

**Files:**
- Modify only if verification exposes a defect: files created in Tasks 1–2

**Interfaces:**
- Consumes: the complete workflow from Tasks 1–2.
- Produces: fresh evidence that the repository contract and helper behave coherently without writing to GitHub.

- [ ] **Step 1: Run every automated check from a clean shell**

Run: `bash tests/start-issue-test.sh && bash tests/workflow-docs-test.sh && ruby -e 'require "yaml"; YAML.load_file(".github/ISSUE_TEMPLATE/task.yml")' && git diff --check`

Expected: all commands exit 0.

- [ ] **Step 2: Exercise the documented helper dry run**

Run: `scripts/start-issue 5 --base 5-allow-agents-to-create-issues-and-manage-them --dry-run`

Expected: authenticated, read-only issue discovery succeeds; output shows the intended assignment if needed, linked branch command, issue-numbered branch, selected base, and worktree path; no issue assignment or branch is created.

- [ ] **Step 3: Compare implementation against the approved spec**

Check each success criterion and non-goal in the spec against the repository files and test evidence. Record any environment limitation—especially missing `gh`—without weakening automated fake-CLI coverage.

- [ ] **Step 4: Commit verification fixes only if needed**

If Step 1–3 require changes, rerun all checks and commit only those fixes with `fix (#5): correct agent issue workflow`. Otherwise, leave the two implementation commits unchanged.
