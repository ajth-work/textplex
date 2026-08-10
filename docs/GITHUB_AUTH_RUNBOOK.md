# GitHub authentication runbook

TextPlex uses two separate GitHub access paths. Keep both healthy:

1. Local PowerShell `gh` authentication for repository, issue, pull request, Actions, and project-board work.
2. The GitHub Actions `GITHUB_TOKEN`, which is a short-lived GitHub App installation token created for each workflow job.

The connected GitHub app in Codex is a separate app connection. A repository file cannot refresh that connection. If Codex reports that `TextPlex/textplex` is missing or inaccessible, reconnect the GitHub app and grant it access to the repository and the TextPlex Feature Board project.

## First-time or repair authentication

Run this in PowerShell from the repository root:

```powershell
gh auth login --hostname github.com --web --git-protocol https --scopes repo,read:org,project,workflow,gist
```

Do not paste tokens into this repository, `.env` files, workflow files, or chat. The browser flow stores the credential through GitHub CLI's configured credential storage.

## Run the local check

```powershell
powershell.exe -NoProfile -File .\scripts\Test-GitHubAuth.ps1
```

The check validates the active account, `TextPlex/textplex`, issues, pull requests, Actions runs, and TextPlex Feature Board project #2. It never prints the token.

## Register the weekly Windows check

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Register-GitHubAuthCheck.ps1
```

The task runs every Sunday at 9:00 AM local time when the current Windows user is logged in. It appends results to `artifacts\github-auth\weekly.log`; that generated folder is intentionally not committed.

To run it immediately:

```powershell
Start-ScheduledTask -TaskName "TextPlex GitHub Auth Check"
```

To inspect the task:

```powershell
Get-ScheduledTask -TaskName "TextPlex GitHub Auth Check" | Get-ScheduledTaskInfo
```

## Weekly Actions check

`.github/workflows/github-auth-check.yml` runs every Sunday and can also be started with **Actions → GitHub auth health → Run workflow**. It passes the workflow's repository-scoped `GITHUB_TOKEN` to `gh` as `GH_TOKEN` and checks the same core repository surfaces. No long-lived secret is required.

If this workflow fails, inspect the workflow permissions, repository Actions settings, and the repository's installed GitHub App access. If the local check fails, repair the local CLI login with `gh auth login` and run the local check again.
