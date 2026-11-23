# AGENTS.md

Taskboard is the team's internal task tracker, running in production in AWS us-east-2. See `README.md` for what it does and how it is built. Read this section before changing anything.

## How changes reach production

- Work on a branch and open a pull request against `main`. Never push to `main`; it is protected and requires passing CI plus a human approval.
- Humans merge and then deploy from a laptop with `cd apps/cdk && pnpm exec cdk deploy --all`. CI has no AWS credentials, on purpose.
- Agents never deploy, destroy, or change AWS resources directly: no `cdk deploy`, `cdk destroy`, `cdk bootstrap`, or mutating AWS CLI/SDK calls. Read-only investigation (CloudWatch logs and metrics, `cdk diff`, `cdk synth`) is fine.
- `main` must always match what is deployed, so every PR should be safe to deploy as soon as it merges.

## Pull request checklist

- One concern per PR, with the smallest diff that solves it. Do not reformat or refactor unrelated code.
- PR title follows Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, ...). CI enforces this.
- Before opening the PR, run from the repo root: `pnpm -r run check:ci`, `pnpm -r run test:unit`, and `pnpm -r run build` (copy `apps/webapp/.env.local.example` to `apps/webapp/.env.local` first). The pre-commit hook runs lint and unit tests; do not bypass it with `--no-verify`.
- If you change CDK code, update the snapshot with `cd apps/cdk && pnpm exec vitest run -u`, review the snapshot diff, and describe the infrastructure change in the PR body (which resources change or get replaced).
- In the PR body, say what you verified and how.

## Production constraints (do not break)

- **Single region.** Everything deploys to us-east-2 in one stack. The AWS account blocks every other region, so do not add a us-east-1 stack, Lambda@Edge, a CLOUDFRONT-scope WAF Web ACL, ACM certificates for CloudFront, or a custom domain.
- **Origin protection.** The webapp's Lambda Function URL is public (`authType: NONE`). CloudFront sends a secret `x-origin-verify` header (`apps/cdk/lib/constructs/cf-lambda-furl-service/service.ts`) and `apps/webapp/src/proxy.ts` returns 403 without it. Keep both sides and the `ORIGIN_VERIFY_HEADER` constants in sync, and keep the proxy matcher covering API routes.
- **No reserved concurrency.** The account's Lambda concurrency limit is 10, and Lambda requires 10 to stay unreserved, so any `reservedConcurrentExecutions` fails the deploy.
- **Stable names.** Do not rename the stack (`ServerlessWebappStarterKitStack`) or construct IDs in `apps/cdk/lib`. Renames replace resources, and the DSQL cluster and Cognito user pool are retained on delete, which orphans production data.
- **Auth stays closed.** Keep Cognito self sign-up disabled; admins create accounts.
- **Public repo.** Never commit secrets, passwords, AWS account IDs, user pool IDs, or deployed URLs.
- **Dependencies.** Add dependencies only when needed. pnpm enforces `minimumReleaseAge` (3 days) in `pnpm-workspace.yaml`; pick a version old enough instead of excluding it.
- **CI and lint config.** Do not edit `.github/workflows/` or relax rules in `oxlintrc.json` unless the task is about CI, and call it out in the PR body.

## Commands

```bash
# install all dependencies
pnpm install

# webapp
cd apps/webapp && pnpm run dev          # starts on port 3010
cd apps/webapp && pnpm run build
cd apps/webapp && pnpm run lint

# cdk
cd apps/cdk && pnpm run build
cd apps/cdk && pnpm run test:unit
cd apps/cdk && pnpm exec cdk diff
cd apps/cdk && pnpm exec cdk deploy --all   # humans only, after merge

# db migration (requires DSQL cluster; never run against production, deploys apply migrations)
pnpm --filter @repo/db run migrate

# lint / test across all workspaces (from root)
pnpm -r run lint
pnpm -r run test:unit

# local development (requires DSQL cluster)
pnpm --filter @repo/db run cluster create   # create dev DSQL cluster (humans only, creates AWS resources)
cd apps/webapp && pnpm run dev
```

