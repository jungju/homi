## Automatic Restore Points and One-Tap Recovery
- **Customer Problem:** A household can lose its schedule and dictation setup after a bad import, accidental delete, or local storage corruption, and a local-only product becomes hard to trust once data disappears.
- **Customer Value:** Customers get a safety net before destructive changes and a simple way to recover yesterday’s working brain instead of rebuilding routines from scratch.
- **Likely Surface:** `/brain` recovery card, import confirm flow, dataset delete actions in `/engines/schedule` and `/engines/dictation`, local-first store persistence.
- **Why Now:** Homi is explicitly local-first, imports are replace-only, and corrupted storage currently falls back to an empty store, so recovery is a direct trust gap.

## Household Quiet Hours and Recurring Quiet Profiles
- **Customer Problem:** A manual 30-minute quiet button is too short and too easy to forget for bedtime, naps, school hours, or work calls.
- **Customer Value:** Families get predictable quiet behavior without babysitting the tablet, while still seeing a clear “quiet until” state on the home face.
- **Likely Surface:** `/brain` quiet controls, home status text on `/`, schedule reminder/chime logic.
- **Why Now:** Quiet mode already exists and fits the product, but it is still a one-off timer rather than a household routine.

## Missed Reminder Digest After Quiet, Dictation, or Reopen
- **Customer Problem:** When reminders are suppressed during quiet mode or dictation, important prompts can be silently consumed and never shown again.
- **Customer Value:** Customers keep the benefit of quiet behavior without losing trust that Homi will help them catch missed tasks afterward.
- **Likely Surface:** home bubble/status on `/`, a “missed today” section in `/brain`, schedule reminder state.
- **Why Now:** Current behavior intentionally suppresses reminders during quiet or dictation; without a catch-up surface, quiet behavior can feel like reminder loss.

## Persistent At-Distance Reminder Mode with Acknowledge or Snooze
- **Customer Problem:** A reminder that appears only as transient text is easy to miss from across the room, especially on a shared household tablet.
- **Customer Value:** Important reminders stay readable and actionable until someone dismisses or snoozes them, which makes Homi more useful for real chores and medication-style prompts.
- **Likely Surface:** home bubble/status area on `/`, optional reminder actions in the bottom control zone, schedule item options in `/engines/schedule`.
- **Why Now:** Homi already emphasizes large tablet-readable UI; the next high-value step is making reminders noticeable long enough to act on.

## Protected Settings Mode for Shared Tablets
- **Customer Problem:** On a kitchen or living-room tablet, children, guests, or accidental taps can reach settings, imports, edits, and deletes too easily.
- **Customer Value:** Customers can safely leave Homi visible in shared spaces without worrying that someone will wipe or alter the household brain.
- **Likely Surface:** settings entry from `/`, `/brain` import controls, edit/delete actions in engine overlays.
- **Why Now:** The current product shape is intentionally simple and always-available, but replace-only imports and destructive edits make accidental access costly.

## Reminder Delivery Checkup and Alert Channel Health
- **Customer Problem:** Customers cannot easily verify ahead of time whether browser notifications, speech, and chime playback will actually work on their device.
- **Customer Value:** A quick self-test reduces “it never alerted me” failures and gives households more confidence before relying on Homi for time-sensitive reminders.
- **Likely Surface:** `/engines/schedule` test panel, `/brain` status card for notification/speech/chime readiness.
- **Why Now:** Homi already uses multiple reminder channels, but there is no customer-facing way to validate those channels before a real reminder matters.