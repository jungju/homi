# AGENTS.md for homi

## Bootstrap
- Authoritative contracts are machine-readable files only:
  - `docs/machine/*.v1.yaml`
  - `schemas/machine/*.schema.json`
  - `schemas/domain/*.schema.json`
- `README.md` is human entrypoint only and is not a source of truth.
- `docs/spec.md` is a Codex navigation entrypoint only and is not a source of truth.
- `docs/legacy/*` and `test-results/*` are non-authoritative.

## Shared Agent Operations

After finishing any development change:

1. Run the relevant validation commands below.
2. Stage only the intended files.
3. Commit the completed change with `scripts/agent-commit.sh`.

Do not push or deploy unless the user explicitly asks for it.

Homi is a Go webserver. Do not push or deploy unless the user explicitly asks
for it.

Use the same Conventional Commits shape across Jungju service repos:

```text
<type>(<scope>): <summary>
```

Prefer the helper so the format stays consistent:

```sh
TYPE=fix SUMMARY="preserve linked import state" scripts/agent-commit.sh
TYPE=docs SUMMARY="update machine contract notes" scripts/agent-commit.sh
```

The default scope is `homi`. Allowed types are `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `build`, `deploy`, and `content`.

## First Read
1. `docs/spec.md` for navigation only
2. `docs/machine/manifest.v1.yaml`
3. `docs/machine/truth-order.v1.yaml`
4. `docs/machine/read-sets.v1.yaml`
5. Task-specific set from `read-sets.v1.yaml`

## Validation Commands
- `go test ./...`
- `npm run validate:machine-docs`
- `npm run validate:domain-schemas`
- `npm run qa:contract`
