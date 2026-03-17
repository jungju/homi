## 1) Seasonal Routine Profiles with Auto-Switch
- **Title:** Seasonal Routine Profiles with Auto-Switch
- **Customer Problem:** Household routines change across school term, summer break, holidays, and weather seasons, but maintaining one static brain causes constant manual edits.
- **Customer Value:** Caregivers can predefine “School Season,” “Summer,” and “Holiday” versions once, then let Homi switch profiles on chosen dates automatically.
- **Likely Surface:** `/brain` profile calendar + activation rules, `/engines/schedule` profile assignment per reminder, home face `/` active-season badge.
- **Why Net-New:** Earlier rounds covered recurrence and adaptive timing, but not calendar-based seasonal profile switching for long-term maintenance.

## 2) Monthly Brain Freshness Review
- **Title:** Monthly Brain Freshness Review
- **Customer Problem:** Over months, reminders and dictation sets become stale or irrelevant, and households forget to clean them up until Homi feels noisy or useless.
- **Customer Value:** A lightweight monthly review flags low-value content (never completed, repeatedly snoozed, never opened) so families can keep only what still helps.
- **Likely Surface:** `/brain` “Review This Month” card, one-tap actions in `/engines/schedule` and `/engines/dictation`, optional summary on `/`.
- **Why Net-New:** Prior ideas added trust/history and adaptive behavior, but not a recurring content-freshness maintenance loop for brain hygiene over time.

## 3) Reminder Lifecycle States (Active, Seasonal Pause, Archive)
- **Title:** Reminder Lifecycle States (Active, Seasonal Pause, Archive)
- **Customer Problem:** Families often delete reminders that are only temporarily irrelevant (school lunch prep, winter routines), then must rebuild them later.
- **Customer Value:** Customers can pause reminders until a chosen season/date and archive old ones without losing setup details, making yearly reuse easy.
- **Likely Surface:** `/engines/schedule` lifecycle controls per item, `/brain` archive browser with restore, home `/` excludes paused/archive by default.
- **Why Net-New:** Earlier rounds discussed destructive safety and recovery, but not first-class lifecycle state management for non-destructive long-term content reuse.

## 4) Annual Rollover Assistant for Dates and Household Milestones
- **Title:** Annual Rollover Assistant for Dates and Household Milestones
- **Customer Problem:** Yearly events and age/school-stage-dependent routines drift over time, and households must manually find and update many date-linked items.
- **Customer Value:** Once a year, Homi guides caregivers through a short rollover checklist (new school year, birthdays/ages, annual appointments, outdated seasonal rules) to keep the brain current.
- **Likely Surface:** `/brain` annual checklist wizard, deep links into `/engines/schedule` and `/engines/dictation`, home `/` “Rollover pending” reminder.
- **Why Net-New:** Previous rounds proposed onboarding and adaptive nudges, but not a dedicated yearly maintenance workflow for long-term setup continuity.