## Development guide

### Authentication

All server-side mutations must go through `authActionClient` (defined in `lib/safe-action.ts`). It validates the Cognito session via Amplify server-side auth and injects `ctx.userId`. Never call Drizzle directly from a Server Action without this middleware.

API Routes (`app/api/**/route.ts`) that require authentication must go through `withAuth()` (defined in `lib/api/with-auth.ts`) — the equivalent guardrail for Route Handlers. It resolves the session and returns 401 when unauthenticated; the handler receives the session and its return value is JSON-encoded. Validate inputs with Zod `safeParse`, same as Server Actions. Public routes (LWA readiness at `api/health/`, Cognito auth callbacks at `api/auth/[slug]/`) are the intentional exceptions and do not use `withAuth()`.

`proxy.ts` handles route protection (redirect to `/sign-in` for unauthenticated users). It is the Next.js 16 [proxy file convention](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) — the rename of `middleware.ts`, which was deprecated in Next.js 16. Under Lambda Web Adapter it runs inside the Node.js Lambda runtime (same process as the request handler), so there is no separate Edge worker. Do not create `middleware.ts`; it is superseded by `proxy.ts`.

### Async jobs

The dispatch flow is: Server Action → `runJob()` (Lambda async invoke) → `apps/async-job/src/handler.ts` (discriminated union dispatch) → job handler → `sendEvent()` (AppSync Events) → client `useEventBus` hook.

To add a new job:

1. Add a Zod schema with a `type` literal to the discriminated union in `packages/shared-types/src/job-payload.ts`
2. Implement the handler in `apps/async-job/src/jobs/`
3. Add the case to the switch statement in `apps/async-job/src/handler.ts`

### Database

The project uses Aurora DSQL with Drizzle ORM. Schema is defined in `packages/db/src/schema.ts`.

DSQL constraints:

- No SERIAL/SEQUENCE — use UUID
- No FOREIGN KEY — use Drizzle `relations()` for query builder joins
- JSON: `json`/`jsonb` are supported (stored compressed; 1 MiB compressed-size limit) but **not indexable** — extract fields you filter or sort on into their own columns. Prefer `jsonb`.
- No TRUNCATE — use `DELETE FROM` instead
- CREATE INDEX must use ASYNC keyword
- 1 DDL per transaction
- ALTER TABLE only supports: ADD COLUMN, RENAME COLUMN/TABLE/CONSTRAINT, SET SCHEMA, OWNER TO, and IDENTITY operations. Everything else (DROP COLUMN, ALTER COLUMN TYPE, SET/DROP NOT NULL, SET/DROP DEFAULT, DROP CONSTRAINT) requires table recreation.

