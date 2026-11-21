# GitHub Backup Policy

## Purpose

Avoid long gaps between local work and the public GitHub backup without turning backup into uncontrolled publication or release automation.

## Standing push authorization

The Navigator authorizes an ordinary push after each accepted change or stable committed checkpoint when all of these conditions hold:

- relevant automated checks pass;
- the diff contains no unexpected or sensitive files;
- the destination is the current named branch on `origin`;
- the remote branch has not diverged from the local branch;
- the push is a normal fast-forward push.

This authorization includes publishing a named worktree branch for backup and review visibility. Except for the version tags on `main` described below, it does **not** authorize force-push, merge, pull request creation, tags, packages, releases, deployment, distribution, or making another repository public. Stop and ask if tests fail, the remote diverges, credentials change, privacy is uncertain, or the operation would cross one of those boundaries.

The runtime `.mirror/` directory is never part of a push.

## Versioning accepted extension changes

When closing an accepted extension change on stable `main`, bump the version in
`manifest.json` (patch for a fix), record the user-visible change in `CHANGELOG.md`,
and mark the version commit with an annotated `v<version>` Git tag. After the
checks above, push `main` and that tag together to `origin`. The Navigator has
authorized this as the default since `v0.1.1`.

Documentation-only commits and intermediate backups do not require a version
bump. This does not authorize tagging other branches, generating ZIPs, creating
GitHub Releases, or publishing to the Chrome Web Store.

## Daily safety check

Windows Scheduled Task `Mirror WhatsApp Focus - GitHub Backup Check` runs daily at 18:00 local time. It executes:

- `tools/check-github-backup.ps1`
- which delegates Git inspection to WSL through `tools/check-github-backup.sh`.

The checker fetches remote refs and inspects every worktree. It alerts when:

- a named branch has never been published;
- the oldest unpushed commit is at least 24 hours old;
- a worktree has uncommitted changes, excluding `.mirror/`;
- remote state cannot be refreshed;
- a worktree is detached.

It never commits, pushes, merges, deletes, tags, releases, or reads WhatsApp data. The latest report is local at:

```text
%LOCALAPPDATA%\MirrorWhatsAppFocusBackup\last-check.txt
```

Install or change the daily time with:

```powershell
& "E:\renato\mirror\focus-lab\whatsapp-focus-extension\tools\install-github-backup-check.ps1" -DailyAt "18:00"
```

## Manual check

From Windows PowerShell:

```powershell
& "E:\renato\mirror\focus-lab\whatsapp-focus-extension\tools\check-github-backup.ps1" -NoToast
```

From WSL:

```bash
tools/check-github-backup.sh --no-fetch
```
