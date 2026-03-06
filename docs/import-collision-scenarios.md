# Import 충돌/중복 ID 처리 시나리오 (v1)

목표: `importDatasets`의 충돌 정책(동일 엔진+동일 ID가 있으면 신규 ID 생성, `originalDatasetId` 기록)이 의도대로 유지되는지 검증한다.

## 공통 가정

- 로컬 엔진/버전: `dictation`, `schedule`, `engineSchemaVersion=1`
- 충돌 판정은 `engineId`와 `id` 조합으로만 수행
- 임포트 추가 정책: 항상 `Add`, 덮어쓰기 없음

## 시나리오 1) 기존 데이터와 충돌 없음

- 로컬: `dictation` 엔진에 `id=ds_001` 없음
- Import payload: `[{ "id":"ds_001", ... }]`
- 기대:
  - 결과 ID: `ds_001` 유지
  - 저장: 신규 데이터셋 1개 추가
  - `source.originalDatasetId` 없음

## 시나리오 2) 동일 엔진에서 ID 충돌

- 로컬: `dictation` 엔진에 `id=ds_001` 존재
- Import payload: `[{ "id":"ds_001", ... }]`
- 기대:
  - 결과 ID: 새 ID 생성(`ds_xxx`)
  - 저장: 기존 데이터셋은 유지, 신규 데이터셋 추가
  - `source.originalDatasetId === "ds_001"` 기록
  - `source.type === "url" | "file" | "sample"` (Import 출처)

## 시나리오 3) 번들 안에서 동일 payload ID 중복

- 로컬: 해당 엔진에 `id=ds_001` 없음
- Import payload: `[
  { "id":"ds_001", ... },
  { "id":"ds_001", ... }
]`
- 기대:
  - 첫 번째: ID `ds_001`로 저장
  - 두 번째: 새 ID로 저장, `source.originalDatasetId === "ds_001"`
  - 두 항목 모두 저장됨 (중복 방지로 하나가 사라지지 않음)

## 시나리오 4) ID 미지정 payload

- Import payload: `[{ "engineId":"dictation", ... no id ...}]`
- 기대:
  - 새 ID 생성 후 저장
  - 충돌 판단 없음
  - `source.originalDatasetId` 없음

## 시나리오 5) 엔진이 다른 경우

- 로컬: `dictation`에 `id=ds_common` 존재
- Import payload: `[{ "engineId":"schedule", "id":"ds_common", ...}]`
- 기대:
  - ID 충돌 없음 (엔진이 다름)
  - ID `ds_common` 그대로 사용
  - 저장 유지 + 신규 추가

## 시나리오 6) 수동 편집/저장 경로와 구분

- `saveEditor`에서의 기존 데이터셋 편집은 ID 변경 없이 업데이트(업서트/수정)
- Import 충돌 로직과 별개로 동작하며, `originalDatasetId` 생성 없음

## 확인 포인트

- URL Import, 파일 Import, 샘플 Import에서 결과가 동일 규칙을 따르는지 확인
- 미리보기에서 개별 항목 선택 후 가져오기 눌렀을 때에도 충돌 규칙 유지되는지 확인
