const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const checker = fs.readFileSync(path.join(root, 'tools/check-github-backup.sh'), 'utf8');
const wrapper = fs.readFileSync(path.join(root, 'tools/check-github-backup.ps1'), 'utf8');
const installer = fs.readFileSync(path.join(root, 'tools/install-github-backup-check.ps1'), 'utf8');
const policy = fs.readFileSync(path.join(root, 'docs/github-backup-policy.md'), 'utf8');

test('daily checker observes backup drift without mutating Git history or remotes', () => {
  assert.match(checker, /git -C "\$ROOT" fetch --quiet origin --prune/);
  assert.match(checker, /worktree list --porcelain/);
  assert.match(checker, /rev-list --count/);
  assert.match(checker, /grep -v '\^\?\? \\.mirror\/'/);
  assert.doesNotMatch(checker, /git(?:\s+-C\s+"[^\n]+")?\s+(push|commit|merge|tag|reset)/);
});

test('Windows wrapper records a local report and only notifies on attention', () => {
  assert.match(wrapper, /MirrorWhatsAppFocusBackup/);
  assert.match(wrapper, /if \(\$exitCode -ne 0 -and -not \$NoToast\)/);
  assert.match(installer, /New-ScheduledTaskTrigger -Daily/);
  assert.match(installer, /LogonType Interactive/);
});

test('standing authorization remains bounded to safe fast-forward backup', () => {
  assert.match(policy, /ordinary push after each accepted change or stable committed checkpoint/);
  assert.match(policy, /does \*\*not\*\* authorize force-push, merge, pull request creation, tags, packages, releases, deployment, distribution/);
  assert.match(policy, /runtime `\.mirror\/` directory is never part of a push/);
});
