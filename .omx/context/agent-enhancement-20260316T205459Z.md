# Agent Enhancement Task Generation Context

## Task Statement
Run 5 rounds of Codex CLI worker ideation to propose functionality-enhancement tasks for the Homi service, then run a Codex CLI supervisor that understands the service and likely customer needs to deduplicate, remove low-value tasks, and write a final curated task list to a new file.

## Desired Outcome
- Five round artifacts with worker-proposed enhancement tasks.
- One supervisor-curated final task list file.
- Final task list should be customer-aware, service-aware, and free of obvious duplicates or low-value work.

## Known Facts / Evidence
- Homi is a static web app.
- Core surfaces are home face screen (`/`), engine overlays (`/engines/{engineId}`), and brain settings (`/brain`).
- Current core product capabilities include schedule reminders, dictation mode, import/export via brain settings, quiet mode, hourly chime, and theme/debug controls.
- The UI is optimized for large, readable tablet-friendly text and at-a-distance use.
- Storage is local-first via `localStorage` key `homi.store.v1`.
- Authoritative source order is machine docs under `docs/machine/*` and domain schemas.

## Constraints
- Use Codex CLI workers for the agent executions.
- Keep worker write targets disjoint for round artifacts.
- Do not treat README or generated artifacts as source of truth.
- Final output should be a new file that the user can review directly.

## Unknowns / Open Questions
- Exact customer persona details are not explicitly documented; infer conservatively from the existing product contract and tablet/home-use UX.
- Whether future priorities favor delight, retention, reliability, or caregiver workflows most strongly; supervisor should balance these.

## Likely Touchpoints
- `docs/machine/product.v1.yaml`
- `docs/machine/ui.v1.yaml`
- `docs/machine/flows.v1.yaml`
- `docs/machine/tests.v1.yaml`
- `src/App.svelte`
- `src/lib/components/*`
- `src/lib/state/*`
- `src/lib/homi.ts`
