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

GitHub CLI (`gh`) will provide the common automation interface for all three agent tools. Each contributor must install it and authenticate with an account that can create and assign issues, create branches, and open pull requests in the repository.

## Issue authoring and kickoff

A developer may begin from `main`, a release branch, or another explicitly selected base branch and describe a feature, defect, or other unit of work to an agent. The developer and agent discuss the outcome, scope, acceptance criteria, dependencies, affected areas, and verification expectations before implementation.

The agent then drafts one bounded issue or decomposes the request into a small ordered set of issues. Issue descriptions must preserve the agreed context and include:

- the problem or desired outcome;
- in-scope and out-of-scope behavior;
- testable acceptance criteria;
- relevant dependencies and related issues;
- the selected base branch when it is known;
- anticipated files, components, or shared interfaces;
- verification expectations and any known risks.

Issue creation uses one of two authorization modes:

- **Preview by default:** show the complete proposed issue or issue set and wait for developer approval before creating anything on GitHub.
- **Immediate when explicitly authorized:** if the developer clearly asks the agent to create issues without another preview, create the discussed issues immediately. This authorization applies only to the current request unless the developer explicitly establishes a broader standing instruction.

After creating the issues, the agent reports their numbers and URLs. For the issue being started now, it assigns the developer, creates a GitHub-linked branch from the selected base branch, and checks that branch out in an isolated worktree when supported. The same developer-agent conversation then continues there so the discovery context is retained. Creating additional issues does not authorize starting them.

## Work lifecycle

1. Discuss and create one or more GitHub issues through the issue-authoring workflow above.
2. Select exactly one issue to start, one human owner, and an explicit base branch. Record affected areas so teammates can identify likely overlap.
3. Create a short-lived, GitHub-linked branch from the selected base branch, named with the issue number and a concise slug.
4. Use one agent session for the issue. The agent reads the repository instructions, the issue, and relevant existing code before editing.
5. Keep changes within the issue scope. New work becomes a follow-up issue rather than silent scope expansion.
6. Commit coherent checkpoints using conventional prefixes such as `feat:`, `fix:`, `test:`, `docs:`, and `chore:`.
7. Synchronize with the selected base branch, resolve conflicts on the feature branch, and rerun applicable verification.
8. Open a small pull request that states what changed, how it was verified, known risks, and follow-up work.
9. Obtain a teammate review for shared interfaces, architecture, security-sensitive behavior, or overlapping areas. Merge only after required checks pass.
10. Delete the merged issue branch, return to the appropriate base branch, and begin another issue only when the developer chooses it.
11. Include the issue number in every issue implementation branch and commit message. Place it after the conventional commit prefix, for example `feat (#123): add event search`.

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
- `scripts/start-issue`: shared GitHub CLI entry point for creating or selecting a linked issue branch and worktree from an explicit base branch.
- `.github/ISSUE_TEMPLATE/task.yml`: task ownership, scope, overlap, acceptance, and verification fields.
- `.github/pull_request_template.md`: scope, validation, risks, and coordination checklist.
- `README.md`: point contributors and agents to the workflow without inventing the pending product idea.

## Verification

Because the repository currently contains no application stack, verification for this workflow change is structural:

- confirm the expected files exist;
- check Markdown and YAML for obvious structural errors;
- run `git diff --check`;
- verify that `CLAUDE.md` imports the canonical instructions;
- validate the issue-start script without performing GitHub writes, and check its missing-authentication and invalid-input behavior;
- scan for duplicated or contradictory rules;
- confirm the Git working tree contains only intended changes before committing.

Once the team selects a stack, the first setup change must replace command placeholders in `AGENTS.md` and `CONTRIBUTING.md` with exact install, build, lint, test, and run commands.

## Success criteria

- Codex, Claude Code, and Cursor receive materially identical repository guidance.
- A teammate can understand how to claim, implement, validate, review, and merge work in under five minutes.
- A developer and agent can turn an agreed task into a complete GitHub issue and linked working branch without manually copying context or constructing Git commands.
- Concurrent tasks have visible owners and anticipated areas of change.
- Pull requests contain reproducible verification evidence.
- The workflow adds minimal recurring overhead and can evolve as the project architecture becomes known.

## Non-goals

- Selecting the hackathon product or technology stack.
- Creating a comprehensive project-management system.
- Automating deployments or configuring branch protection.
- Centrally dispatching or remotely launching developers' local agents.
- Adding tool-specific skills, hooks, or duplicated rule sets before a concrete need appears.
