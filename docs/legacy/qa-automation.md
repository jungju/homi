---
docId: qa-automation-contract
kind: qa-automation-contract
owners:
  - machine
audience: machine
status: active
machineReadable: true
contractVersion: v1
summary: "Playwright 자동화 계약(테스트 시나리오/체크 규칙)"
lastUpdated: "2026-03-06"
dependencies:
  - contracts/ui-contract.v1.yaml
  - docs/ui-dom-contract.md
  - docs/qa-fixtures.md
---
# Homi v1 UI 자동화 테스트 SPEC (Playwright 기반) — v1.0 Fixed

이 문서는 **Homi v1 UI/UX가 흔들리지 않도록** Playwright로 E2E 자동화 테스트를 설계하기 위한 “테스트 계약(Contract)” 문서다.  
코드 구현 전 단계에서 **테스트 가능하도록 UI에 심어야 할 안정적인 셀렉터(data-testid)** 와  
**각 시나리오의 Steps/Assert/스크린샷 포인트**를 고정한다.

> ✅ 원칙: v1은 “기능을 늘리는” 문서가 아니라 **현재 기능을 고정**하는 문서다.  
> 테스트를 위해 필요한 추가 요소는 **시각/기능을 바꾸지 않는 범위**(data-testid, 테스트 환경 스텁, 에러 메시지 노출)에서만 허용한다.

> 참고 문서
> - 수동 계약 체크리스트: [`docs/UI_TESTS.md`](./UI_TESTS.md)
> - 실행 표준: [`docs/qa-runbook.md`](./qa-runbook.md)
> - 테스트 데이터/픽스처 규약: [`docs/qa-fixtures.md`](./qa-fixtures.md)
> - UI DOM 계약(셀렉터 고정): [`docs/ui-dom-contract.md`](./ui-dom-contract.md)
> - 기계 판독형 UI 계약: [`../contracts/ui-contract.v1.yaml`](../contracts/ui-contract.v1.yaml)

---

## 0. 대상/범위

### 대상
- v1 라우트: `/`, `/engines/{engineId}`, `/backup`
- v1 기본 엔진: `schedule`, `dictation`
- 저장소: localStorage 단일 키 `homi.store.v1`
- Import/Export: `/backup`에서만, Import는 미리보기 후 확정, 반영은 Replace(전체 교체)

### 자동화 목표
- “UI 계약”을 깨는 변경을 배포/릴리스 단계 이전에 조기 검출
- 시간/알림/TTS 같이 플래키하기 쉬운 요소도 **결정적으로** 검증 가능하게 설계

### 비범위(v1 자동화에서 제외)
- 서버 동기화 / 로그인 (v1에 없음)
- 실시간 협업 (v1에 없음)
- 완전한 크로스 브라우저 커버리지 (v1은 Chromium 중심, P1에서 Safari/모바일 추가)

---

## 1. 테스트 프레임워크/실행 정책(고정)

### 프레임워크
- Playwright E2E
- 기본 브라우저: Chromium (P0)
- P1: WebKit(iOS Safari 유사), Android Chrome(필요 시 별도)

### 실행 전략
- **P0 계약 테스트는 CI에서 반드시 통과**해야 릴리즈 가능
- 스냅샷(스크린샷) 테스트는 P0 핵심 화면에 제한 (과도한 스냅샷 금지)

---

## 2. 안정적인 셀렉터 규칙(가장 중요)

### 2.1 셀렉터 우선순위(고정)
1. `data-testid` (MUST)
2. 접근성 셀렉터: `getByRole`, `getByLabel`, `getByText` (SHOULD)
3. CSS 클래스/구조 셀렉터 (금지에 가깝게 취급, MAY only emergency)

> **MUST:** v1 UI의 주요 요소는 `data-testid`로 고정한다.  
> 텍스트(문구)는 향후 개선될 수 있으므로, **핵심 계약 검증은 testid로 한다.**

### 2.2 `data-testid` 네이밍 규칙(고정)
- 케밥 케이스 사용: `home-face`, `backup-confirm`
- 범주-의미 형태 권장: `home-*`, `overlay-*`, `backup-*`, `dictation-*`, `schedule-*`
- 반복 요소(데이터셋/아이템)는 아래 규칙을 따른다.

#### 반복 요소 규칙(고정)
- 데이터셋 행: `data-testid="dataset-row"`
- 그리고 반드시 추가 속성 제공(SHOULD, 안정성↑):
  - `data-engine-id="dictation"`
  - `data-dataset-id="ds_xxx"` 또는 `data-dataset-title="..."`

