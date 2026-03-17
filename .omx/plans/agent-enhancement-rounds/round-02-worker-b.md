## 1) Shared Responsibility Assignment for Reminders
- **Title:** Shared Responsibility Assignment for Reminders
- **Customer Problem:** In a shared home, reminders often fail because nobody knows who is expected to act, so tasks get assumed, delayed, or duplicated.
- **Customer Value:** Each reminder can clearly show an owner (or “anyone”), reducing ambiguity and increasing follow-through for recurring chores and care routines.
- **Likely Surface:** `/engines/schedule` item editor (assignee field), home reminder card on `/` (owner badge), optional household member list in `/brain`.
- **Why Net-New:** Round 1 added reminder actions (done/snooze) and persistence, but did not introduce explicit per-reminder household ownership.

## 2) “Claim It” Collaborative Reminder Flow
- **Title:** “Claim It” Collaborative Reminder Flow
- **Customer Problem:** On a common-space tablet, multiple people may see the same reminder and either both act or both ignore it because accountability is unclear in the moment.
- **Customer Value:** A one-tap “I’ll do it” claim creates immediate accountability and prevents duplicate effort, while keeping the reminder visible to others until resolved.
- **Likely Surface:** Home reminder action row on `/` with `Claim`, `Done`, `Snooze`; reminder state shown in schedule overlay.
- **Why Net-New:** Round 1 proposed actionable reminders, but not collaborative claiming semantics for multi-person coordination on shared devices.

## 3) Household Handoff Notes on Completion
- **Title:** Household Handoff Notes on Completion
- **Customer Problem:** Many routines require a handoff detail (“medicine given at 8:10”, “laundry moved to dryer”), but current reminder completion is binary and loses critical context.
- **Customer Value:** Short completion notes preserve context for the next household member, improving continuity in caregiving and shared chores.
- **Likely Surface:** Completion modal on `/` (optional quick note chips + text), recent activity strip in `/brain` or schedule overlay.
- **Why Net-New:** Round 1 focused on completion actions and missed-digest recovery, but did not cover context-sharing between household members after completion.

## 4) Common-Space “Today Board” for Ritual Visibility
- **Title:** Common-Space “Today Board” for Ritual Visibility
- **Customer Problem:** Families need a glanceable communal view of what’s next, in progress, and pending today; isolated reminder popups don’t provide shared ritual awareness.
- **Customer Value:** A persistent Today Board increases repeat use by making the tablet a daily coordination anchor for morning, after-school, and bedtime household rhythms.
- **Likely Surface:** Home face `/` as default board mode (Now / Next / Later columns with large text), backed by existing schedule data and quiet-state context.
- **Why Net-New:** Round 1 suggested guided routines and persistent reminders, but not a full-day communal board optimized for at-a-distance shared viewing in common spaces.