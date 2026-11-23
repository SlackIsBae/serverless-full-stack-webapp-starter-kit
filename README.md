# Taskboard

Taskboard is our team's shared task tracker. Each teammate signs in, keeps a personal list of tasks, marks them done, and can translate a task into another language. Updates show up in the browser in real time.

It runs as a fully serverless app in a single AWS region (us-east-2). AWS DevOps Agent monitors it: when something breaks, the agent opens an investigation and posts it to our Slack channel, and we work through it together in a Slack code channel.

## Using Taskboard

- **URL:** the `FrontendDomainName` output of the `ServerlessWebappStarterKitStack` CloudFormation stack. Ask a teammate in Slack if you don't have it.
- **Accounts:** self sign-up is off. An admin creates your account (see [Add a teammate](#add-a-teammate)), and you sign in with your email and password.
- **Features:** create, edit, complete, and delete tasks. **Translate** runs an async job and refreshes the page when it finishes.

## How it works

```
Browser ──► CloudFront ──► Lambda Function URL ──► Next.js webapp (Lambda, container image)
              │  adds secret                          │  ├─ Aurora DSQL (tasks, users)
              │  x-origin-verify header               │  ├─ Cognito (sign-in)
              ▼                                       │  └─ async invoke ──► async-job Lambda
         S3 access logs                               │                        ├─ Amazon Translate / Comprehend
                                                      │                        └─ AppSync Events ──► browser (real-time)
                                                      └─ EventBridge Scheduler (monthly job, currently a no-op example)
```

| Part                 | Where                                                       | Notes                                                                                                                                                                                      |
| -------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Webapp               | `apps/webapp`                                               | Next.js App Router on Lambda via Lambda Web Adapter (response streaming). `src/proxy.ts` rejects requests that don't come through CloudFront and redirects signed-out users to `/sign-in`. |
| Async jobs           | `apps/async-job`                                            | One Lambda that dispatches on job `type` (`packages/shared-types/src/job-payload.ts`).                                                                                                     |
| Database             | `packages/db`                                               | Aurora DSQL with Drizzle ORM. Schema in `src/schema.ts`; migrations in `migrations/`.                                                                                                      |
| Migrations at deploy | `apps/db-migrator`, `apps/cdk/lib/constructs/dsql-migrator` | A CDK Trigger runs pending migrations on every deploy.                                                                                                                                     |
| Infrastructure       | `apps/cdk`                                                  | One CDK stack, `ServerlessWebappStarterKitStack`, in us-east-2.                                                                                                                            |

Everything deploys to **one region on purpose**. The AWS account only allows us-east-2, so there is no us-east-1 stack, Lambda@Edge, WAF, or custom domain. CloudFront reaches the webapp's public Function URL with a secret `x-origin-verify` header (derived from the stack ID), and the webapp returns 403 without it.

## Development

Prerequisites: Node.js 22 or later, pnpm 10.34 or later (`npm i -g pnpm@10.34.4`), and the AWS CLI.

```sh
pnpm install
pnpm -r run check:ci     # lint + format check (same as CI)
pnpm -r run test:unit    # unit tests (same as CI)
pnpm -r run build        # build all workspaces (CI copies apps/webapp/.env.local.example to .env.local first)
```

See [`AGENTS.md`](AGENTS.md) for coding rules (auth, database, async jobs) and [`packages/db/README.md`](packages/db/README.md) for schema changes and migrations.

## Changes and deploys

Merging to `main` deploys to production automatically.

1. Open a pull request against `main` (or ask Kiro in Slack to open one). The PR title must follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, ...).
2. CI (`Build-and-Test`, PR title `lint`) must pass. App-code changes can then be merged right away. Changes to infrastructure, CI, dependencies, Dockerfiles, migrations, or agent instructions also need approval from a code owner (`.github/CODEOWNERS`).
3. After the merge, the `Deploy` workflow runs `cdk deploy` (about 5 minutes). Watch it under **Actions > Deploy**. If the deploy fails, CloudFormation rolls back and production keeps running the previous version.

The workflow authenticates to AWS with GitHub OIDC. The IAM role it assumes (`infra/github-deploy-role.yaml`) trusts only jobs in this repo's `production` environment, which only `main` can use, and can only assume the CDK deploy roles. The role template is deployed by hand, so the workflow cannot change its own permissions.

### Reset to the demo baseline

The `demo-baseline` tag marks a known-good version. To put production back to it, for example after a demo session:

```sh
scripts/demo-reset.sh
```

The script opens and merges a PR that restores `main` to the tag, and the merge redeploys it. If `main` already matches the tag, it just redeploys to undo any manual changes made in AWS. It needs `gh` signed in as a repo admin.

### Deploying by hand

Needed only if the workflow is unavailable. Use AWS credentials for the Taskboard account with us-east-2 as the region:

```sh
git checkout main && git pull
cd apps/cdk
pnpm exec cdk diff
pnpm exec cdk deploy --all
```

The first deploy takes about 15 minutes. Container images are built in CodeBuild, so Docker is not needed locally, and database migrations run automatically.

## Operations

- **Monitoring:** AWS DevOps Agent watches the stack and reads this repo to connect incidents to code changes.
- **Logs:** CloudWatch Logs for the webapp and async-job Lambdas (one-week retention); CloudFront access logs in the stack's S3 bucket.
- **Limits:** the account's Lambda concurrency limit is low, so no function reserves concurrency. Don't add `reservedConcurrentExecutions` until the limit is raised.
- **Cost:** a few dollars a month at team usage. The account has a monthly budget with spend limits.

### Add a teammate

```sh
POOL_ID=<AuthUserPoolId stack output>
EMAIL=teammate@example.com
aws cognito-idp admin-create-user --user-pool-id "$POOL_ID" --username "$EMAIL" \
  --user-attributes Name=email,Value="$EMAIL" Name=email_verified,Value=true --message-action SUPPRESS
aws cognito-idp admin-set-user-password --user-pool-id "$POOL_ID" --username "$EMAIL" --password '<password>' --permanent
```

### Tear down

```sh
cd apps/cdk && pnpm exec cdk destroy --force
```

The DSQL cluster and Cognito user pool are retained on delete; remove them manually if you no longer need them.

## Origin

Taskboard started from the [Serverless Full Stack WebApp Starter Kit](https://github.com/aws-samples/serverless-full-stack-webapp-starter-kit) (MIT-0). The stack name still reflects that; renaming it would replace every resource.