---

## 3. v1에서 고정해야 하는 `data-testid` 목록(Contract)

> 아래 목록은 v1 기간 동안 **이름/의미가 변경되면 안 된다**. (MUST)

### 3.1 홈(`/`)
- `home-face` : 얼굴(캐릭터) 메인 비주얼 루트
- `home-bubble` : 말풍선 루트
- `home-mode-text` : 현재 모드 텍스트(반드시 텍스트)
- `home-open-engines` : 엔진 목록/설정 팝업 진입 버튼(또는 엔진 버튼 영역)
- `home-engine-btn-schedule` : schedule 엔진 진입
- `home-engine-btn-dictation` : dictation 엔진 진입
- (선택) `home-open-backup` : `/backup` 팝업 진입 버튼이 별도로 있으면 부여

### 3.2 오버레이(팝업 공통)
- `overlay-root` : 오버레이 루트 컨테이너
- `overlay-title` : 오버레이 제목(엔진명/백업 등)
- `overlay-close` : 닫기 버튼(항상 존재해야 함)

### 3.3 백업(`/backup`)
- `backup-url-input`
- `backup-url-preview-btn` : URL 입력 검증/미리보기 실행 버튼
- `backup-json-textarea`
- `backup-text-preview-btn` : 텍스트 입력 검증/미리보기 실행 버튼
- `backup-file-input`
- `backup-file-preview-btn` : 파일 입력 검증/미리보기 실행 버튼
- `backup-preview` : 미리보기 패널(데이터셋 수/엔진 목록 표시)
- `backup-confirm` : “가져오기 확정” 버튼 (확정 전 저장 금지)
- `backup-export-btn`
- `backup-sample-load-btn`
- `backup-error` : 입력 실패/제한 초과 등의 오류 메시지 영역(텍스트)

### 3.4 엔진 팝업(`/engines/{engineId}` 공통)
- `engine-root`
- `engine-datasets-list`
- `engine-dataset-add` (v1에 “추가” UI가 있으면)
- `dataset-row` (반복)
- `dataset-open` 또는 dataset row 클릭으로 “상세/실행” 진입

### 3.5 dictation 실행(게임)
- `dictation-root`
- `dictation-mode-a` : 한글쓰기(영어 발화)
- `dictation-mode-b` : 영어쓰기(한국어 발화)
- `dictation-progress` : `index/total` 표시
- `dictation-next`
- `dictation-exit`
- `dictation-current-text` : 현재 항목 표시 텍스트(있다면)

### 3.6 schedule 알림/토스트
- `toast-root` : 토스트/메시지 루트
- `schedule-toast` : 스케줄 알림 토스트(또는 버블 메시지)

---

## 4. 시간/알림/TTS를 “테스트 가능”하게 만드는 스텁 정책

### 4.1 타이머(10초 자동 진행 / repeatIntervalSec)
- 테스트는 **실제 10초 기다리지 않도록** 타이머를 제어해야 한다.
- 권장(우선순위):
  1) Playwright의 clock 기능이 사용 가능하면 이를 사용 (SHOULD)
  2) 아니면 `page.addInitScript`로 `setTimeout/setInterval`을 기록/가속 가능한 방식으로 래핑 (SHOULD)

> **중요:** 제품 동작 자체(10초 고정)는 바꾸지 않는다.  
> 테스트에서만 “시간을 앞으로 당기는” 방식으로 검증한다.

### 4.2 Notification(브라우저 OS 알림)
- 테스트 환경에서는 OS 알림이 실제로 뜨면 플래키하므로, 아래를 스텁한다(SHOULD):
  - `window.Notification`을 테스트용 클래스로 대체
  - 호출 횟수/내용을 기록 가능하게

검증 목표:
- dictation 실행 중에는 Notification 호출이 **없어야 한다**(P0)
- 실행 중이 아닐 때는 권한에 따라 호출될 수 있음(MAY)

### 4.3 Speech Synthesis(TTS)
- 테스트 환경에서 `speechSynthesis.speak`을 스텁하여 “마지막 발화 텍스트”를 기록(SHOULD)
- TTS 불가 환경 fallback은 “텍스트 안내로 정상 진행”이 목표(P1)

---

## 5. 테스트 데이터/픽스처(고정)

