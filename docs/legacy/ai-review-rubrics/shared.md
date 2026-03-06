---
docId: ai-review-rubric-shared
screenId: shared
audience: machine
summary: "AI 리뷰 공통 루브릭"
version: v1
---

Must:
- Rendered screenshot and visible text correspond to expected route state.
- No critical runtime error states should appear.
- Required fixture artifacts are present (`testid`, text, aria snapshot).

Should:
- Core contract phrases from home mode/state and overlay flow remain consistent.

Fail if:
- Page content is empty or unusable for contract review.
- Navigation appears broken (route mismatch or frozen UI).
- Severe accessibility/readability degradation is obvious.

