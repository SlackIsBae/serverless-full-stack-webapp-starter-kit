---
inclusion: always
---

# Taskboard

This repository is Taskboard, the team's internal task tracker, running in production in AWS us-east-2.

Before changing anything, read and follow `AGENTS.md` at the repository root: how changes reach production, the pull request checklist, and the production constraints. `README.md` describes the architecture and the deploy process.

#[[file:AGENTS.md]]

Key rules:

- Open pull requests against `main`; never push to `main`.
- Never deploy or modify AWS resources (`cdk deploy`, `cdk destroy`, mutating AWS CLI calls). Humans deploy after merging.
- Keep everything in us-east-2 in the single existing stack.
- This repository is public: never commit secrets, account IDs, or deployed URLs.