### 5.1 최소 브레인 픽스처(JSON 텍스트 Import용)
파일: `tests/fixtures/bundle.min.v1.json` (권장)  
픽스처 상세 규약은 [`docs/qa-fixtures.md`](./qa-fixtures.md) 참고.

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

### 5.2 “악성 문자열” 픽스처(XSS 렌더링 방지)

파일: `tests/fixtures/bundle.xss.v1.json`  
픽스처 정의/운영 규칙은 [`docs/qa-fixtures.md`](./qa-fixtures.md) 참고.

* dataset title 또는 item fields에 `<img src=x onerror=alert(1)>` 포함
* 기대: 알림/실행 없이 텍스트로만 표시

---

## 6. 스크린샷(스냅샷) 전략(최소 고정)

> 스냅샷은 UI 회귀를 잡는 데 좋지만 과하면 유지비가 폭증한다. v1에서는 “고정 화면만” 찍는다.

### 6.1 스냅샷 규칙

* viewport 고정:

  * Desktop: 1280x720 (P0)
  * Mobile(P1): 390x844
* 애니메이션/트랜지션이 있으면 테스트 환경에서 비활성화(SHOULD)
* 파일명 규칙:

  * `snap/home.default.png`
  * `snap/overlay.backup.png`
  * `snap/overlay.engines.dictation.png`
  * `snap/dictation.running.png`
  * `snap/schedule.toast.during-dictation.png`

### 6.2 스냅샷 포인트(P0)

* 홈 기본 화면
* `/backup` 오버레이 화면(미리보기 포함 상태)
* dictation 실행 중 화면
* dictation 실행 중 schedule 토스트 표시 화면

---

## 7. 자동화 테스트 케이스 상세(Playwright 시나리오)

각 케이스는 아래 형식으로 고정한다.

* **ID / Priority / Tags**
* Preconditions
* Steps
* Expected Assertions
* Snapshot Points
* Selector Map

---

### TC-P0-001 홈 기본 화면 계약

* **Priority:** P0
* **Tags:** `home`, `contract`
* Preconditions: localStorage clear
* Steps:

  1. `/` 로 진입
* Expected:

  * `[home-face]` visible
  * `[home-bubble]` visible
  * `[home-mode-text]` contains `기본 모드`
  * role `navigation` or `banner` 가 홈에 존재하지 않음(글로벌 헤더/네비 금지)
* Snapshot:

  * `snap/home.default.png`
* Selectors:

  * `home-face`, `home-bubble`, `home-mode-text`

---

### TC-P0-002 엔진 오버레이 라우팅(겹침) 계약

* **Priority:** P0
* **Tags:** `overlay`, `routing`, `engine`
* Preconditions: 홈 진입
* Steps:

  1. `/`에서 `home-engine-btn-dictation` 클릭
* Expected:

  * URL이 `/engines/dictation` 로 변함
  * `[overlay-root]` visible
  * 홈의 `[home-face]` DOM은 존재해야 함(overlay 뒤에 남아있어야 함)
* Snapshot:

  * `snap/overlay.engines.dictation.png`
* Selectors:

  * `home-engine-btn-dictation`, `overlay-root`, `overlay-title`, `home-face`

---

### TC-P0-003 백업 오버레이 라우팅 계약

* **Priority:** P0
* **Tags:** `backup`, `overlay`
* Steps:

  1. `/backup` 직접 진입 또는 홈에서 백업 버튼 클릭
* Expected:

  * `[overlay-root]` visible
  * `[backup-json-textarea]` 존재
  * `[backup-confirm]` 존재
* Snapshot:

  * `snap/overlay.backup.png`
* Selectors:

  * `overlay-root`, `backup-json-textarea`, `backup-confirm`

---

### TC-P0-004 Import 입력은 /backup에만 존재

* **Priority:** P0
* **Tags:** `contract`, `import`
* Steps:

  1. `/engines/dictation` 진입
* Expected:

  * 엔진 오버레이 내부에 `backup-url-input`, `backup-json-textarea`, `backup-file-input` 가 **존재하면 안 됨**
* Selectors:

  * `backup-url-input`, `backup-json-textarea`, `backup-file-input`

---

### TC-P0-005 Import는 “미리보기 → 확정” 전 저장 금지

* **Priority:** P0
* **Tags:** `import`, `storage`
* Preconditions: localStorage clear
* Steps:

  1. `/backup` 진입
  2. `[backup-json-textarea]`에 `bundle.min.v1.json` 내용을 입력
  3. `[backup-text-preview-btn]` 클릭하여 미리보기 표시
  4. **확정 버튼을 누르지 않고** `/engines/dictation`으로 이동
