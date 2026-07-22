# Update and Repair Cycle

The repository uses a controlled maintenance cycle instead of an automatic dependency updater. The routine reports drift by default, keeps repair separate from deliberate updates, and runs the same verification gates before a maintenance result is considered usable.

## Commands

Run these commands from the repository root under Node 24 LTS:

```powershell
npm run maintenance:check
npm run maintenance:repair
npm run maintenance:update
```

`maintenance:check` is read-only. It reports the Node/npm runtime, dirty worktree state, npm packages outside their current ranges, production audit findings, and outdated packages in the available Python environment. It does not fail only because a package is outdated.

`maintenance:repair` reconciles `package-lock.json`, reinstalls Node dependencies from the lockfile, reinstalls the declared API and processor packages in the selected Python environment, and runs the verification gates. It does not intentionally change package version ranges.

`maintenance:update` is the explicit update step. It updates npm dependencies within the ranges already declared in `package.json`, leaves the manifests unchanged, reinstalls from the resulting lockfile, and runs the verification gates. Review the resulting lockfile and changelog before committing it.

Use `--strict` when a read-only report should fail on drift or audit findings:

```powershell
npm run maintenance:check -- --strict
```

Use `--live` only when the API and site are already running on the configured audit ports:

```powershell
npm run maintenance:repair -- --live
```

## Safety Rules

- Do not run update mode with unrelated worktree changes unless the lockfile diff can be isolated and reviewed.
- The routine requires Node 24 or newer for repair and update modes. The repository `.nvmrc`, Docker images, and CI workflows define that baseline.
- Node installation uses `npm ci` with the narrow npm lifecycle approval already recorded in `package.json`. The routine does not broaden that approval or allow arbitrary dependency scripts.
- The routine never runs `npm audit fix`, changes declared version ranges, or updates Python requirements automatically.
- If an update changes a manifest, lockfile, environment, or test result, add a concise dated entry to `CHANGELOG.md` and record the verification result in the related audit entry.
- A failed verification leaves the worktree available for inspection. Do not mark the maintenance cycle complete or push the resulting dependency changes until the failure is understood.

## Weekly Audit Integration

The scheduled weekly audit runs `maintenance:check` after the clean npm install. This keeps dependency drift visible without allowing a newly published package version alone to make the audit fail. Mutating repair and update modes remain deliberate local or reviewed CI actions.

## Expected Verification Gates

Repair and update modes run:

- `npm audit --omit=dev`
- maintenance command smoke test
- static site tests
- reader and Phase 3 route tests
- web lint
- the Next production build
- Python tests when an interpreter is available
- optional live reachability checks when `--live` is supplied
- `git diff --check`
