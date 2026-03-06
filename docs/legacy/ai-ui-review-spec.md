---
docId: ai-ui-review-v1
kind: ai_review_contract
audience: machine
status: active
contractVersion: v1
summary: "Playwright로 만든 화면 아티팩트를 기반으로 AI가 의도 적합성을 판정하는 2차 리뷰 계약"
lastUpdated: "2026-03-06"
dependencies:
  - docs/qa-automation.md
  - contracts/ui-contract.v1.yaml
  - docs/ui-dom-contract.md
  - schemas/ai-ui-review-result.schema.json
---

# Homi v1 AI UI Review Spec

## 1) 위치/목적
- 1차 판정: JSON 스키마 + UI 계약 + Playwright `assert` + 시각 스냅샷/ARIA snapshot
- 2차 판정: 화면 아티팩트를 AI로 “의도 적합성” 체크
- 결과는 자동 실패(필수 실패)보다 운영 의사결정 참고를 위해 구조화 JSON으로 남김

## 2) 입력 아티팩트 요구치 (per screen)
- `screenId`가 붙은 JSON 메타: `<screenId>.meta.json`
- 화면 캡처: `<screenId>.png`
- testid DOM: `<screenId>.dom-testids.json`
- 텍스트 덤프: `<screenId>.visible-text.txt`
- ARIA snapshot: `<screenId>.aria-snapshot.json`
- 루브릭: `<screenId>.md` in `docs/ai-review-rubrics/`

## 3) 출력 아티팩트
- `<screenId>.ai-review.json` (단건)
- `summary.json` (집계)
- `raw-failures.json` (fail/warn issue 누적)

출력 스키마: `schemas/ai-ui-review-result.schema.json`

## 4) 판정 원칙
- `verdict`:
  - `pass`: 규약 위반 징후 없음
  - `warn`: 눈에 띄는 편차, 즉시 실패로 처리하지 않음
  - `fail`: 의도 위반으로 재검토/수정 대상
- `severity`: `low|medium|high`
- `issues[].code`:
  - `HEADER_VISIBLE`
  - `MODE_TEXT_MISSING`
  - `FACE_NOT_DOMINANT`
  - `ENTRY_MISSING`
  - `TOAST_MISSING_DURING_DICTATION`
  - `OVERLAY_NOT_STACKED`
  - `SCREENSHOT_MISSING`
  - `JSON_MISSING`
- `confidence`: `0.0 ~ 1.0`

## 5) AI 프롬프트 바인딩
모든 판정은 아래 요소를 동시에 전달:
- 현재 스크린샷
- 기준 루브릭 텍스트
- route/state
- route 메타 (메시지/요약)
- DOM testid 목록
- visible text
- ARIA snapshot
- deterministic 실패 힌트

이때 AI 답은 반드시 스키마 필드에 맞는 JSON만 허용.

## 6) 동작 모드(기본 vs 엄격)
- 기본 실행: AI fail는 저장/리포트 전용(파이프라인 실패 X)
- `--strict` 옵션: `verdict=fail` 또는 `severity=high`는 종료코드 1
- OpenAI 키가 없으면 `warn` + 이유 코드 `AI_REVIEW_SKIPPED` 출력(비치명적)

## 7) 4개 기본 화면
- `home.default`
- `backup.overlay`
- `dictation.running`
- `schedule.toast.during-dictation`

## 8) 실행 흐름(권장)
1) `npm run qa:smoke`
2) 화면별 아티팩트 캡처
3) `npm run qa:ai-review`
4) fail/warn 집계 보고서 확인

