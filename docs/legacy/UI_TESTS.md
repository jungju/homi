---
docId: ui-tests-manual
kind: qa-manual-checklist
owners:
  - machine
audience: machine
status: active
machineReadable: true
contractVersion: v1
summary: "수동 UI 계약 체크리스트(P0/P1/P2)"
lastUpdated: "2026-03-06"
dependencies:
  - docs/SPEC.md
  - docs/ui-dom-contract.md
  - docs/qa-automation.md
---
# Homi v1 UI Contract Test Checklist (v1.0)

이 문서는 Homi v1 UI/UX가 SPEC/README의 “고정 규칙(Contract)”에서 벗어나지 않도록 하는 테스트 체크리스트다.

- 대상: v1 (schedule + dictation, localStorage, /backup only import, overlay routes, no header)
- 성격: 수동 QA 체크리스트(향후 Playwright/Cypress로 자동화 가능)
- 우선순위 정의
  - P0: 반드시 통과(배포 전 필수)
  - P1: 가능하면 통과(릴리즈 전 확인)
  - P2: 선택(회귀/안정성 강화용)

관련 실행 문서:
- Playwright 자동화 계약: [`docs/qa-automation.md`](./qa-automation.md)
- 실행 표준(명령/절차): [`docs/qa-runbook.md`](./qa-runbook.md)
- 테스트 데이터 규약: [`docs/qa-fixtures.md`](./qa-fixtures.md)
- DOM 고정 계약: [`docs/ui-dom-contract.md`](./ui-dom-contract.md)

---

## 0. 공통 테스트 환경/준비물

### 브라우저
- P0: Chrome 최신(데스크탑)
- P1: iOS Safari(모바일), Android Chrome(모바일)

### 공통 사전조건
- localStorage 초기화(또는 앱 초기 상태에서 시작) 테스트 케이스 포함
- 팝업(overlay) 동작 확인을 위해 “브라우저 뒤로가기/앞으로가기” 사용 가능해야 함

### 테스트용 Import 텍스트(최소 브레인)
아래 JSON을 `/backup`의 “JSON 텍스트 Import”에 붙여넣어 사용한다.

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

---

## 1. P0 스모크(안전성 검증 최소 세트)

* [ ] **P0-SMOKE-001** `/` 진입 시 얼굴 전체화면 + 말풍선 + 엔진 진입 버튼 존재 + 헤더 없음
* [ ] **P0-SMOKE-002** `/engines/dictation`는 “홈 위 팝업”으로 열림(홈이 뒤에 남아야 함)
* [ ] **P0-SMOKE-003** `/backup`는 “홈 위 팝업”으로 열림 + Import/Export UI 존재
* [ ] **P0-SMOKE-004** Import는 `/backup`에서만 가능(엔진 팝업에는 Import UI가 없어야 함)
* [ ] **P0-SMOKE-005** Import는 “미리보기 → 가져오기 확정” 후에만 저장됨(확정 전 저장 금지)
* [ ] **P0-SMOKE-006** Import는 Replace(전체 교체)만 지원(병합/추가 금지)
* [ ] **P0-SMOKE-007** Dictation 실행 시작 시 모드가 `받아쓰기 실행모드`로 표시되고 종료 시 `기본 모드`로 복귀
* [ ] **P0-SMOKE-008** Dictation 자동 진행 10초 고정 + Next 버튼 즉시 진행
* [ ] **P0-SMOKE-009** Schedule은 dictation 실행 중 OS 알림으로 인터럽트 금지(토스트/버블 안내만)

---

## 2. 홈(`/`) UI 고정 테스트

### 2.1 화면 구성(헤더 금지/얼굴 중심)

* [ ] **UI-HOME-001 (P0)** 기본 라우트는 `/`이다.

  * Steps: 새로고침 또는 직접 `/` 접속
  * Expected:

    * 얼굴(캐릭터)이 화면 중심(주요 시각 요소)이며 “홈 전체화면” 구성이다.
    * 말풍선(버블)이 보인다.
    * 글로벌 헤더/네비게이션 바/툴바가 존재하지 않는다.

* [ ] **UI-HOME-002 (P0)** 말풍선에 현재 모드가 “텍스트로 항상 표시”된다.

  * Steps: `/` 진입
  * Expected:

    * 기본 상태에서 `기본 모드` 문구가 텍스트로 표시된다.
    * 아이콘만 있고 텍스트가 없는 형태는 불가.

