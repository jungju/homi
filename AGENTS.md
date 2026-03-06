# AGENTS.md for homi

## Bootstrap
- Authoritative contracts are machine-readable files only:
  - `docs/machine/*.v1.yaml`
  - `schemas/machine/*.schema.json`
  - `schemas/domain/*.schema.json`
- `README.md` is human entrypoint only and is not a source of truth.
- `docs/legacy/*` and `test-results/*` are non-authoritative.

## First Read
1. `docs/machine/manifest.v1.yaml`
2. `docs/machine/truth-order.v1.yaml`
3. `docs/machine/read-sets.v1.yaml`
4. Task-specific set from `read-sets.v1.yaml`

## Validation Commands
- `npm run validate:machine-docs`
- `npm run validate:domain-schemas`
- `npm run qa:contract`
