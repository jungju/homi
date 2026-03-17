## 1) Household Rhythm Auto-Tuning for Reminder Times
- **Title:** Household Rhythm Auto-Tuning for Reminder Times
- **Customer Problem:** Families often set reminder times once, then ignore or snooze them because real life timing shifts (school days, commute changes, bedtime drift).
- **Customer Value:** Homi becomes more useful over time by locally learning completion/snooze patterns and suggesting better times that match the household’s actual rhythm.
- **Likely Surface:** Schedule engine overlay (`/engines/schedule`) suggestion chips, home face confirmation prompt (`/`), opt-in controls in brain settings (`/brain`).
- **Why Net-New:** Earlier rounds covered recurrence, actions, and routines, but not adaptive time recommendations driven by observed household behavior.

## 2) Personal Focus Modes with Remembered UI/Alert Preferences
- **Title:** Personal Focus Modes with Remembered UI/Alert Preferences
- **Customer Problem:** One shared tablet serves different people (caregiver, child, elder), but each needs different readability and alert intensity.
- **Customer Value:** One tap can switch to a remembered mode (e.g., “Grandparent Mode,” “Kids Mode”) that applies preferred text scale, contrast, speech/chime level, and interaction density.
- **Likely Surface:** Home quick mode switch (`/`), saved mode editor in brain settings (`/brain`), inherited behavior in engine overlays (`/engines/*`).
- **Why Net-New:** Prior rounds addressed access/roles and ownership, but not reusable personalization presets that remember per-person comfort settings.

## 3) Adaptive First-Week Setup Coach (Behavior-Aware)
- **Title:** Adaptive First-Week Setup Coach (Behavior-Aware)
- **Customer Problem:** Static onboarding asks everyone the same setup questions, even when households clearly signal different priorities through early use.
- **Customer Value:** Homi asks fewer, smarter follow-up setup prompts based on local usage (missed reminders, dictation drop-off, frequent quiet toggles), reducing setup fatigue and improving fit.
- **Likely Surface:** Home micro-prompts (`/`), setup suggestions in brain settings (`/brain`), deep-links into schedule/dictation overlays (`/engines/schedule`, `/engines/dictation`).
- **Why Net-New:** Earlier rounds proposed setup wizard and starter packs, but not an adaptive coach that changes setup guidance based on observed first-week behavior.

## 4) Quiet Mode Exception Memory for “Never Miss” Reminder Types
- **Title:** Quiet Mode Exception Memory for “Never Miss” Reminder Types
- **Customer Problem:** Households need quiet periods, but some reminders (e.g., medication, pickup deadlines) should still break through consistently.
- **Customer Value:** Families can mark specific reminder categories as quiet-exempt, and Homi remembers those local preferences so critical items are not accidentally suppressed.
- **Likely Surface:** Quiet controls in brain settings (`/brain`), per-item/category flags in schedule editor (`/engines/schedule`), clear badge on active reminders (`/`).
- **Why Net-New:** Previous ideas introduced quiet scheduling and missed digests, but not persistent, preference-based quiet exceptions for critical household reminders.