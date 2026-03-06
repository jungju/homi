---
docId: ai-review-rubric-home-default
screenId: home.default
audience: machine
summary: "홈 기본 화면 UI 의도 점검"
version: v1
---

Must:
- Face is the dominant visual element.
- Bubble is visible and includes the current mode text.
- `home-open-engines` area is visible.
- Entry buttons are visible: `home-engine-btn-schedule`, `home-engine-btn-dictation`.
- No global header/nav is visible.

Should:
- Visual layout is centered around character world.
- No dense admin-style controls in baseline mode.

Fail if:
- Header/nav is visible.
- Mode text is absent.
- Face is visually minor.
- Entry buttons for both schedule and dictation are missing.

