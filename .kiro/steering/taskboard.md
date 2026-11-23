---
inclusion: always
---

# Taskboard

This repository is Taskboard, the team's internal task tracker, running in production in AWS us-east-2.

Before changing anything, read and follow `AGENTS.md` at the repository root: how changes reach production, the pull request checklist, and the production constraints. `README.md` describes the architecture and the deploy process.

#[[file:AGENTS.md]]

Key rules:

- Open pull requests against `main`; never push to `main`.
- Merging to `main` deploys to production automatically. Never deploy or modify AWS resources yourself (`cdk deploy`, `cdk destroy`, mutating AWS CLI calls).
- Keep everything in us-east-2 in the single existing stack.
- This repository is public: never commit secrets, account IDs, or deployed URLs.
