Homi is a local-first, shared-tablet household routine app with two core engines (schedule, dictation), a face-first home screen for at-a-distance use, and a `/brain` overlay for import/settings. Conservatively, the primary customer is a non-technical household caregiver who needs reliable daily reminders and simple maintenance without risking data loss.

**Now**
1. **Title:** Guided First-Run Setup + Goal-Based Starter Packs  
**Customer Problem:** New households face setup friction and unclear first steps.  
**Customer Value:** Faster “first useful day” with guided setup and relevant starter content.  
**Likely Surface:** `/` empty-state bubble, `/brain` sample/onboarding card, handoff to `/engines/schedule` and `/engines/dictation`.  
**Why It Survived:** Highest day-one value; directly addresses onboarding gap without changing core model.

2. **Title:** Plain-Language Schedule and Dictation Builders  
**Customer Problem:** JSON-shaped editing is too technical for everyday caregivers.  
**Customer Value:** Creates/edit routines with large, simple fields instead of raw structures.  
**Likely Surface:** `/engines/schedule`, `/engines/dictation`.  
**Why It Survived:** Strongest usability win aligned with tablet-friendly UI intent.

3. **Title:** Replace-Safe Import Preview + Commit Safety Window  
**Customer Problem:** Replace-only import feels risky and hard to trust.  
**Customer Value:** Clear pre-commit impact view plus a short cancel window before destructive apply.  
**Likely Surface:** `/brain` preview/confirm flow.  
**Why It Survived:** Explicitly aligned with replace-only import contract and trust-critical behavior.

4. **Title:** Automatic Local Restore Points + One-Tap Recovery  
**Customer Problem:** Bad import/edit can destroy a working setup on a local-only app.  
**Customer Value:** Easy rollback without cloud dependency.  
**Likely Surface:** `/brain` recovery panel, post-import success state, engine delete flows.  
**Why It Survived:** Direct mitigation of localStorage corruption/reset and destructive-change risk.

5. **Title:** Actionable Persistent Reminder Card (Done, Snooze, Acknowledge)  
**Customer Problem:** Transient reminder text is easy to miss and hard to act on quickly.  
**Customer Value:** Faster completion loop and fewer ignored critical reminders.  
**Likely Surface:** `/` reminder bubble/control area, schedule item options in `/engines/schedule`.  
**Why It Survived:** Core customer-facing behavior improvement for daily utility.

6. **Title:** Missed Reminder Catch-Up Digest (Visual + Optional Spoken)  
**Customer Problem:** Quiet mode/dictation suppression can make reminders feel “lost.”  
**Customer Value:** Restores trust by summarizing what was missed after suppression windows.  
**Likely Surface:** `/` catch-up card/status text, `/brain` status summary.  
**Why It Survived:** Natural extension of existing suppression contracts; high trust impact.

**Next**
1. **Title:** Quiet Mode Profiles (Recurring Quiet Hours + Critical Exceptions)  
**Customer Problem:** One 30-minute toggle is too blunt for real household schedules.  
**Customer Value:** Predictable quiet behavior while allowing never-miss reminders to break through.  
**Likely Surface:** `/brain` quiet controls, per-item settings in `/engines/schedule`, `/` quiet indicators.  
**Why It Survived:** Strongly justified by existing quiet/chime suppression rules and daily use patterns.

2. **Title:** Flexible Recurrence + Time Windows  
**Customer Problem:** Daily/yearly exact-time rules are too rigid for many routines.  
**Customer Value:** Better fit for weekdays/specific days and “between X-Y” household timing.  
**Likely Surface:** `/engines/schedule` recurrence editor, preview metadata, `/` reminder behavior.  
**Why It Survived:** High customer relevance and clear gap from current recurrence contract.

3. **Title:** Shared-Tablet Caregiver Lock + Sensitive Reminder Privacy Shield  
**Customer Problem:** Shared-device accidental edits and exposed reminder details reduce trust.  
**Customer Value:** Safer common-space use with controlled access and privacy-preserving display.  
**Likely Surface:** `/` settings entry, `/brain` policy controls, reminder rendering on `/`.  
**Why It Survived:** Fits shared-tablet context and reduces high-cost mistakes.

4. **Title:** Reliability Guardrail Strip + Live Permission Drift Detection  
**Customer Problem:** Alert channels can silently degrade after OS/browser changes.  
**Customer Value:** Immediate “safe to trust now” status and guided fixes before missed reminders.  
**Likely Surface:** persistent status on `/`, remediation in `/brain`.  
**Why It Survived:** Reliability is core promise for reminder products; proactive over reactive.

5. **Title:** Trust Timeline + “Why This Alert Happened”  
**Customer Problem:** Households cannot easily explain behavior changes or specific alert timing.  
**Customer Value:** Faster troubleshooting and stronger confidence in app logic.  
**Likely Surface:** `/brain` change history/trust panel, expandable explainability on `/`.  
**Why It Survived:** Complements reliability features with explainability, not just status.

**Later**
1. **Title:** Across-the-Room Accessibility Calibration + Hearing-Accessible Alert Mode  
**Customer Problem:** Real-room readability/hearing constraints vary and can make alerts ineffective.  
**Customer Value:** Better inclusive reliability through calibrated text/contrast and visual pulse/captions.  
**Likely Surface:** `/brain` calibration flow and accessibility toggles, `/` alert presentation.  
**Why It Survived:** Directly aligned with at-distance tablet usage contract.

2. **Title:** Dictation Habit Loop (Daily 5-Minute Queue, Goals, Adaptive Difficulty)  
**Customer Problem:** Dictation can feel one-off, too easy, or too hard over time.  
**Customer Value:** Sustained practice through right-sized daily sessions and progress motivation.  
**Likely Surface:** `/` quick start/progress, `/engines/dictation` settings, `/brain` preferences.  
**Why It Survived:** Keeps second core engine sticky, beyond baseline run controls.

3. **Title:** Routine Lifecycle Manager (Pause/Archive/Refresh + Seasonal Rollover)  
**Customer Problem:** Old routines clutter setup, and yearly maintenance is manual.  
**Customer Value:** Cleaner day-to-day relevance with safe retirement and predictable annual refresh.  
**Likely Surface:** `/engines/schedule` lifecycle controls, `/brain` archive/freshness/rollover assistant.  
**Why It Survived:** Consolidates many maintenance asks into one practical long-term hygiene system.

4. **Title:** Device Move Assistant with Local Integrity Check  
**Customer Problem:** Replacing the household tablet is risky and stressful.  
**Customer Value:** Lower migration anxiety via guided transfer and post-move validation.  
**Likely Surface:** `/brain` move flow and checklists, `/` completion confirmation.  
**Why It Survived:** High-impact infrequent need; preserves continuity for local-first households.

**Merged or Dropped Themes**
- Merged multiple import-safety variants into two tasks: `replace-safe preview/commit` and `restore/undo`.
- Merged quiet-related duplicates into one quiet-profile task plus one catch-up digest task.
- Merged reliability-checkup, permission drift, and “reliability strip” into a single reliability guardrail task.
- Merged trust log + per-alert explainer into one explainability/trust timeline task.
- Merged aging content, stale detector, archive, seasonal packs, and annual rollover into one lifecycle manager.
- Dropped highly speculative auto-personalization ideas (next-best-action, aggressive adaptive tone/time learning) as weaker/less conservative without clearer customer evidence.
- Dropped lower-signal delight ideas (encouragement micro-moments, content remix) versus trust/reliability/onboarding priorities.
- Dropped heavy collaboration workflows (claim-it, assignees, request inbox, full Today Board) as secondary until core single-household reliability and setup friction are solved.