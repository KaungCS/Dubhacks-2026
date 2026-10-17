# Repository Agent Contract

This repository is a four-person hackathon project developed with Codex, Claude Code, and Cursor. Keep coordination lightweight, preserve human control, and optimize for small changes that can merge independently.

## Current project state

The product and application stack are not selected yet. Do not invent architecture, dependencies, or setup commands. When the stack is chosen, update this file and `CONTRIBUTING.md` with the exact install, run, lint, build, and test commands.

## Turning a discussion into issues

Before implementation, inspect the relevant repository state and discuss the desired outcome with the developer. Agree on:

- the problem or outcome;
- in-scope and out-of-scope behavior;
- testable acceptance criteria;
- dependencies and related work;
- the base branch (`main`, a release branch, or another named branch);
- affected files, components, and shared interfaces;
- verification expectations and known risks.

Create one bounded GitHub issue or an ordered set of independently deliverable issues. Put the agreed context in each issue rather than relying on chat history.

Issue creation has two modes:

- Default: show the complete issue draft or issue set and wait for developer approval before writing to GitHub.
- Immediate: create the discussed issues without another preview only when the developer explicitly requests immediate creation. Treat that authorization as limited to the current request unless the developer clearly makes it a standing instruction.

Use `gh issue create --title ... --body-file ...` so multiline descriptions and acceptance criteria are preserved. Report every created issue number and URL. Creating several issues does not authorize starting all of them.

## Starting one issue

The developer selects exactly one issue to implement and confirms its base branch. From the repository root, run:

```bash
scripts/start-issue ISSUE --base BRANCH
```

Use `--dry-run` when the developer wants to inspect the assignment, branch name, and worktree path without GitHub writes. The helper requires authenticated GitHub CLI access, assigns an unowned issue to the current GitHub user, refuses issues owned by someone else, and creates a linked issue branch in `.worktrees/`.

Continue the same developer-agent conversation using the printed `WORKTREE_PATH`. Do not implement other issues merely because they were created during decomposition.

## Ownership and parallel work

- One issue has one human owner at a time.
- One implementation branch addresses one issue or one tightly coupled change.
- Announce anticipated files or subsystems before editing.
- Coordinate before changing a file or shared contract another teammate may be changing.
- Treat API schemas, database migrations, environment variables, dependency versions, and cross-component types as shared contracts.
- Agree on the shared interface first when parallel work must meet at a boundary.

## Implementation boundaries

- Read the issue and relevant existing code before editing.
- Make the smallest change that meets the acceptance criteria.
- Do not silently expand scope; propose a follow-up issue.
- Preserve unrelated and uncommitted changes. Never rewrite another contributor's work merely for style.
- Avoid destructive Git operations and never commit secrets, credentials, or local environment files.
- Stop and ask when ownership, intent, or a potentially destructive action is ambiguous.

## Verification and handoff

- Add or update tests for behavior changes when the selected stack supports them.
- Run the narrowest relevant checks during development and all documented checks before handoff.
- Report commands and observed results; do not claim unobserved success.
- Summarize changed files, validation evidence, limitations, risks, and follow-up work.
- Do not commit, push, deploy, merge, or perform other external writes unless the developer's request authorizes that action.

## Branches, commits, and pull requests

- Issue implementation branches must include the issue number. `scripts/start-issue` creates `<issue>-<slug>`.
- Use conventional commit prefixes and include the issue number immediately after the prefix, for example `feat (#123): add event search`.
- Synchronize with the selected base branch and rerun verification before handoff.
- Keep pull requests small. Include `Closes #123`, the selected base branch, validation evidence, known risks, affected shared areas, and follow-up work.
- Obtain teammate review for shared interfaces, architecture, security-sensitive behavior, and overlapping areas.