* [ ] **UI-HOME-003 (P0)** 엔진 설정/진입 버튼이 “항상 존재”한다.

  * Steps: `/` 진입 → 화면 상/하/주변 확인
  * Expected:

    * 엔진 팝업을 여는 버튼(또는 엔진 버튼들)이 항상 노출되어 있다.
    * 어떤 상태에서도(데이터가 비어있어도) 접근 불가가 되지 않는다.

### 2.2 엔진 버튼 렌더링(등록 엔진 기반)

* [ ] **UI-HOME-004 (P0)** v1 기본 엔진 `schedule`, `dictation` 진입이 가능하다.

  * Steps: 각 엔진 버튼(또는 목록) 클릭
  * Expected:

    * `/engines/schedule`, `/engines/dictation` 팝업으로 진입한다.

* [ ] **UI-HOME-005 (P1)** 홈에서 엔진 버튼은 “등록 엔진 목록 기반”으로 표시된다.

  * Steps: (가능하면) 엔진 목록이 코드/레지스트리 기반임을 확인
  * Expected:

    * 하드코딩 텍스트/버튼이 아니라 “등록된 엔진 목록”에서 렌더링된다.

---

## 3. 팝업(Overlay) 라우팅/UX 고정 테스트

### 3.1 Overlay는 홈 위에 겹쳐 열려야 한다

* [ ] **UI-OVERLAY-001 (P0)** `/engines/*`는 홈 위 팝업(overlay)이다.

  * Steps: `/` → 엔진 진입 → 팝업 열린 상태 확인
  * Expected:

    * 홈(얼굴 화면)은 뒤에 남아있고(배경/레이어로 존재), 팝업이 위에 겹쳐진다.
    * “완전한 페이지 전환”처럼 홈이 사라지면 실패.

* [ ] **UI-OVERLAY-002 (P0)** `/backup`도 홈 위 팝업이다.

  * Steps: `/` → 백업 진입 → 팝업 상태 확인
  * Expected: 위와 동일.

### 3.2 닫기/히스토리(뒤로가기) 동작

* [ ] **UI-OVERLAY-003 (P0)** 팝업 닫기 동작이 존재하고 홈으로 복귀한다.

  * Steps: 엔진/백업 팝업 열기 → 닫기 버튼(또는 UI 제공 방식) 클릭
  * Expected:

    * 팝업이 닫히고 홈(`/`) 상태로 돌아간다.

* [ ] **UI-OVERLAY-004 (P1)** 브라우저 뒤로가기로 팝업이 닫힌다.

  * Steps: `/` → `/engines/dictation` 열기 → 브라우저 Back
  * Expected:

    * 홈(`/`)으로 돌아가며 팝업이 닫힌다.
    * 주소/히스토리가 자연스럽게 동작한다.

### 3.3 홈 상호작용 차단

* [ ] **UI-OVERLAY-005 (P1)** 팝업이 열려있는 동안 홈 요소는 “의도치 않게 클릭/조작”되지 않는다.

  * Steps: 팝업 열린 상태에서 뒤의 홈 버튼/요소를 클릭 시도
  * Expected:

    * 팝업이 포커스/상호작용을 우선하고, 홈이 오동작하지 않는다.

---

## 4. `/backup` 팝업 UI 고정 테스트 (Import/Export 전용)

### 4.1 Import/Export 위치 고정

* [ ] **UI-BACKUP-001 (P0)** Import 입력은 `/backup`에서만 제공된다.

  * Steps: `/engines/schedule`, `/engines/dictation`에서 Import 관련 입력(UI) 탐색
  * Expected:

    * 엔진 팝업에는 URL/텍스트/파일/샘플 Import UI가 존재하면 안 된다.
    * Import 입력은 `/backup`에만 존재한다.

* [ ] **UI-BACKUP-002 (P0)** `/backup`에 아래 기능이 모두 존재한다.

  * Expected UI blocks:

    * URL Import 입력
    * JSON 텍스트 Import 입력
    * 파일 Import 입력
    * Export(백업 내보내기)
    * 샘플 뇌 로드(샘플 불러오기)

### 4.2 Import “미리보기 → 확정” 고정

* [ ] **UI-BACKUP-003 (P0)** Import는 미리보기를 먼저 보여주고, 확정 전에는 저장하지 않는다.

  * Steps:

    1. JSON 텍스트 Import에 테스트 JSON 붙여넣기
    2. “미리보기/검증” 동작 수행 (버튼명은 구현에 맞게)
    3. **확정 버튼을 누르지 않고** 팝업 닫기 → 홈 → 엔진 팝업에서 데이터 확인
  * Expected:

    * 확정 전에는 localStorage 데이터가 바뀌지 않는다.
    * 엔진 데이터셋 목록이 이전 상태 그대로다.

