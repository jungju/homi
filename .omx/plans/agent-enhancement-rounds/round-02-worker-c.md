## 1) Sensitive Reminder Privacy Shield
- **Title:** Sensitive Reminder Privacy Shield
- **Customer Problem:** On a shared household tablet, reminder text can expose private details (medications, appointments, personal tasks) to children, guests, or visitors.
- **Customer Value:** Lets families keep Homi visible in common spaces without leaking sensitive information, improving confidence to use it for higher-stakes reminders.
- **Likely Surface:** Home face reminder bubble on `/`, schedule item options in `/engines/schedule`, privacy defaults in `/brain`.
- **Why Net-New:** Round 1 covered access protection and reminder persistence, but not content-level privacy controls for what is shown on-screen.

## 2) Household Change History and Trust Log
- **Title:** Household Change History and Trust Log
- **Customer Problem:** When reminders behave differently, households often cannot tell whether someone changed settings/datasets or whether the app failed.
- **Customer Value:** Builds trust through a clear local timeline of major actions (imports, deletes, quiet profile changes, permission changes), reducing blame and confusion on shared devices.
- **Likely Surface:** New “History” card in `/brain`, lightweight “recent changes” snippet on `/`.
- **Why Net-New:** Round 1 proposed recovery and previews, but not a persistent audit-style history explaining who/what changed the setup over time.

## 3) Live Permission Drift Guard
- **Title:** Live Permission Drift Guard
- **Customer Problem:** Browser permissions can silently change after OS/browser updates or user taps, causing missed alerts without obvious warning.
- **Customer Value:** Improves reliability by continuously detecting degraded alert channels and showing immediate, guided recovery steps before a missed reminder matters.
- **Likely Surface:** Always-visible trust badge on `/`, guided fix flow in `/brain`, runtime checks inside reminder channel logic.
- **Why Net-New:** Round 1 suggested a manual delivery checkup; this is continuous monitoring with proactive alerts, not a one-time test panel.

## 4) Destructive-Action Safety Window
- **Title:** Destructive-Action Safety Window
- **Customer Problem:** Accidental taps on shared tablets can trigger deletes or replace imports too quickly, even when users did not intend to commit.
- **Customer Value:** Adds a short, explicit “review and cancel” window before destructive changes finalize, reducing catastrophic mistakes without heavy admin setup.
- **Likely Surface:** Import/replace confirm flow in `/brain`, delete flows in `/engines/schedule` and `/engines/dictation`.
- **Why Net-New:** Round 1 discussed protected access and rollback snapshots; this is a pre-commit safety layer that prevents mistakes before data is changed.