* Expected:

  * localStorage `homi.store.v1`가 비어있거나, datasetsByEngine이 비어있음(저장되지 않아야 함)
  * dictation 데이터셋 목록이 표시되지 않음(또는 “없음” 상태)
* Selectors:

  * `backup-json-textarea`, `backup-text-preview-btn`, `backup-preview`

---

### TC-P0-006 Import 확정 후 저장 + Replace(전체 교체) 계약

* **Priority:** P0
* **Tags:** `import`, `replace`
* Preconditions:

  * 먼저 다른 임시 데이터를 만들거나(또는 이전 import) 스토어가 “비어있지 않은 상태”를 구성
* Steps:

  1. `/backup`에서 `bundle.min.v1.json` 미리보기
  2. `[backup-confirm]` 클릭
  3. `/engines/dictation`에서 데이터셋 확인
  4. `/engines/schedule`에서 데이터셋 확인
* Expected:

  * dictation에 “단어 2개…” 데이터셋이 존재
  * schedule에 “알림 2초 테스트” 데이터셋이 존재
  * 이전 데이터셋이 남아있으면 실패(Replace 고정)
* Selectors:

  * `backup-confirm`, `engine-datasets-list`, `dataset-row`

---

### TC-P0-007 URL Import 스킴 차단(javascript:)

* **Priority:** P0
* **Tags:** `security`, `import`
* Steps:

  1. `/backup`
  2. `[backup-url-input]`에 `javascript:alert(1)` 입력
  3. `[backup-url-preview-btn]` 클릭
* Expected:

  * `[backup-error]`에 차단 메시지 표시
  * 미리보기(`[backup-preview]`)가 생성되지 않음
  * 저장 발생 금지
* Selectors:

  * `backup-url-input`, `backup-url-preview-btn`, `backup-error`, `backup-preview`

---

### TC-P0-008 Dictation 실행 모드 전환 + 진행 UI 계약

* **Priority:** P0
* **Tags:** `dictation`, `mode`
* Preconditions:

  * `bundle.min.v1.json` import 확정 완료 상태
* Steps:

  1. `/engines/dictation` 진입
  2. 데이터셋 선택 후 실행(방법이 버튼이면 해당 버튼 testid 부여)
* Expected:

  * 홈 말풍선의 `[home-mode-text]`가 `받아쓰기 실행모드`로 바뀜
  * `[dictation-progress]`가 `1 / 2` 형태로 표시(표현 형식은 자유하지만 “인덱스/총수”가 있어야 함)
  * `[dictation-next]`, `[dictation-exit]` 존재
* Snapshot:

  * `snap/dictation.running.png`
* Selectors:

  * `home-mode-text`, `dictation-progress`, `dictation-next`, `dictation-exit`

---

### TC-P0-009 Dictation 자동 진행 10초 고정 + Next 즉시 진행

* **Priority:** P0
* **Tags:** `dictation`, `timers`
* Preconditions:

  * 타이머 제어(Clock) 설치가 가능한 환경 구성
* Steps:

  1. dictation 실행 시작(항목 1)
  2. Clock을 +10초 진행 (실시간 sleep 금지)
* Expected:

  * progress가 다음 항목(2/2)로 변경
* Steps(Next):
  3. 다시 실행 시작하거나, 별도 케이스로 항목 1에서 `[dictation-next]` 클릭
* Expected:

  * 즉시 다음 항목으로 변경
* Selectors:

  * `dictation-progress`, `dictation-next`

---

### TC-P0-010 Dictation 발화 텍스트 규칙(word / meaning fallback)

* **Priority:** P0
* **Tags:** `dictation`, `tts`
* Preconditions:

  * `speechSynthesis.speak` 스텁으로 마지막 발화 텍스트 기록 가능
  * `bundle.min.v1.json`의 2번째 item은 meaning 없음
* Steps:

  1. 모드 A 선택: `[dictation-mode-a]`
  2. 항목 1에서 발화 트리거(자동이든 버튼이든, v1 동작에 맞게)
* Expected:

  * 마지막 발화 텍스트 == `"apple"` (word)
* Steps:
  3. 모드 B 선택: `[dictation-mode-b]`
  4. 항목 1 발화
* Expected:

  * 마지막 발화 텍스트 == `"사과"` (meaning)
* Steps:
  5. 항목 2로 이동 후 발화
