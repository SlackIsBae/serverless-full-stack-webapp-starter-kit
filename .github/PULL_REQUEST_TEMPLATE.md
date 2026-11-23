<!-- PR title must follow Conventional Commits (feat:, fix:, chore:, docs:, ...). See AGENTS.md before changing code. -->

## What and why

<!-- What changes, and the problem it solves. Link the Slack thread, investigation, or issue if there is one. -->

## Infrastructure impact

<!-- "None", or which AWS resources change or get replaced (from the CDK snapshot diff or `cdk diff`). -->

## Verification

<!-- Commands you ran and what you checked. -->

## Checklist

- [ ] `pnpm -r run check:ci`, `pnpm -r run test:unit`, and `pnpm -r run build` pass locally
- [ ] Respects the production constraints in `AGENTS.md` (single region, origin header, no reserved concurrency, stable names)
- [ ] No secrets, account IDs, or deployed URLs added
- [ ] Safe to deploy: merging deploys to production automatically
