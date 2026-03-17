## Task 1
- Title: Weekday/Weekend and Selected-Day Recurrence
- Customer Problem: Real household routines rarely happen literally every day or only once a year. Families need reminders like school-morning only, weekday bedtime, weekend reset, or specific trash days, and daily-only scheduling is too blunt.
- Customer Value: Makes Homi useful for real recurring household routines instead of just simple daily alarms, which increases trust and repeat use.
- Likely Surface: Schedule engine overlay recurrence controls, schedule preview metadata, home reminder bubble.
- Why Now: The current product contract only supports `daily` and `yearly`, which is a major ceiling on household routine stickiness despite schedule already being a core engine.

## Task 2
- Title: Actionable Reminder Buttons on the Home Face
- Customer Problem: A reminder that only announces itself still leaves the household with work to do. Users need a fast way to say “done,” “10 minutes later,” or “skip for now” without leaving the main screen.
- Customer Value: Turns Homi from a passive announcer into an active routine helper, reducing nagging and making reminders feel useful instead of repetitive.
- Likely Surface: Home face bubble and bottom action area during an active reminder, with supporting defaults in the schedule overlay.
- Why Now: Homi already has a large tablet-readable home surface and recurring reminders, but no lightweight completion loop. This is one of the shortest paths to more daily engagement.

## Task 3
- Title: Missed Reminder Catch-Up After Quiet Mode or Dictation
- Customer Problem: Quiet mode and dictation correctly suppress interruptions, but a household can lose track of what was missed while Homi stayed silent.
- Customer Value: Preserves trust. Users can safely use quiet mode or run dictation without feeling that Homi “ate” important household reminders.
- Likely Surface: Home bubble catch-up summary, small catch-up list in the schedule overlay, status text in brain settings.
- Why Now: The current flow intentionally suppresses reminder effects during quiet mode and dictation, so catch-up is the natural next step if Homi is meant for real daily use.

## Task 4
- Title: Guided Routine Sessions for Morning, Leave-Home, and Bedtime
- Customer Problem: Single reminders do not help families complete multi-step routines. Households need visible progress through a short sequence, not just isolated alerts.
- Customer Value: Makes Homi part of a repeatable ritual, which is much stickier than one-off reminders and especially useful on a shared tablet in common spaces.
- Likely Surface: Schedule engine overlay for creating ordered routine steps, home bottom panel for active routine progress, home face mood and status text for encouragement.
- Why Now: Homi already has a home-face hub, a bottom action area, and schedule timing. Routine sessions build directly on that shape without forcing a denser productivity app model.

## Task 5
- Title: Daily Dictation Goal, Streak, and Recovery Loop
- Customer Problem: Dictation can be run today, but there is no built-in reason to come back tomorrow or a gentle way to recover after missing a day.
- Customer Value: Builds habit formation through visible goals and small celebrations, making dictation feel like a household practice ritual instead of a one-off tool.
- Likely Surface: Home bubble daily progress, dictation runner completion state, dictation overlay goal settings, optional celebration on the home face.
- Why Now: The dictation flow already has clear session boundaries and automatic progression, so adding a lightweight habit layer is high-value and product-consistent.

## Task 6
- Title: Smart “Today’s 5-Minute Dictation” Queue
- Customer Problem: Choosing a dataset and running it manually is more effort than many households will spend every day. They need a short, ready-to-start practice set.
- Customer Value: Lowers startup friction, encourages frequent short practice, and makes dictation much more likely to become a daily habit.
- Likely Surface: Dictation engine overlay for auto-building the queue from recent misses or favorites, home face one-tap start, brain settings for local-first progress preferences.
- Why Now: Homi is already local-first and tablet-oriented, which is ideal for a quick daily practice flow. A curated queue adds habit stickiness without changing the product’s core surfaces.