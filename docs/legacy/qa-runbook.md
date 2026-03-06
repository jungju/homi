---
docId: qa-runbook
kind: qa-runbook
owners:
  - machine
audience: machine
status: active
machineReadable: true
contractVersion: v1
summary: "테스트 실행/실패 대응 표준 작업흐름"
lastUpdated: "2026-03-06"
dependencies:
  - docs/UI_TESTS.md
  - docs/qa-automation.md
  - tests/qa-homi.spec.ts
---
# Homi QA 실행 표준 (Runbook)

이 문서는 UI 및 자동화 점검을 실행할 때의 표준 절차를 고정한다.  
실행 방식이 바뀌지 않도록, 아래 체계를 기준으로 운영한다.

## 1. 목표

- P0 계약을 깨지 않도록 빠르게 판단
- 수동 점검(기획/UX)와 자동화 점검(Playwright)을 동일 기준으로 일관 실행
- 실패 시 재현 경로를 명확히 남기고 다음 작업으로 넘어감

## 2. 실행 전 준비

- Node.js 설치
- 브라우저 의존성 설치
- 저장소 클린 상태 또는 테스트 대상 브랜치 최신 반영

```bash
npm install
npm run qa:install
```

> `qa:install`은 Playwright 실행을 위한 브라우저 바이너리까지 설치합니다.

## 3. 기본 실행 순서(권장)

### 3.1 정적 코드/문서 기준 확인
- `docs/SPEC.md` v1 고정 규칙 확인
- 실행 전 참조 문서 역할 점검:
  - `docs/UI_TESTS.md` (P0/P1 수동 체크리스트)
  - `docs/qa-automation.md` (Playwright 계약 테스트 스펙)
  - `docs/qa-fixtures.md` (테스트 입력 데이터/픽스처)
- `docs/UI_TESTS.md` (수동 체크리스트) 핵심 P0 항목 점검
- `docs/qa-automation.md`의 TC 목록 대비
- `docs/qa-coverage-matrix.md` 및 `docs/machine/coverage-matrix.v1.yaml` 커버리지 상태 확인
- `docs/qa-fixtures.md`의 테스트 데이터 존재 확인

### 3.2 앱 실행 및 자동화

```bash
npm run dev
```

별도 터미널에서:

```bash
npm run qa:smoke
```

`qa:smoke`는 `playwright.config.ts` 기준으로 실행되며, 실행 결과는 다음 위치에 남습니다.

- 결과 요약: `test-results/.last-run.json`
- 리포트: `playwright` 리포트/HTML 리포트 생성 경로(Playwright 기본)
- 스크린샷: 테스트 케이스 설정에 따라 `artifacts/` 또는 설정된 artifact 경로

### 3.3 AI 리뷰(2차)

```bash
npm run qa:ai-review
```

`npm run qa:gate:strict`는 AI fail/high 경고까지 강제 중단하는 운영 게이트입니다.

```bash
npm run qa:gate:strict
```

기본 모드에서는 AI 판정 결과가 있어도 종료코드는 0입니다.

```bash
npm run qa:ai-review -- --strict
```

고위험 이슈가 있을 때만 2차 게이트를 사용해 강제 중단을 걸 수 있습니다.

### 3.4 AI 리뷰 실행 전 사전 아티팩트

- 기본 아티팩트: `npm run qa:smoke` 실행 결과에서 캡처 도구 사용 시 생성
- 사전 경로: `test-results/ai-artifacts/`
  - `*.png`
  - `*.meta.json`
  - `*.dom-testids.json`
  - `*.visible-text.txt`
  - `*.aria-snapshot.json`

- 출력:
  - `test-results/ai-reviews/*.ai-review.json`
  - `test-results/ai-reviews/summary.json`

### 3.5 자동화 실패 시 기본 대응

- `test-results/error-context.md` 또는 에러 콘텍스트 로그 확인
- 실패 스텝과 화면 캡처를 기준으로 다음 항목 확인:
  - `data-testid` 변경 여부
  - 라우팅/오버레이 상태
  - localStorage 상태(`homi.store.v1`)
  - Import/Export 경로/확정 플로우
  - 토스트/모드 텍스트 표시
  - `tests/fixtures` 파일과 `docs/qa-fixtures.md` 규약 일치성
- 필요 시 브라우저를 닫고 실행 환경 재시작 후 재실행

## 4. 배포/운영 체크리스트

- 배포 전
  - `docs/SPEC.md` 변경 반영 확인
  - `public/samples/*.json` 포맷(`homi`/`format`/`datasets`) 검증
  - `homi.store.v1` 키 사용 일관성 확인
  - Import 제한 정책 안내 문구 노출 확인

- 배포
  - `npm run build` 성공
  - 정적 라우팅 경로 점검(`/`, `/engines/schedule`, `/engines/dictation`, `/backup`)

- 장애 대응
  - Import 실패(CORS/네트워크/파싱): 사용자 메시지 및 실패 분기 노출 확인
  - localStorage 손상: 빈 스토어로 복구되며 크래시 없는지 확인
  - 충돌 정책 이슈: `docs/machine/coverage-matrix.v1.yaml` 미해결 항목으로 재현 경로 기록

## 5. 수동 QA 실행 체크 포인트

자동화로 다 커버되지 않는 항목을 5분 내로 확인합니다.

- 홈 화면 모드 텍스트:
  - 기본 모드 문구 노출 여부
- 팝업 오버레이 동작:
  - 배경이 남아있는지
  - 닫기 동작/뒤로가기 동작
- 엔진 실행 감각:
  - 받아쓰기 시작/종료 반응
  - Next 즉시 전환
- 알림 동작:
  - 받아쓰기 실행 중 OS 알림이 인터럽트하지 않는지
- 보안 표시:
  - XSS 문자열이 텍스트로 보이는지

## 6. 브랜치/릴리즈 게이트 기준

- P0 테스트는 릴리즈 전 필수
- 실패 항목이 있으면 반드시 `docs/TASK.md` 또는 이슈로 전환
- 실패가 재현 가능한 상태이면 배포 진행을 중단하고 조치 후 재실행

## 7. 테스트 데이터(픽스처) 연동 가이드

- 기본 테스트 텍스트/샘플은 `docs/qa-fixtures.md`에서 정의
- 자동화 스크립트는 가능하면 fixture 파일을 직접 import/복사해 사용
- 임시 데이터 생성 대신 고정 fixture 우선 사용

## 8. 실행 로그 템플릿(권장)

실행 후 아래 형식으로 기록:

- 날짜/시간:
- 실행 브랜치:
- 실행 명령:
- 결과(PASS/FAIL):
- 실패 항목:
- 재현 경로:
- 후속 조치:

## 9. 연동 문서

- `docs/UI_TESTS.md` : 수동/관리형 UI 계약 체크리스트
- `docs/qa-automation.md` : Playwright 계약 테스트 사양
- `docs/qa-fixtures.md` : 테스트 데이터/픽스처 규약
- `docs/ui-dom-contract.md` : UI DOM 계약 + testid 고정 규칙
- `docs/TASK.md` : 미해결 항목 추적
  - `docs/qa-coverage-matrix.md` : 커버리지 요약
- `docs/machine/coverage-matrix.v1.yaml` : 커버리지 기계판독 모델

