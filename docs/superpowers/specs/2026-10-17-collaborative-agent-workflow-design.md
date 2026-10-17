# Collaborative Agent Workflow Design

## Purpose

Give four hackathon teammates—and their mix of Codex, Claude Code, and Cursor agents—a fast, shared development workflow that prevents duplicate work, conflicting edits, unverified changes, and instruction drift.

The workflow must remain lightweight enough for a hackathon. It should coordinate work without requiring a custom agent framework or maintaining three copies of the same instructions.

## Design principles

- Keep one canonical set of repository instructions.
- Use task ownership, branches, and pull requests as the concurrency boundary.
- Optimize for small, independently mergeable changes.
- Require evidence for verification without inventing commands before the technology stack is selected.
- Keep product decisions separate from durable collaboration rules.
- Add process only when it prevents a demonstrated coordination problem.

## Repository instruction architecture

`AGENTS.md` will be the canonical instruction file. Codex and Cursor can consume it directly. A minimal `CLAUDE.md` will import `AGENTS.md`, allowing Claude Code to receive the same instructions without duplicating them.

`CONTRIBUTING.md` will provide the human-facing quick start. GitHub issue and pull-request templates will turn the workflow into short, repeatable checklists at the points where work is claimed and integrated.

No custom skill or large planning harness will be added initially. Those mechanisms are useful only after the team discovers a recurring, project-specific workflow that cannot be expressed concisely in repository instructions.

## Work lifecycle

1. Create or claim one GitHub issue with a bounded outcome and acceptance criteria.
2. Assign one human owner. Record affected areas so teammates can identify likely overlap.
3. Create a short-lived branch from current `main`, named with the issue number and a concise slug.
4. Use one agent session for the issue. The agent reads the repository instructions, the issue, and relevant existing code before editing.
5. Keep changes within the issue scope. New work becomes a follow-up issue rather than silent scope expansion.
6. Commit coherent checkpoints using conventional prefixes such as `feat:`, `fix:`, `test:`, `docs:`, and `chore:`.
7. Synchronize with `main`, resolve conflicts on the feature branch, and rerun applicable verification.
8. Open a small pull request that states what changed, how it was verified, known risks, and follow-up work.
9. Obtain a teammate review for shared interfaces, architecture, security-sensitive behavior, or overlapping areas. Merge only after required checks pass.
10. Delete the merged branch and claim the next issue.

## Concurrency and ownership rules

- Each issue has exactly one human owner at a time.
- Each branch addresses one issue or one tightly coupled change.
- Before implementation, the owner announces the files or subsystem they expect to touch.
- Teammates must coordinate before editing the same file or shared interface concurrently.
- Agents must preserve unrelated local changes and must not rewrite another contributor's work merely for style.
- Shared contracts—API schemas, database migrations, environment variables, dependency versions, and cross-component types—require explicit coordination before editing.
- When urgent parallel work must touch the same boundary, agree on the interface first and split implementation behind it.

## Agent behavior contract

Agents will:

- inspect relevant repository state before proposing or making changes;
- state assumptions when requirements are incomplete and avoid inventing product scope;
- prefer the smallest change that satisfies the issue;
- preserve unrelated changes and stop when ownership or intent is ambiguous;
- avoid destructive Git operations and never expose secrets;
- run the narrowest relevant checks during development and the full documented verification before handoff;
- report actual command output rather than claiming unobserved success;
- summarize changed files, verification, limitations, and follow-ups at handoff;
- avoid commits, pushes, deployments, or external writes unless the task or user explicitly authorizes them.

## Files to add or update

- `AGENTS.md`: canonical cross-agent repository contract and project command placeholders.
- `CLAUDE.md`: minimal import of `AGENTS.md` plus no duplicated policy.
- `CONTRIBUTING.md`: concise human workflow and branch/commit conventions.
- `.github/ISSUE_TEMPLATE/task.yml`: task ownership, scope, overlap, acceptance, and verification fields.
- `.github/pull_request_template.md`: scope, validation, risks, and coordination checklist.
- `README.md`: point contributors and agents to the workflow without inventing the pending product idea.

## Verification

Because the repository currently contains no application stack, verification for this workflow change is structural:

- confirm the expected files exist;
- check Markdown and YAML for obvious structural errors;
- run `git diff --check`;
- verify that `CLAUDE.md` imports the canonical instructions;
- scan for duplicated or contradictory rules;
- confirm the Git working tree contains only intended changes before committing.

Once the team selects a stack, the first setup change must replace command placeholders in `AGENTS.md` and `CONTRIBUTING.md` with exact install, build, lint, test, and run commands.

## Success criteria

- Codex, Claude Code, and Cursor receive materially identical repository guidance.
- A teammate can understand how to claim, implement, validate, review, and merge work in under five minutes.
- Concurrent tasks have visible owners and anticipated areas of change.
- Pull requests contain reproducible verification evidence.
- The workflow adds minimal recurring overhead and can evolve as the project architecture becomes known.

## Non-goals

- Selecting the hackathon product or technology stack.
- Creating a comprehensive project-management system.
- Automating deployments or configuring branch protection.
- Adding tool-specific skills, hooks, or duplicated rule sets before a concrete need appears.
