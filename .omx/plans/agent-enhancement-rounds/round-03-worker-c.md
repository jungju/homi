## 1) Adaptive Quieting Tiers per Reminder Type
- **Title:** Adaptive Quieting Tiers per Reminder Type
- **Customer Problem:** Quiet mode is currently all-or-nothing, so families either miss important items or get interrupted by low-priority ones.
- **Customer Value:** Lets households choose how each reminder behaves during quiet time (hold for digest, silent badge only, gentle chime, or normal), so Homi stays respectful without becoming unreliable.
- **Likely Surface:** `/brain` quiet preferences matrix, `/engines/schedule` reminder priority/quiet-behavior field, home status/badge behavior on `/`.
- **Why Net-New:** Earlier rounds proposed recurring quiet windows and missed digests, but not preference-aware per-reminder quiet behavior with tiered delivery.

## 2) Behavior-Learning Reminder Tone and Persistence
- **Title:** Behavior-Learning Reminder Tone and Persistence
- **Customer Problem:** Fixed reminder style can feel nagging for easy tasks and too weak for routinely missed ones.
- **Customer Value:** Homi quietly adapts over time using local behavior signals (done fast, snoozed often, ignored repeatedly) to tune persistence and alert tone per reminder, reducing annoyance while improving follow-through.
- **Likely Surface:** Runtime reminder logic, `/brain` “adaptive behavior” toggle with explainability summary, home reminder card presentation on `/`.
- **Why Net-New:** Prior rounds added manual actions and persistence, but not automatic local adaptation based on household response patterns.

## 3) Confidence Guard for Risky Schedule Edits
- **Title:** Confidence Guard for Risky Schedule Edits
- **Customer Problem:** Non-technical users can accidentally create risky reminder setups (overnight spam, overlapping duplicates, impossible cadence) without noticing.
- **Customer Value:** Before save/import commit, Homi flags unusual configurations with plain-language risk warnings and safer one-tap fixes, preventing avoidable trust-breaking behavior.
- **Likely Surface:** `/engines/schedule` save flow, `/brain` import/replace validation preview, inline “fix it for me” suggestions.
- **Why Net-New:** Earlier rounds addressed destructive-action safety and rollback, but not proactive quality/sanity checks on reminder logic itself.

## 4) Trust Explainer: “Why This Alert Happened”
- **Title:** Trust Explainer: “Why This Alert Happened”
- **Customer Problem:** Shared households lose confidence when they cannot tell why a reminder appeared now, was softened, or was delayed.
- **Customer Value:** A compact “why” panel explains trigger source (schedule rule, quiet policy, adaptive tuning, missed catch-up), helping customers trust behavior and self-correct settings quickly.
- **Likely Surface:** Tap-to-expand info on home reminder card `/`, deeper event detail in `/brain` trust/history section.
- **Why Net-New:** Previous rounds proposed history logs and channel health, but not per-alert causal explanations tied to adaptive/quieting decisions.