* Expected:

  * meaning 없으므로 fallback 규칙 적용:

    * `meaning → hint → word` 이므로 `"book"` 이어야 함
* Selectors:

  * `dictation-mode-a`, `dictation-mode-b`

---

### TC-P0-011 Dictation 종료 계약(나가기 / 마지막 자동 종료)

* **Priority:** P0
* **Tags:** `dictation`, `mode`
* Steps:

  1. dictation 실행 중 `[dictation-exit]` 클릭
* Expected:

  * 모드가 `기본 모드`로 복귀
* Steps(자동 종료):
  2. 다시 실행 후 마지막 항목 완료(Clock으로 진행)
* Expected:

  * 자동 종료 + 모드 `기본 모드`
* Selectors:

  * `dictation-exit`, `home-mode-text`

---

### TC-P0-012 받아쓰기 실행 중 스케줄 알림 인터럽트 금지(토스트만)

* **Priority:** P0
* **Tags:** `schedule`, `dictation`, `notification`
* Preconditions:

  * schedule dataset에 `repeatIntervalSec: 2`
  * Notification API 스텁(호출 기록)
  * Clock 제어 가능
* Steps:

  1. dictation 실행 시작(`받아쓰기 실행모드`)
  2. Clock +2~4초 진행(스케줄 알림 발생 구간)
* Expected:

  * Notification 호출 횟수 == 0 (OS 알림 금지)
  * `[schedule-toast]` 또는 버블/토스트 안내가 나타남(앱 내부 안내 MUST)
* Snapshot:

  * `snap/schedule.toast.during-dictation.png`
* Selectors:

  * `schedule-toast`, `toast-root`

---

### TC-P0-013 XSS/HTML 렌더링 금지(텍스트만)

* **Priority:** P0
* **Tags:** `security`, `import`
* Steps:

  1. `/backup`에서 `bundle.xss.v1.json` 미리보기
* Expected:

  * `<img ...>` 같은 문자열이 실행되지 않고, 그대로 텍스트로 표시
  * alert/스크립트 실행이 없어야 함(테스트에서 dialog 이벤트 감지)
* Selectors:

  * `backup-preview`

---

## 8. Import 충돌/중복 ID 시나리오 (v1 Replace 정책 고정)

v1은 Import를 `Replace(전체 교체)`로 처리하므로 충돌 정책은 아래 규칙으로 고정한다.

### IMPORT-DS-001 기존 엔진/ID 충돌은 교체로 해소

* `datasetsByEngine`에 `dictation/ds_001` 존재
* Import payload도 `dictation/ds_001` 포함

*Expected*

* Import 확정 후 기존 `ds_001`은 삭제.
* 새로 들어온 `dictation/ds_001`은 저장.

### IMPORT-DS-002 번들 내부 ID 중복 정규화

* 같은 번들에 `id: ds_001`이 2개 이상 존재

*Expected*

* 첫 항목은 `ds_001` 유지
* 후속 중복 항목은 새 ID 생성
* 중복 항목 `source.originalDatasetId == "ds_001"` 기록 권장

### IMPORT-DS-003 ID 부재 payload 처리

* Import payload에 `id` 미지정

*Expected*

* 앱에서 새 ID 생성 후 저장.
* 기존 데이터와 충돌 판별이 필요치 않음(Replace 경로).

### IMPORT-DS-004 엔진별 ID 분리

* `schedule` 엔진에 `ds_common` import, `dictation` 기존에 `ds_common` 존재

*Expected*

* 엔진별 저장 구조로 충돌이 아님
* `schedule`의 `ds_common`은 그대로 사용 가능

### IMPORT-VERIFY-001 구현 검증 포인트

- URL/텍스트/파일/샘플 Import는 동일 Apply 경로 사용.
- 미리보기(확인) 후에만 저장.
- Replace가 아닌 경로로 저장되지 않음(수정 모드 금지).

---

## 9. P1 권장 자동화 케이스(초기 범위 밖이지만 추천)

* URL Import fetch 성공/실패(CORS/404) 라우트 인터셉트로 검증
* Import 용량 제한(2MB/50세트/1만항목/1만문자) 각 1케이스씩 자동 생성
* 브라우저 Back으로 오버레이 닫힘
* 모바일 viewport 스냅샷 1장(홈)

---

## 10. 테스트 파일 구조(권장)

