---
docId: ai-review-rubric-dictation-running
screenId: dictation.running
audience: machine
summary: "받아쓰기 실행 화면 의도 판정"
version: v1
---

Must:
- `dictation-root` is active.
- `home-mode-text` shows "받아쓰기 실행모드".
- Progress text present (`index/total`).
- `dictation-next` and `dictation-exit` are visible.
- 10-second progression behavior appears stable.

Should:
- Current text should feel focused; controls are not cluttered.
- Exit is accessible.

Fail if:
- mode text is missing or wrong.
- automatic cadence appears broken (frozen or jumps incorrectly by large interval).
- Next is not visible.
- schedule toast appears as hard OS interruption.

