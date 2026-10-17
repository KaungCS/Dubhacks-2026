# Contributing

This project uses GitHub issues as durable context and short-lived, issue-linked branches as the unit of collaboration.

## One-time setup

1. Install [GitHub CLI](https://cli.github.com/).
2. Run `gh auth login` and choose the GitHub account with write access to this repository.
3. Confirm access with `gh auth status`.

Codex and Cursor read `AGENTS.md`. Claude Code reads `CLAUDE.md`, which imports the same contract.

## Start a task in five minutes

1. Begin from the branch the work should target—usually `main`, but a release or other base branch is valid.
2. Describe the desired outcome to your coding agent. Together, agree on scope, non-scope, acceptance criteria, dependencies, affected areas, verification, risks, and the base branch.
3. Let the agent draft one bounded issue or an ordered set of issues.
4. By default, review the full drafts before the agent creates them. You may explicitly tell the agent to create the discussed issues immediately.
5. Choose exactly one issue to start. From the repository root, run:

   ```bash
   scripts/start-issue ISSUE --base BRANCH
   ```

   Add `--dry-run` to preview assignment, branch, and worktree actions without writing to GitHub.

6. Continue the same agent conversation in the printed `WORKTREE_PATH`.

## Implement and hand off

- Stay within the selected issue. Open follow-up issues instead of silently expanding scope.
- Coordinate before touching shared interfaces or files another teammate is editing.
- Use issue-numbered conventional commits, such as `fix (#123): handle empty search`.
- Run applicable checks and include their observed results in the pull request.
- Open the pull request against the selected base branch and include `Closes #123`.
- Record risks, shared areas, and follow-up work so reviewers do not need the original chat.

Product-specific setup and verification commands will be added here after the team selects the application stack.

