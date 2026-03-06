---
docId: task-log
kind: work-plan
owners:
  - machine
audience: machine
status: active
machineReadable: true
contractVersion: v1
summary: "진행 항목/완료 상태 레지스트리"
lastUpdated: "2026-03-06"
dependencies:
  - docs/ui-dom-contract.md
  - docs/qa-automation.md
---
# Homi v1 진행 TASK

- [x] AGENTS.md/SPEC 정합형으로 초기 사양 반영
- [x] Homi 스토어/번들/검증 기본 타입/유틸 작성 (`src/lib/homi.ts`)
- [x] 엔진 목록/엔진별 화면/백업 화면 라우트 구현
- [x] 샘플 번들 등록 및 샘플 Import 적용
- [x] URL/파일 Import 미리보기 + 확정(확인) 저장 방식 적용
- [x] Export/Import를 HomiBundleV1 형태로 처리
- [x] `src/App.svelte`의 import/preview 상태 초기화 분기 정리
- [x] 제한 정책(최대 용량/세트 수/항목 수)과 사용자 안내 UX 정합화
- [x] Import 충돌/중복 ID 처리 테스트 시나리오 정리
- [x] `UI_TESTS.md` 문서 위치를 `docs/`로 통합 정리하고 루트 안내 문구 반영
- [x] 문서 업데이트: 운영/배포/문제 대응 체크리스트 정리
- [x] QA 실행 표준(runbook) 문서화(`docs/qa-runbook.md`)
- [x] 테스트 데이터/픽스처 규약 문서화(`docs/qa-fixtures.md`)
- [x] QA 픽스처 실제 파일 생성 (`tests/fixtures/bundle.min.v1.json`, `tests/fixtures/bundle.xss.v1.json`)
- [x] `App.svelte` 테스트 식별자(SPEC/TC) 정합성 보강 (`dictation-progress`, `dictation-current-text`, `dictation-root`, `home-open-engines`)
- [x] UI DOM 계약 문서 정리 (`docs/ui-dom-contract.md`) 및 문서간 정합성 가이드 반영

## 추가로 권장되는 다음 TASK

- [x] README.md/SPEC.md의 핵심 용어(SSG/SPA, source.type) 동기화 확인을 위한 문서 정합성 체크를 주기 실행
- [x] `docs/import-collision-scenarios.md` 규칙을 `docs/qa-automation.md`로 병합
- [ ] `source.type`이 `text`로 저장되는 경로 전반(Import→Export→재Import) 회귀 테스트 케이스 작성
- [ ] 스케줄/받아쓰기 동시 동작 시 (받아쓰기 실행중 알림 처리, 모드 전환) UX 회귀 테스트 추가
- [x] `docs/ops-checklist.md` 운영 항목을 `docs/qa-runbook.md`로 병합
- [x] `docs/qa-coverage-matrix.md`/`docs/machine/coverage-matrix.v1.yaml` 기계 판독 키 정합성 정리
- [ ] `docs/UI_TESTS.md`를 실제 체크리스트 본문(누락 항목 점검 항목 포함) 형태로 유지
- [ ] `importDatasets` 유틸 merge 동작/replace 정책 설명 정합성 확인 (현재 App은 replaceStore로 래핑)
- [x] `docs/qa-coverage-matrix.md`를 `docs/machine/coverage-matrix.v1.yaml`로 정합성 단일화

## 코드 정합성 체크 (미반영 시 TASK 미완료)

- [x] 홈 기본 모드 라벨 텍스트 정합성 (`현재 모드: 기본 모드`)
- [ ] `dictation-root`, `dictation-progress`, `dictation-current-text` `data-testid` 존재
- [ ] `tests/fixtures` 파일이 문서 규약(`docs/qa-fixtures.md`)과 최신 동기화

## 실행 기반 부족분 추적 방식(권장)

- [ ] 핵심 사용자 시나리오를 **목표 동작-기대 동작-실제 동작-재현 경로** 3줄 템플릿으로 적는 규칙 정착
- [ ] 화면 단위(홈, 엔진팝업, 브레인설정, 알림/음성)에 대해 수동 QA 체크표를 작성하고 1회 스모크 실행
- [ ] 기능별 미니 회귀 목록을 스프린트 앞부분 TASK로 배치(항상 선점 우선)
- [ ] 이슈 생성 시 `브라우저/OS`, `재현 단계`, `예상 화면`, `콘솔 에러`, `우선순위(P0~P2)`를 필수로 기입

## 실행 기반 부족분 후보 TASK

- [ ] 브라우저에서 새로고침/뒤로가기 시 홈 모드 라벨/토스트/팝업 상태가 비정상인 케이스 점검
- [ ] 받아쓰기 실행 중 오디오 로드 실패 시 TTS fallback(텍스트 모드) 일관성 검증
- [ ] 스케줄 반복 알림이 비활성 데이터셋을 정확히 건너뛰는지 검증
- [ ] `/backup`에서 URL/텍스트/파일 입력별 실패 메시지 가독성과 원인 분류 정확성 점검
- [ ] `source.type: text` 저장이 Export/재Import에서 유지되는지 데이터 단위로 확인
- [ ] 팝업 닫기 시 `ESC` 동작 여부 점검 (A11Y-001 규칙 정합성)