```text
tests/
  e2e/
    home.spec.ts
    overlay.spec.ts
    backup-import.spec.ts
    backup-export.spec.ts
    dictation.spec.ts
    schedule.spec.ts
    security.spec.ts
  fixtures/
    bundle.min.v1.json
    bundle.xss.v1.json
  helpers/
    storage.ts        # localStorage read/clear
    import.ts         # backup UI 조작 helper
    stubs.ts          # Notification/TTS stub
    clock.ts          # clock install/advance 추상화
```

---

## 11. 플래키 방지 규칙(고정)

* 임의의 `wait(1000)` 사용 금지 (MUST)
* 항상 “요소가 나타날 때까지” 대기:

  * `expect(locator).toBeVisible()`
* 타이머 기반 기능(10초/2초)은 Clock으로 제어(SHOULD)
* 애니메이션이 있다면 테스트 환경에서 disable(SHOULD)

---

## 12. 이 문서가 요구하는 최소 UI 변경(테스트용)

* 주요 요소에 `data-testid` 부여 (MUST)
* 오류 메시지 영역 `backup-error` 제공 (MUST)
* 토스트/버블 알림의 DOM 식별자 제공 `toast-root`, `schedule-toast` (MUST)
* (권장) 반복 요소에 `data-dataset-title` 또는 `data-dataset-id` 속성 제공 (SHOULD)

---

## 13. Done 정의(자동화 관점)

* P0 테스트 케이스 전부 작성 및 CI에서 통과
* 스냅샷은 P0 지정 화면만 유지(4~5장)
* 테스트 실행 시간이 과도하지 않음(Clock 기반으로 30~60초 내 목표)

## 14. 2차 AI UI 의도 리뷰(권장, v1)

### 14.1 목적

- 1차 계약 테스트는 구조/동작을 강제
- 2차 AI 리뷰는 의도(시각 중심성, 헤더 부재, 모드 전달력)만 판단
- AI는 즉시 실패가 아닌 `warn/fail` 구조화 이슈로 기록하고, 운영 정책에 따라 실패 반영

### 14.2 필수/권장 아티팩트

- `tests/helpers/capture-ui-artifacts.ts`로 화면을 캡처
- 산출물:
  - `<screenId>.png`
  - `<screenId>.dom-testids.json`
  - `<screenId>.visible-text.txt`
  - `<screenId>.aria-snapshot.json`
  - `<screenId>.meta.json`
- 평가 기준 루브릭:
  - `docs/ai-review-rubrics/home.default.md`
  - `docs/ai-review-rubrics/backup.overlay.md`
  - `docs/ai-review-rubrics/dictation.running.md`
  - `docs/ai-review-rubrics/schedule.toast.during-dictation.md`

### 14.3 결과 형식

- 출력: `schemas/ai-ui-review-result.schema.json`
- 파일 위치: `test-results/ai-reviews/`
- 집계: `test-results/ai-reviews/summary.json`

### 14.4 실행

- 기본: `npm run qa:ai-review` (AI 미실행 시 warn 생성)
- 엄격: `npm run qa:ai-review -- --strict` (AI fail/high를 하드게 반영)
- `--strict`는 배포 전 의심 이슈에만 사용
- 운영에서는 필요 시 `npm run qa:gate:strict`로 `qa:smoke` + AI strict 리뷰를 한 번에 실행.

### 14.5 결합 정책(권장)

- deterministic 테스트 실패 = 반드시 게이트 실패
- AI fail/ warn = 이슈만 기록 후 사람 판단
- 동일 스냅샷을 기준(베이스라인) 대비로 넣으면 AI 오탐을 더 줄일 수 있음


## 15. 부록: 경량 회귀(권장, P1)

### TC-P1-014 텍스트 Import `source.type=text` 회귀 케이스

* **Priority:** P1
* Preconditions:

  * 텍스트 Import가 성공한 상태로 localStorage가 반영됨
* Steps:

  1. `/backup`에서 텍스트 Import 후 `가져오기 확정` 실행
  2. `backup-export-btn`으로 Export 후 텍스트 저장
  3. 앱 재시작/새 세션에서 같은 Export 결과를 텍스트로 재Import
  4. Import 전/후 데이터셋 `source.type` 정합성 확인
* Expected:

  * `source.type=text`로 들어온 경로가 Import 경로별 추적에서 합리적으로 복원되거나 유지되어야 함
  * 추적 정보를 잃는 동작이 없는지 확인
* Selectors:

  * `backup-text-preview-btn`
  * `backup-confirm`
  * `backup-export-btn`
  * `backup-preview`
