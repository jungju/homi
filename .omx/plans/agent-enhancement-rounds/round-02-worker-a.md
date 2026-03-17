## Household Role Lanes with Timed Caregiver Unlock
**Title:** Household Role Lanes with Timed Caregiver Unlock  
**Customer Problem:** Shared tablets in kitchens/living rooms are used by kids, elders, and guests, so caregivers hesitate to leave management controls easily reachable.  
**Customer Value:** Lets households keep Homi always visible while reducing accidental edits by offering a quick caregiver unlock that auto-locks back to household-safe mode.  
**Likely Surface:** Home face (`/`) mode switch affordance, brain settings (`/brain`) for unlock policy, engine overlays (`/engines/*`) for edit gating.  
**Why Net-New:** Round 1 proposed protected settings broadly; this adds explicit dual-lane interaction (household-safe lane + timed caregiver lane) for common-space tablet flow, not just static protection.

## Caregiver Handoff Log and Shift Notes
**Title:** Caregiver Handoff Log and Shift Notes  
**Customer Problem:** In multi-caregiver homes, one person handles reminders/dictation changes but the next caregiver has no quick context on what was changed or skipped.  
**Customer Value:** Reduces missed care steps and repeated work by showing a short, human-readable “what happened today” handoff on the shared tablet.  
**Likely Surface:** Home face summary card (`/`), brain settings history panel (`/brain`), reminder/dictation completion events from engine overlays.  
**Why Net-New:** Round 1 included reminder catch-up for missed alerts, but not caregiver-to-caregiver operational handoff or shift-note continuity.

## Responsibility Tags for Household Tasks
**Title:** Responsibility Tags for Household Tasks  
**Customer Problem:** Shared-home reminders are ambiguous when multiple adults are present, causing “someone else will do it” failures.  
**Customer Value:** Improves follow-through by allowing reminders/routines to be tagged to a person or role (Mom, Dad, Teen, Grandparent, Any Adult) with clear ownership on screen.  
**Likely Surface:** Schedule editor (`/engines/schedule`) tag field, home reminder bubble owner label (`/`), brain settings tag presets (`/brain`).  
**Why Net-New:** Round 1 focused on recurrence, actions, and routine sequencing; it did not add ownership semantics for multi-person coordination.

## QR-Based Companion Onboarding for Secondary Caregivers
**Title:** QR-Based Companion Onboarding for Secondary Caregivers  
**Customer Problem:** Initial setup may be done by one person, but adding another caregiver is cumbersome when they must navigate settings and import/export manually.  
**Customer Value:** Speeds real household rollout by letting the primary caregiver generate a one-time QR onboarding packet for fast secondary setup and consistent shared configuration.  
**Likely Surface:** Brain settings (`/brain`) onboarding/share card, optional scan flow on first-run entry (`/`), local import/bootstrap path.  
**Why Net-New:** Round 1 covered starter packs and import safety, but not explicit multi-caregiver expansion from one configured household device to another caregiver context.