- `db.query.*.findMany()` with `exists()`/`sql` subqueries causes alias errors on DSQL (drizzle-team/drizzle-orm#3068). Use `db.select().from()` instead. `findFirst()` is safe.
- Drizzle relational queries can't do `_count` or nested `where` on relations. For list views needing cross-table aggregates or per-row flags, batch-fetch by ids (one query per related table) and merge in JS — never per-row queries (N+1).
- No FK cascade. Delete children explicitly. Default: wrap the deletes in `db.transaction()`. Exception: if a delete can exceed the 3,000-row/transaction limit, batch it in chunks across separate transactions (`DELETE ... WHERE id IN (SELECT id ... LIMIT n)` — DSQL has no `DELETE ... LIMIT`).

### Database migration

See `packages/db/README.md` for full usage. Key rules:

- `pnpm --filter @repo/db run generate` — generates and auto-transforms SQL for DSQL.
- `pnpm --filter @repo/db run migrate` — applies migrations (1 DDL per transaction).
- Do not use `drizzle-kit push` or `drizzle-kit migrate` — they violate DSQL's 1 DDL/transaction constraint.
- When `generate` errors on unfixable patterns (DROP COLUMN, ALTER COLUMN TYPE, etc.): run `git checkout -- migrations/`, then `pnpm --filter @repo/db exec drizzle-kit generate --custom --name=<name>`, and write table recreation SQL or a `.mjs` batch migration manually.
- Data migrations are `.mjs` (`export default async function(client, context)`); the runner does not support `.ts`. The optional `context` injects AWS resources (e.g. an S3 bucket name) into migrations that need them.
- Never hand-create migration files outside the `generate` / `generate --custom` flow — it forks the snapshot chain (duplicate `prevId`) and makes `generate` abort. `check:ci` runs `drizzle-kit check` to catch chain forks and snapshot/`schema.ts` desync.

### Lambda environment

The webapp runs on Lambda behind CloudFront via Lambda Web Adapter (response streaming). `next.config.ts` uses `output: 'standalone'`. Build-time env vars (prefixed `NEXT_PUBLIC_`) are injected via CDK `ContainerImageBuild` build args — they cannot be changed at runtime.

### Container and bundle assets

Both container images are built from the repo root (`directory: join('..', '..')`) with `ignoreMode: IgnoreMode.DOCKER`, so the root `.dockerignore` governs what is staged. Without `IgnoreMode.DOCKER`, CDK applies its own ignore semantics and recursively copies `cdk.out` into the asset staging directory, which fails with `ENAMETOOLONG`.

- The Dockerfiles run `pnpm install` without `--filter`. Under pnpm's strict `node_modules` layout, a filtered install omits transitive dependencies that esbuild needs to resolve while bundling.
- esbuild emits `.mjs`. The bundle is ESM (`--format=esm`) and the packages do not set `"type": "module"`, so a `.js` extension would be loaded as CJS at Lambda runtime and fail.
- `--external:@aws-sdk/*` does not match `@aws/*`. `@aws/aurora-dsql-node-postgres-connector` is bundled, not externalized — do not assume the AWS SDK exclusion covers it.

### Real-time notifications

Server → client push uses AppSync Events. Server-side: `sendEvent(channelName, payload)` with IAM SigV4 signing. Client-side: `useEventBus` hook with Cognito user pool auth. The channel namespace is `event-bus/`.

## Documentation policy

- Do not document what can be derived from code. An agent can read the codebase.
- Enforce verifiable constraints with tests and linters, not prose.
- Code comments explain "why not" only — the non-obvious reason something was done a certain way.
- Before adding a line to this file, ask: "If I remove this line, will an agent make a mistake?" If no, don't add it. If a root cause is fixed, remove the corresponding line.

## Conventions

- PR titles and code comments in English.
- PR titles follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, etc.).
- UI components: use [shadcn/ui](https://ui.shadcn.com/). Do not introduce alternative component libraries.
- Logs: use JSON structured output.
- Dependencies: esbuild and Next.js bundle everything, so only packages with native binaries needed at Lambda runtime belong in `dependencies`. Everything else goes in `devDependencies`.
- Tests: colocate with source (`foo.test.ts` next to `foo.ts`). Use `.integ.test.ts` suffix for tests requiring external resources. Test runner is vitest for `apps/webapp` and `packages/db`; `apps/cdk` also uses vitest, with CDK snapshot/template tests kept under `apps/cdk/test/`.

## Do not

- Do not bypass `authActionClient` for any mutation. No raw Drizzle calls from Server Actions.
- Do not add an authenticated API Route without going through `withAuth()`.
- Do not add `middleware.ts`. It is deprecated in Next.js 16; route protection lives in `proxy.ts` (the renamed file convention), which runs in the Node.js Lambda runtime.
- Do not hardcode AWS region or account IDs in application code. Use CDK context or environment variables.
- Do not add `NEXT_PUBLIC_` env vars to `.env.local` for deployed builds — they must be set as CDK build args in `webapp.ts`.
- Do not use `.references()` in Drizzle schema — DSQL does not support foreign keys. Use `relations()` instead.
- Do not use `serial`, `smallserial`, or `bigserial` column types — DSQL has no sequences. Use `uuid`/`text`. (`json`/`jsonb` are supported.)
