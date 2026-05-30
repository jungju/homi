# Homi

Homi is a Go-served home display app for large household status UI, schedule
reminders, dictation flow control, and brain JSON import.

Persistence is handled by [ohmesh](https://ohmesh.jjgo.io): the browser calls
the Ohmesh Records API directly with `credentials: "include"`. Homi defaults to
the Ohmesh app slug `homi`.

## Run

```bash
go run ./cmd/homi
```

Then open:

```text
http://localhost:8080
```

The client immediately checks:

```text
https://ohmesh.jjgo.io/auth/me?app=homi&optional=1
```

If there is no Ohmesh session, it redirects to the Ohmesh login URL with the
current Homi URL as `redirect_url`.

## Configuration

```text
HOMI_ADDR=:8080
HOMI_OHMESH_BASE_URL=https://ohmesh.jjgo.io
HOMI_OHMESH_APP_SLUG=homi
HOMI_LOGIN_ON_STARTUP=true
OPENAI_API_KEY=
```

The Homi origin must be registered in Ohmesh for the `homi` app so CORS and
redirect validation succeed. Because Homi stores one Ohmesh record per dataset,
raise the app record limit above the Ohmesh default when more than a few
datasets are expected.

## Data Shape

- Dataset record type: `homi.dataset.v1`
- UI/settings record type: `homi.ui.v1`
- Bundle schema: `schemas/domain/homi-bundle.v1.schema.json`
- Sample bundle: `public/samples/homi.sample.homi.json`

Import still uses preview-before-confirm. Confirming an import replaces existing
dataset records for the current Ohmesh app user.

## Scripts

```bash
pnpm run generate:face-assets
pnpm run check
pnpm run validate:machine-docs
pnpm run validate:domain-schemas
pnpm run qa:contract
```

`pnpm run generate:face-assets` reads `OPENAI_API_KEY` from `.env` and writes
generated face layer images to `internal/server/static/assets/homi-face/`.

`README.md` is a human entrypoint only. Authoritative contracts live in
`docs/machine/*.v1.yaml`, `schemas/machine/*.schema.json`, and
`schemas/domain/*.schema.json`.
