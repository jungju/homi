---
docId: ai-review-rubric-backup-overlay
screenId: backup.overlay
audience: machine
summary: "백업 오버레이 계약 판정"
version: v1
---

Must:
- Overlay is above home content and home remains context-visible behind.
- `backup-root` is visible.
- Must have URL/text/file import controls.
- Must show preview -> confirm flow elements.
- `backup-error` exists for error state.

Should:
- Visual tone stays consistent with home-face focus.
- No header/nav appears as a separate global chrome.

Fail if:
- backup controls are split across non-allowed areas.
- preview and confirm are both absent.
- global fixed header/nav appears.