* [ ] **UI-BACKUP-004 (P0)** 확정 버튼(`가져오기 확정`)을 눌러야만 저장된다.

  * Steps:

    1. 동일 입력으로 미리보기
    2. `가져오기 확정` 클릭
    3. `/engines/dictation` / `/engines/schedule`에서 데이터셋 목록 확인
  * Expected:

    * dictation/schedule 데이터셋이 import된 내용으로 반영된다.

### 4.3 Replace(전체 교체) 고정

* [ ] **UI-BACKUP-005 (P0)** Import는 Replace(전체 교체)다.

  * Preconditions: 기존에 임의 데이터셋이 1개 이상 존재하도록 만든다.
  * Steps:

    1. 기존 데이터셋 존재 확인
    2. 테스트 JSON Import를 확정
    3. 엔진 팝업에서 데이터 확인
  * Expected:

    * 기존 데이터셋이 남아있으면 실패.
    * import된 데이터셋들만 존재해야 한다.

### 4.4 URL Import 스킴 제한(https만)

* [ ] **UI-BACKUP-006 (P0)** URL Import는 `https://`만 허용한다. `javascript:`는 차단한다.

  * Steps:

    * URL에 `javascript:alert(1)` 입력 → 가져오기 시도
  * Expected:

    * 즉시 차단/오류 표시, fetch 시도 금지, 저장 금지

* [ ] **UI-BACKUP-007 (P1)** 개발 예외: `http://localhost`만 허용(선택 구현)

  * Expected:

    * 로컬 개발 서버 JSON은 가져올 수 있다(구현했다면).

### 4.5 용량/안전치 제한

* [ ] **UI-BACKUP-008 (P0)** 2MB 이상 JSON은 import 실패한다.
* [ ] **UI-BACKUP-009 (P0)** 데이터셋 50개 초과는 import 실패한다.
* [ ] **UI-BACKUP-010 (P0)** 항목 10,000개 초과는 import 실패한다.
* [ ] **UI-BACKUP-011 (P0)** 문자열 10,000자 초과는 import 실패한다.

  * Expected:

    * 실패 시 “왜 실패했는지(어떤 제한)” 안내가 있으면 좋음(SHOULD)

### 4.6 Export 고정

* [ ] **UI-BACKUP-012 (P0)** Export는 `HomiBundleV1(format:"homi", version:1)`로 생성된다.

  * Steps: Export 실행 → 다운로드된 JSON 확인
  * Expected:

    * `format === "homi"`
    * `version === 1`
    * `bundleType === "backup"`(권장)
    * `datasets`가 포함됨

### 4.7 샘플 뇌 로드 고정

* [ ] **UI-BACKUP-013 (P0)** 샘플 뇌는 `public/samples/homi.sample.homi.json`을 사용한다.

  * Steps: 샘플 로드 동작 수행 → 미리보기에서 bundleId/title 확인(가능하면)
  * Expected:

    * 샘플도 Import와 동일하게 “미리보기 → 확정 → Replace” 흐름을 따른다.

---

## 5. 엔진 팝업(`/engines/{engineId}`) UI 고정 테스트

### 5.1 공통 규칙: 엔진 팝업에는 Import UI 금지

* [ ] **UI-ENGINE-001 (P0)** 엔진 팝업에는 URL/텍스트/파일 Import UI가 존재하면 안 된다.

  * Expected:

    * 데이터셋 관리(추가/편집/삭제/선택) + 실행만 존재

### 5.2 dictation 엔진: 데이터셋 선택/실행

* [ ] **UI-DICT-001 (P0)** dictation 팝업에서 데이터셋 목록이 보인다.

  * Preconditions: import로 dictation 데이터셋이 존재(테스트 JSON 사용)
  * Expected:

    * “단어 2개(meaning 하나 없음)” 데이터셋이 보인다.

* [ ] **UI-DICT-002 (P0)** 데이터셋 선택 후 실행이 가능하다.

  * Steps: 데이터셋 클릭 → 실행 시작
  * Expected:

    * 실행 UI로 진입한다(동일 팝업 내 화면 전환 가능).

### 5.3 schedule 엔진: enabled 토글과 알림 대상 표시

