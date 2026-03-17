## 1) Household Day Simulator (Dry-Run Before Save)
- **Title:** Household Day Simulator (Dry-Run Before Save)
- **Customer Problem:** Caregivers change reminders/quiet settings but cannot confidently predict how the day will actually play out, leading to surprise alert storms or missed critical prompts.
- **Customer Value:** Lets families preview “tomorrow on Homi” before committing changes, so setup feels safe and intentional instead of trial-and-error.
- **Likely Surface:** `/brain` simulation panel, “Preview Day” action from `/engines/schedule`, summary badge on `/` when pending simulated changes exist.
- **Why Net-New:** Earlier rounds covered import preview and risky-edit warnings, but not a full timeline simulation of reminder, quiet, and dictation interactions before changes go live.

## 2) Reminder Time Windows (Not Just Exact Times)
- **Title:** Reminder Time Windows with Gentle Escalation
- **Customer Problem:** Real homes often need “sometime between 7:00–8:00” instead of exact-minute alerts; fixed-time reminders create unnecessary misses and nagging.
- **Customer Value:** Improves fit to real routines by allowing flexible windows with escalating nudges only if unfinished by window end.
- **Likely Surface:** `/engines/schedule` editor (window start/end + escalation style), home reminder card on `/` (in-window progress state), `/brain` defaults for escalation behavior.
- **Why Net-New:** Previous rounds focused on recurrence, snooze, adaptive timing, and routines, but did not add first-class window-based scheduling semantics.

## 3) Household Request Inbox (Suggest, Then Approve)
- **Title:** Household Request Inbox for New/Changed Reminders
- **Customer Problem:** On shared tablets, non-admin household members need changes (“add soccer pickup reminder”) but shouldn’t directly edit core setup.
- **Customer Value:** Creates a safe collaboration path: anyone can submit a suggestion, and caregivers approve/reject in one place.
- **Likely Surface:** Quick “Request a Reminder” action on `/`, approval queue in `/brain`, one-tap convert-to-schedule item in `/engines/schedule`.
- **Why Net-New:** Prior rounds covered role locks and assignment, but not a structured propose-and-approve workflow for managing setup changes collaboratively.

## 4) Device Move Assistant (Old Tablet to New Tablet)
- **Title:** Device Move Assistant with Local Integrity Check
- **Customer Problem:** When replacing a household tablet, migration is stressful; families fear losing routines, history context, and settings during manual import/export.
- **Customer Value:** Makes hardware replacement low-risk with guided transfer steps and a post-move integrity check that confirms critical reminders survived.
- **Likely Surface:** `/brain` “Move to New Device” flow, export/import wizard with checklist, home `/` migration-complete status confirmation.
- **Why Net-New:** Earlier rounds addressed backups and QR onboarding for additional caregivers, but not a dedicated end-to-end migration assistant for replacing the primary household tablet.