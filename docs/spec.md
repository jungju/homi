# Homi Spec

## Document Role

This file is the stable Codex entrypoint for Homi document navigation. It is not
an authoritative contract. Homi is machine-first, so the actual source of truth
is the versioned YAML and JSON schema set.

## Authoritative Sources

Read these in order before making product, UI, flow, QA, or data changes:

1. `docs/machine/manifest.v1.yaml`
2. `docs/machine/truth-order.v1.yaml`
3. `docs/machine/read-sets.v1.yaml`
4. The task-specific read set listed in `read-sets.v1.yaml`

Primary contract files:

- `docs/machine/product.v1.yaml`
- `docs/machine/ui.v1.yaml`
- `docs/machine/flows.v1.yaml`
- `docs/machine/tests.v1.yaml`
- `docs/machine/fixtures.v1.yaml`
- `docs/machine/ai-review.v1.yaml`
- `schemas/machine/*.schema.json`
- `schemas/domain/*.schema.json`

## Non-Authoritative Sources

- `README.md` is a human overview only.
- `docs/legacy/*` preserves older Markdown contracts for reference only.
- `test-results/*` contains generated artifacts only.

## Product Scope

Homi is a Go-served home display app centered on large, readable household
status UI, schedule reminders, dictation flow control, brain JSON import, and
Ohmesh-backed user-scoped JSON record storage.

## Update Rules

- Contract changes update the relevant `docs/machine/*.v1.yaml` file first.
- Schema changes update the matching `schemas/machine` or `schemas/domain`
  schema.
- Human-facing overview changes may update `README.md`.
- Legacy Markdown should not be treated as a source of truth.