* [ ] **UI-SCH-001 (P1)** schedule 팝업에서 데이터셋별 enabled 상태를 다룰 수 있다.

  * Preconditions: schedule 데이터셋 1개 이상 존재
  * Steps: meta.enabled 토글 off → on
  * Expected:

    * off면 알림이 발생하지 않게 된다.
    * meta.enabled 미설정은 true로 간주되는 UX가 유지된다.

---

## 6. 모드(Mode) 표시/전환 UI 고정 테스트

* [ ] **UI-MODE-001 (P0)** 기본 상태 모드는 `기본 모드`로 표시된다.

  * Steps: `/` 진입
  * Expected: 말풍선에 `기본 모드`

* [ ] **UI-MODE-002 (P0)** 받아쓰기 실행 중 모드는 `받아쓰기 실행모드`로 표시된다.

  * Steps: dictation 실행 시작
  * Expected:

    * 홈 말풍선(또는 홈이 가려지는 경우 팝업 내 상태 영역)에서 텍스트로 표시된다.
    * 텍스트 누락 불가.

* [ ] **UI-MODE-003 (P0)** 받아쓰기 종료 시 모드는 `기본 모드`로 복귀한다.

  * Steps: 나가기 버튼으로 종료 / 마지막 항목 자동 종료
  * Expected: `기본 모드` 표시

---

## 7. 받아쓰기 실행(게임) UI/동작 고정 테스트 (dictation)

### 7.1 진행/버튼/표시

* [ ] **GAME-DICT-001 (P0)** 진행 인덱스/총 항목 수가 화면에 표시된다.

  * Expected: 예) `1 / 2` 같은 형태

* [ ] **GAME-DICT-002 (P0)** 자동 진행 간격은 10초 고정이다.

  * Steps:

    1. 항목 1에서 시작
    2. 아무 조작 없이 10초 대기(±1초 허용)
  * Expected:

    * 항목 2로 자동 이동한다.
    * 10초가 아닌 값이면 실패(가변 설정은 v1에서 금지)

* [ ] **GAME-DICT-003 (P0)** `Next` 버튼은 즉시 다음 항목으로 이동한다.

  * Steps: 항목 1에서 Next 클릭
  * Expected: 즉시 항목 2로 이동

* [ ] **GAME-DICT-004 (P0)** 마지막 항목 완료 시 자동 종료한다.

  * Steps: 항목 2까지 진행(자동/Next)
  * Expected:

    * 실행이 종료되고 모드가 `기본 모드`로 복귀

* [ ] **GAME-DICT-005 (P0)** 나가기 버튼으로 즉시 종료한다.

  * Steps: 실행 중 나가기 클릭
  * Expected: 즉시 종료 + 모드 복귀

### 7.2 발화 규칙(텍스트/TTS)

* [ ] **GAME-DICT-006 (P0)** `한글쓰기(영어 발화)` 모드에서 발화 텍스트는 `word`다.

  * Preconditions: item.word 존재
  * Expected: 현재 항목의 `word`를 발화(또는 발화 불가 환경이면 동일 텍스트 안내)

* [ ] **GAME-DICT-007 (P0)** `영어쓰기(한국어 발화)` 모드에서 발화 우선순위는 `meaning → hint → word`다.

  * Preconditions: 테스트 JSON의 2번째 항목은 meaning 없음
  * Expected:

    * 1번째 항목은 meaning(사과) 우선
    * 2번째 항목은 meaning이 없으므로 hint가 없으면 word(book)로 fallback

* [ ] **GAME-DICT-008 (P1)** TTS 불가 환경에서도 UI는 멈추지 않고 텍스트 안내로 대체된다.

  * Expected: 오류/크래시 없이 진행 가능

---

## 8. 스케줄 알림 UI/동작 고정 테스트 (schedule)

> 스케줄 알림은 “앱이 열려 있을 때만” 동작하는 v1 범위로 고정한다.

* [ ] **ALARM-SCH-001 (P0)** `repeatIntervalSec`가 있는 항목만 알림 대상이다.

  * Steps: repeatIntervalSec 없는 항목만 가진 세트 구성(가능하면) → 대기
  * Expected: 알림 없음

* [ ] **ALARM-SCH-002 (P1)** `meta.enabled === false`인 데이터셋은 알림이 발생하지 않는다.

  * Steps: enabled off → 대기(반복 간격 내)
  * Expected: 알림 없음

