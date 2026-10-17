# GitHub Issue Authoring

This repository is developed with Codex, Claude Code, and Cursor. When a developer describes proposed work in a CLI conversation, help turn that discussion into durable GitHub issues that another agent can implement without access to the original chat.

## Discuss before creating

Inspect the relevant repository files and Git history without changing product code. Discuss the request with the developer until these points are concrete:

- the problem or desired outcome;
- relevant repository findings and existing behavior;
- in-scope and out-of-scope behavior;
- testable acceptance criteria;
- dependencies or related issues;
- the intended base branch when known;
- affected files, components, or shared interfaces;
- verification expectations;
- risks and assumptions.

Do not invent requirements to fill gaps. Ask one focused question at a time when an answer would materially change the issue.

## Decide issue boundaries

Prefer one bounded, independently deliverable issue. Split the request only when parts can be implemented and reviewed independently or have a real dependency order. Explain the split and identify blocking relationships in the issue descriptions.

Do not begin implementation while authoring issues unless the developer separately asks you to start one.

## Issue creation authorization

Use preview-and-approve by default:

1. Show the complete proposed title and body for every issue.
2. Wait for the developer to approve or revise them.
3. Create only the approved issues.

Create immediately without another preview only when the developer explicitly requests immediate creation. Treat that permission as applying only to the current request unless the developer clearly establishes a standing instruction.

## Required issue description

Use this structure so a new developer or agent can resume from the issue alone:

```markdown
## Problem / outcome

## Context and findings

## In scope

## Out of scope

## Acceptance criteria
- [ ] Observable, testable result

## Dependencies

## Base branch

## Affected areas

## Verification

## Risks and assumptions
```

Acceptance criteria describe observable completion, not implementation activity. Use literal expected behavior where known. Mark genuine unknowns as assumptions or questions rather than hiding them.

## Create the issue

Use GitHub CLI with a body file so multiline Markdown is preserved:

```bash
gh issue create --title "TITLE" --body-file PATH
```

Before creating anything, confirm `gh auth status` succeeds and the current repository is the intended target. Add labels, assignees, milestones, projects, or parent relationships only when the developer requests them or the repository already defines an applicable convention.

If GitHub CLI is missing, authentication fails, or repository access is insufficient, stop before external writes and tell the developer the exact setup command or permission needed.

After creation, report each issue number and URL, its dependency order, and any unresolved question. Issue creation alone does not authorize branch creation, implementation, commits, pushes, or pull requests.
