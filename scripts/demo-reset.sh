#!/usr/bin/env bash
# Reset production to the known-good `demo-baseline` tag.
#
# - If main differs from the baseline: opens a PR that restores the baseline tree on main,
#   merges it as an admin once CI passes, and the Deploy workflow redeploys automatically.
# - If main already matches the baseline: re-runs the Deploy workflow, which undoes any
#   out-of-band changes (for example a live mitigation applied directly to AWS).
#
# Requires: gh signed in as a repo admin. Does not touch your working tree (uses a temp worktree).
# Usage: scripts/demo-reset.sh [--yes]
set -euo pipefail

REPO="SlackIsBae/taskboard-app"
TAG="demo-baseline"

cd "$(git rev-parse --show-toplevel)"
git fetch -q origin main "refs/tags/${TAG}:refs/tags/${TAG}" --force

if git diff --quiet "${TAG}" origin/main; then
  echo "main already matches ${TAG}. Redeploying main to undo any drift in AWS."
  gh workflow run deploy.yml --repo "${REPO}" --ref main
  echo "Deploy started: https://github.com/${REPO}/actions/workflows/deploy.yml"
  exit 0
fi

echo "main differs from ${TAG}:"
git diff --stat "${TAG}" origin/main | tail -n 20
if [[ "${1:-}" != "--yes" ]]; then
  read -r -p "Restore main to ${TAG} and redeploy? [y/N] " answer
  [[ "${answer}" == "y" || "${answer}" == "Y" ]] || { echo "Aborted."; exit 1; }
fi

branch="demo-reset-$(date +%Y%m%d-%H%M%S)"
worktree="$(mktemp -d)"
trap 'git worktree remove --force "${worktree}" >/dev/null 2>&1 || true' EXIT

git worktree add -q -b "${branch}" "${worktree}" origin/main
(
  cd "${worktree}"
  # Replace the whole tree with the baseline (also removes files added since the baseline).
  git rm -rq --ignore-unmatch .
  git checkout "${TAG}" -- .
  # --no-verify: the temp worktree has no node_modules, and CI checks this PR before it merges.
  git commit -q --no-verify -m "revert: reset to ${TAG}"
  git push -q -u origin "${branch}"
)

pr_url="$(gh pr create --repo "${REPO}" --base main --head "${branch}" \
  --title "revert: reset to ${TAG}" \
  --body "Restores main to the \`${TAG}\` tag so the next demo starts from a known-good state. Created by \`scripts/demo-reset.sh\`.")"
echo "Opened ${pr_url}. Waiting for CI..."
sleep 10
gh pr checks "${pr_url}" --watch --interval 15
gh pr merge "${pr_url}" --squash --admin --delete-branch
echo "Merged. The Deploy workflow redeploys the baseline: https://github.com/${REPO}/actions/workflows/deploy.yml"