* [ ] **ALARM-SCH-003 (P0)** 받아쓰기 실행 중에는 OS 알림 강제 인터럽트 금지(토스트/버블만).

  * Steps:

    1. schedule에 repeatIntervalSec=2 같은 빠른 알림 세트 존재
    2. dictation 실행 시작(받아쓰기 실행모드)
    3. 알림 발생 기다림(2~5초)
  * Expected:

    * OS Notification이 뜨며 흐름이 깨지면 실패
    * 앱 내부 말풍선/토스트 메시지로만 안내되어야 한다

* [ ] **ALARM-SCH-004 (P1)** 받아쓰기 실행 중이 아닐 때는 Notification 권한 상태에 따라 동작한다.

  * Expected:

    * 권한 허용이면 OS 알림을 사용할 수 있음(MAY)
    * 거부/미응답이면 토스트/버블로 안내(SHOULD)

---

## 9. 보안/안전 UI 고정 테스트

* [ ] **SEC-UI-001 (P0)** Import된 텍스트는 HTML로 렌더링되지 않는다(텍스트로만 표시).

  * Steps:

    1. DataSet title에 `<img src=x onerror=alert(1)>` 같은 문자열이 포함된 번들 import 시도
    2. 미리보기/목록에서 표시 확인
  * Expected:

    * 문자열이 “그대로 텍스트”로 표시되고 어떤 스크립트도 실행되지 않는다.

* [ ] **SEC-UI-002 (P0)** URL Import에서 `javascript:`는 차단된다.

  * Expected: 즉시 에러, 저장/미리보기 진행 금지

* [ ] **SEC-UI-003 (P1)** 외부 URL(오디오/이미지 등)은 외부 요청이 발생할 수 있음을 사용자에게 안내한다.

  * Expected: 최소 1회 안내 텍스트 존재(위치/형태는 구현 자유)

---

## 10. localStorage/UI 상태 회귀 테스트

* [ ] **STORE-001 (P0)** localStorage 키는 `homi.store.v1` 하나만 사용한다.

  * Steps: 앱 사용 후 DevTools → Application → Local Storage 확인
  * Expected: 핵심 데이터는 `homi.store.v1`에만 존재

* [ ] **STORE-002 (P0)** 새로고침 후에도 데이터가 유지된다.

  * Steps: import 확정 → 새로고침 → 엔진 팝업에서 데이터 확인
  * Expected: 동일 데이터 존재

* [ ] **STORE-003 (P1)** localStorage가 비어있어도 앱이 정상 부팅된다.

  * Steps: storage clear → `/` 접속
  * Expected: 크래시 없이 기본 모드 화면 제공

* [ ] **STORE-004 (P1)** 저장 실패(쿼터 초과 등) 시 사용자에게 오류가 표시된다.

  * Expected: 조용히 실패하면 안 됨(SHOULD)

---

## 11. 모바일/반응형 UI 고정 테스트

* [ ] **RESP-001 (P1)** 모바일 뷰포트에서 얼굴/말풍선이 화면 밖으로 심하게 잘리지 않는다.
* [ ] **RESP-002 (P1)** 팝업 내용이 길면 내부 스크롤로 접근 가능하다(화면 밖 UI 접근 불가 금지).
* [ ] **RESP-003 (P2)** 가로/세로 회전 시 레이아웃이 무너지지 않는다.

---

## 12. 접근성(최소) 체크

* [ ] **A11Y-001 (P2)** 키보드로 팝업 닫기가 가능하다(ESC 또는 닫기 버튼 포커스).
* [ ] **A11Y-002 (P2)** 버튼/입력은 의미 있는 라벨(텍스트/aria-label)이 있다.

---

## 13. 권장 “릴리즈 체크” 묶음

### 배포 전 필수(P0) 묶음

* UI-HOME-001~003
* UI-OVERLAY-001~003
* UI-BACKUP-001/003/004/005/006/012/013
* UI-MODE-001~003
* GAME-DICT-001~005/007
* ALARM-SCH-003
* SEC-UI-001/002
* STORE-001/002

### 릴리즈 전 권장(P1) 묶음

* UI-OVERLAY-004/005
* UI-BACKUP-007~011
* GAME-DICT-008
* ALARM-SCH-002/004
* RESP-001/002


### UI-BACKUP-014 (P1) 텍스트 Import의 source.type 추적 경로 점검

- [ ] `text` 입력으로 Import된 데이터셋이 `source.type=text`로 추적되는지 확인한다.
- [ ] Export 후 재Import 시에도 `text` 추적 의도가 파괴되지 않음을 확인한다.
