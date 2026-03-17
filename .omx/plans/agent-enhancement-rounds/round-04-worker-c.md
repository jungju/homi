## 1) Aging Content Watchlist and Refresh Prompts
- **Title:** Aging Content Watchlist and Refresh Prompts
- **Customer Problem:** Reminder and dictation content that worked at setup often becomes outdated after months, but households rarely notice until Homi feels irrelevant.
- **Customer Value:** Homi stays dependable long-term by flagging stale datasets/routines and prompting quick refresh actions before trust erodes.
- **Likely Surface:** `/brain` “Aging Content” card, optional home nudge on `/`, deep links into `/engines/schedule` and `/engines/dictation`.
- **Why Net-New:** Earlier rounds covered onboarding, adaptation, and safety, but not lifecycle aging detection and proactive refresh of old household content.

## 2) Monthly Reliability Checkup (One-Tap Health Review)
- **Title:** Monthly Reliability Checkup (One-Tap Health Review)
- **Customer Problem:** Reliability failures usually accumulate silently (permissions changed, quiet policies too broad, old reminders unresolved), and households don’t run manual checks.
- **Customer Value:** A lightweight recurring checkup keeps alert channels, policies, and active routines healthy over time without technical effort.
- **Likely Surface:** `/brain` checkup panel with pass/warn items, optional home reminder card on `/`.
- **Why Net-New:** Prior ideas included manual tests and live drift checks, but not a recurring guided maintenance ritual that bundles trust checks into a single monthly workflow.

## 3) Timezone and Clock Drift Protection
- **Title:** Timezone and Clock Drift Protection
- **Customer Problem:** Tablet clock/timezone changes (travel, OS updates, manual mis-set time) can shift reminders and break household confidence.
- **Customer Value:** Prevents “wrong-time alerts” by detecting major time drift and guiding a safe correction path before reminders fire incorrectly.
- **Likely Surface:** Always-visible trust warning on `/`, remediation flow in `/brain`, schedule runtime guardrails.
- **Why Net-New:** Existing proposals discuss permissions and quiet behavior, but not temporal integrity protections for device time and timezone drift.

## 4) Archive-Without-Loss for Retired Routines
- **Title:** Archive-Without-Loss for Retired Routines
- **Customer Problem:** Families avoid cleaning old reminders because deletion feels risky, so setup gets cluttered and reliability drops as signal-to-noise worsens.
- **Customer Value:** Households can retire outdated routines safely while preserving history and easy restore, keeping daily surfaces clean and dependable.
- **Likely Surface:** Archive actions in `/engines/schedule` and `/engines/dictation`, archive manager in `/brain`, cleaner home relevance on `/`.
- **Why Net-New:** Earlier rounds covered delete safety and rollback, but not long-term lifecycle management for gracefully retiring obsolete household routines.