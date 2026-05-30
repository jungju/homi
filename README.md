# Homi

Homi is a static Ohmesh-backed home face app.

## Scope

- `/` is the public Homi introduction page.
- `/face` shows the always-on face page after Ohmesh login.
- Homi announces schedule reminders with voice.
- Homi includes a simple dictation runner.
- Data is stored in Ohmesh records with browser `credentials: "include"`.

## Run

```bash
pnpm install
pnpm dev
```

Then open:

```text
http://localhost:5173/
```

## Image Assets

Face layers live in:

```text
public/assets/homi-face/
```

To regenerate them with OpenAI, set `OPENAI_API_KEY` in `.env`, then run:

```bash
pnpm run generate:face-assets
```

## Scripts

```bash
pnpm run check
pnpm run build
```
