## 1) Escalating “No-Response” Reminder Safety Ladder
- **Title:** Escalating “No-Response” Reminder Safety Ladder
- **Customer Problem:** From across the room, a reminder can be seen too late or ignored accidentally, and households are left unsure whether important items were truly noticed.
- **Customer Value:** Critical reminders become harder to miss by escalating in clear stages (banner -> persistent card -> full-screen alert with repeat interval) until acknowledged.
- **Likely Surface:** Home face `/` reminder runtime, schedule item criticality settings in `/engines/schedule`, escalation defaults in `/brain`.
- **Why Net-New:** Earlier rounds covered reminder actions, persistence, and adaptive tone, but not a deterministic, safety-first escalation path tied to explicit non-response handling.

## 2) Across-the-Room Readability Calibration
- **Title:** Across-the-Room Readability Calibration
- **Customer Problem:** Households do not know if current text size/contrast is truly readable from their real viewing distance, especially for elders or low-vision users.
- **Customer Value:** A quick guided calibration makes Homi reliably legible in the exact room setup, reducing anxiety that key reminders will be missed.
- **Likely Surface:** Guided calibration flow in `/brain`, one-tap apply on `/`, inherited typography/contrast tokens across `/engines/*`.
- **Why Net-New:** Prior rounds introduced focus modes and personalization, but not a concrete distance-based validation workflow that proves readability in-place.

## 3) Hearing-Accessible Alert Mode (Caption + Visual Pulse)
- **Title:** Hearing-Accessible Alert Mode (Caption + Visual Pulse)
- **Customer Problem:** Speech/chime alerts fail for hard-of-hearing users or noisy rooms, making reminders unreliable unless someone is looking at the tablet at the right moment.
- **Customer Value:** Reminders stay dependable through large live captions and high-visibility pulse/edge cues that do not depend on audio.
- **Likely Surface:** Home alert presentation on `/`, accessibility toggles in `/brain`, per-reminder accessibility flags in `/engines/schedule`.
- **Why Net-New:** Existing ideas discuss channel health and nudge style, but not a dedicated hearing-access mode designed around non-audio alert comprehension.

## 4) Always-Visible Reliability Strip (“Safe to Trust Now”)
- **Title:** Always-Visible Reliability Strip (“Safe to Trust Now”)
- **Customer Problem:** People feel anxious when they cannot instantly tell whether Homi is currently reliable (quiet suppression active, permissions degraded, or overdue critical reminders).
- **Customer Value:** A persistent top-level strip gives at-a-glance confidence status: `Channels OK`, `Quiet Until`, `Critical Pending`, and `Last Alert Delivered`.
- **Likely Surface:** Persistent status strip on `/`, detail drill-down in `/brain`, runtime status hooks from schedule/dictation engines.
- **Why Net-New:** Earlier rounds proposed trust logs, trust explainers, and drift checks, but not a single continuous “can I rely on it right now?” indicator optimized for across-room reassurance.