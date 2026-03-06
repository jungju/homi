---
docId: qa-fixtures
kind: qa-fixtures
owners:
  - machine
audience: machine
status: active
machineReadable: true
contractVersion: v1
summary: "테스트/자동화 입력 데이터(픽스처) 규약"
lastUpdated: "2026-03-06"
dependencies:
  - tests/fixtures/bundle.min.v1.json
  - tests/fixtures/bundle.xss.v1.json
---
# Homi 테스트 데이터/픽스처 규약

이 문서는 QA와 자동화 테스트에서 사용하는 입력 데이터 규약을 고정합니다.

## 1. 기본 원칙

- 테스트 데이터는 **최소 구조 + 경계 케이스 + 보안 케이스**를 분리해 보관
- 가능한 한 동일 데이터를 자동화/수동 테스트가 공유
- 고정된 키/문구를 유지해 재현성을 확보
- 실제 운영 데이터와 구분 가능하도록 `tests/fixtures/` 또는 `tests/fixtures/archive/`에 보관

## 2. 기본 위치

권장 위치:

- `tests/fixtures/bundle.min.v1.json`
- `tests/fixtures/bundle.xss.v1.json`
- `tests/fixtures/bundle.limit.size.v1.json` (v1 확장 시 추가 예정)
- `tests/fixtures/bundle.limit.datasets.v1.json` (v1 확장 시 추가 예정)
- `tests/fixtures/bundle.limit.items.v1.json` (v1 확장 시 추가 예정)

현재 보유 파일:

- `bundle.min.v1.json` : 최소 동작 브레인(자동화/수동 공통)
- `bundle.xss.v1.json` : 렌더링 안전성 전용

검증 기준:

- `homi-bundle`, `dataset-payload`, `dataset`, `store` 스키마를 `/schemas` 아래에서 공통 사용:
  - [`schemas/homi-bundle.v1.schema.json`](../schemas/homi-bundle.v1.schema.json)
  - [`schemas/dataset-payload.v1.schema.json`](../schemas/dataset-payload.v1.schema.json)
  - [`schemas/dataset.v1.schema.json`](../schemas/dataset.v1.schema.json)
  - [`schemas/store.v1.schema.json`](../schemas/store.v1.schema.json)

## 3. 최소 브레인 픽스처

`bundle.min.v1.json`의 최소 규격:

```json
{
  "format": "homi",
  "version": 1,
  "bundleType": "import",
  "bundleId": "bundle_test_min_v1",
  "title": "테스트 브레인(최소)",
  "datasets": [
    {
      "engineId": "dictation",
      "engineSchemaVersion": 1,
      "title": "단어 2개(meaning 하나 없음)",
      "items": [
        { "word": "apple", "meaning": "사과" },
        { "word": "book" }
      ]
    },
    {
      "engineId": "schedule",
      "engineSchemaVersion": 1,
      "title": "알림 2초 테스트",
      "meta": { "enabled": true },
      "items": [
        { "date": "2026-03-06", "title": "Ping", "repeatIntervalSec": 2 }
      ]
    }
  ]
}
```

사용 목적:

- Import 미리보기 + 확정 플로우
- dictation/schedule 엔진 동시 존재 테스트
- 자동화 기본 Smoke 데이터

## 4. 보안성(XSS) 픽스처

`bundle.xss.v1.json`은 렌더링 안전성 점검 전용입니다.

요구:

- 데이터셋 제목/아이템 텍스트에 HTML 문자열이 들어가도 **실행되지 않아야 함**
- 화면에는 텍스트 그대로 노출되어야 함
- 테스트에서 `alert/dialog` 실행 흔적이 없어야 함

예시 문자열:

```text
<img src=x onerror=alert(1)>
```

## 5. 한계치(용량/개수) 픽스처 규약

`v1` 안전 장치 검증용 픽스처는 아래 규칙을 따른다.

- JSON 최대 크기: 2MB 초과 실패
- 데이터셋 최대 개수: 50개 초과 실패
- 항목 최대 개수: 10,000개 초과 실패
- 문자열 최대 길이: 10,000자 초과 실패

권장 픽스처:

- `bundle.limit.size.v1.json` (size 초과)
- `bundle.limit.datasets.v1.json` (데이터셋 개수 초과)
- `bundle.limit.items.v1.json` (항목 개수 초과)

> 현재는 규약 우선 정렬 상태이므로, 실제 파일은 이후 `P1` 확장 시 추가해도 됩니다.

## 6. URL 임포트 입력 픽스처(참조 문자열)

- 성공 케이스: HTTPS JSON URL
- 실패 케이스: `javascript:` 스킴
- 네트워크 불가 케이스: 의도적 404/비정상 CORS URL

자동화에서 URL은 실제 서버 호출이 필요한 케이스라면
Playwright route mock 또는 로컬 테스트 서버에서 처리합니다.

## 7. 테스트 데이터 변경 규칙

새 fixture를 추가/수정할 때는 다음을 준수:

- `bundleId`는 고유 값으로
- 데이터셋/아이템 내용은 최소 1개 이상 포함
- `engineId`는 v1 기본 엔진(`schedule`, `dictation`) 또는 경계 검증 목적이면 추가값 허용
- 기존 자동화 시나리오가 기대값을 깨지 않으면, `docs/qa-automation.md`와 `docs/UI_TESTS.md`에도 반영

## 8. 현재 보유 픽스처 사용 가이드

- 자동화는 우선순위: `bundle.min.v1.json` → `bundle.xss.v1.json`
- 수동 QA는 같은 파일을 텍스트 입력/파일 입력 시 동일한 문자열로 사용
- 각 픽스처는 문서(동일 포맷)과 코드 경로에 대해 1회 정합성 점검 후 유지

## 9. 문서 연동

- QA 자동화 사양: [`docs/qa-automation.md`](./qa-automation.md)
- 수동 UI 계약 체크리스트: [`docs/UI_TESTS.md`](./UI_TESTS.md)
- 실행 표준: [`docs/qa-runbook.md`](./qa-runbook.md)

