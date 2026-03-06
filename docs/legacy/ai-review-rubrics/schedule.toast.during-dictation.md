---
docId: ai-review-rubric-schedule-toast
screenId: schedule.toast.during-dictation
audience: machine
summary: "dictation 실행 중 스케줄 알림 오버레이 판정"
version: v1
---

Must:
- During dictation mode, schedule event is shown in-app.
- `toast-root` and/or `schedule-toast` is visible.
- No blocking OS-level notification UI is used.
- Dictation state remains intact during the toast.

Should:
- Toast appears in a brief, readable bubble style.
- Voice/game continuity is preserved.

Fail if:
- OS Notification popup appears instead of toast.
- Dictation stops unexpectedly at alert time.
- Toast text is unreadable or detached from schedule event.

