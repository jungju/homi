---
docId: spec-core
kind: product-spec
owners:
  - machine
audience: machine
status: active
machineReadable: true
contractVersion: v1
summary: "v1 제품/데이터/플랫폼 규격 본문"
lastUpdated: "2026-03-06"
dependencies:
  - contracts/ui-contract.v1.yaml
  - schemas/homi-bundle.v1.schema.json
  - schemas/dataset-payload.v1.schema.json
  - schemas/dataset.v1.schema.json
  - schemas/store.v1.schema.json
---
# Homi v1 제품/데이터 SPEC (v1.0 Fixed)

이 문서는 **Homi v1의 최종 계약(Contract)** 입니다.  
v1 구현체는 본 문서의 규칙을 **반드시(MUST)** 따릅니다.

> **변경 정책(고정):**  
> v1의 동작/데이터/UX 규칙을 변경하려면 **v2+로 SPEC 버전을 올린 뒤** 변경합니다.  
> (문구 보강/오탈자/설명 추가는 가능하나, 규칙의 의미가 바뀌면 v2+로 처리)

---

## 0. 규범 키워드

- **MUST**: 반드시 지켜야 하며, 어기면 v1 호환이 아님
- **SHOULD**: 강력 권장. 특별한 이유가 있으면 예외 가능
- **MAY**: 선택 구현

---

## 1. 목표와 비목표

### 1.1 목표(v1)

- 앱은 **SSG로 빌드되어 정적 파일로 배포**된다. (서버/API/DB 없음)
- 기능 단위인 **엔진(Engine)** 을 실행한다.
  - v1 기본 엔진: `schedule`, `dictation`
- 사용자 데이터는 **브라우저 localStorage에만 저장**한다.
- 샘플 뇌(브레인) 1개를 포함한다.
  - 경로(고정): `public/samples/homi.sample.homi.json`
- 외부 입력(Import)은 **검증 + 미리보기 + 사용자 확정** 후 반영한다.

### 1.2 비목표(v1)

- 회원가입/로그인, 서버 동기화, 다중 디바이스 자동 동기화
- 실시간 협업
- URL 구독/자동 동기화(원격 업데이트 추적)
- 엔진별 원격 자산 업로드/호스팅(이미지/오디오 저장소 제공)

---

## 2. 용어(Glossary)

- **엔진(Engine)**: 기능 단위 모듈. 예: `schedule`, `dictation`
- **데이터 세트(DataSet)**: 엔진이 사용하는 데이터 묶음(예: “우리집 일정”, “초등 단어 1”)
- **항목(Item)**: 데이터 세트 내부 개별 레코드(예: 일정 1개, 단어 1개)
- **브레인(Brain, Bundle)**: 여러 엔진 데이터 세트를 담은 JSON 패키지 (`HomiBundleV1`)
- **스토어(Store)**: localStorage에 저장되는 최상위 구조 (`StoreV1`)
- **팝업(Overlay/Popup)**: 홈 화면 위에 겹쳐 열리는 오버레이 UI(라우트로 제어)

---

## 3. 앱 구조 / UI 동작(절대 규칙)

### 3.1 라우트(고정)

- `/` : 기본 화면(얼굴 전체화면)
- `/engines/{engineId}` : 엔진 팝업 라우트
- `/backup` : 브레인 관리 팝업 라우트

> **MUST:** 엔진/백업 화면은 “팝업(오버레이)”로 열려야 한다.  
> 디자인은 자유지만 UX는 “홈 위에 겹쳐 열리는 구조”여야 한다.

### 3.2 홈 화면 고정 항목(MUST)

1. 얼굴(캐릭터)이 화면 중심에 표시되어야 한다.
2. 얼굴 주변에 상태 표시용 말풍선(버블)이 있어야 한다.
3. 현재 모드는 버블에 **반드시 텍스트로 표시**되어야 한다.
   - v1 허용 모드(고정): `기본 모드`, `받아쓰기 실행모드`
4. 엔진 설정 버튼(팝업 진입)은 항상 존재해야 한다.
5. 엔진 버튼은 “등록된 엔진 목록” 기반으로 렌더링되어야 한다.

### 3.3 화면 규칙(MUST)

- 글로벌 헤더/툴바/네비게이션 바를 사용하지 않는다.
- 사용 흐름은 “홈(얼굴) 중심 → 엔진/백업은 잠깐 열고 닫는 팝업”을 유지한다.

---

## 4. 로컬 저장소(Storage) SPEC

### 4.1 저장 방식(고정)

- 저장소: `localStorage`
- 키(고정): `homi.store.v1`
- 저장 단위: JSON 문자열(UTF-8)

### 4.2 StoreV1 (고정)

```json
{
  "storeVersion": 1,
  "updatedAt": "2026-03-06T00:00:00Z",
  "datasetsByEngine": {
    "schedule": [ { "...DataSetV1" } ],
    "dictation": [ { "...DataSetV1" } ]
  },
  "ui": {
    "lastOpenedEngineId": "schedule"
  }
}
````

* `storeVersion` MUST be `1`
* `updatedAt` MUST be ISO-8601 string
* `datasetsByEngine` MUST be `{ [engineId: string]: DataSetV1[] }`
* `ui` MAY exist (기능과 무관한 UI 상태 저장용)

  * `ui`는 브레인(Import/Export) 범위가 아니다(= 브레인으로 이동하지 않음)

### 4.3 저장 갱신 규칙(MUST)

* 데이터 세트/항목이 변경되면 `updatedAt`을 현재 시각으로 갱신한다.
* localStorage 저장 실패(쿼터 초과 등) 시 앱은 오류를 표시해야 한다(SHOULD).

---

## 5. DataSet 공통 SPEC (v1 고정)

### 5.1 DataSetV1

```json
{
  "id": "ds_xxx",
  "engineId": "dictation",
  "engineSchemaVersion": 1,
  "title": "초등 필수 단어 1",
  "items": [ { "...engine item..." } ],
  "createdAt": "2026-03-06T00:00:00Z",
  "updatedAt": "2026-03-06T00:00:00Z",
  "meta": { "tags": ["sample"], "description": "샘플" },
  "source": {
    "type": "sample",
    "importedAt": "2026-03-06T00:00:00Z",
    "bundleId": "bundle_sample_v1",
    "url": null,
    "originalDatasetId": "sample_ds_001"
  }
}
```

#### 필수 필드(MUST)

* `id`: string (앱 내부 고유값)

  * SHOULD: UUID/ULID 등 충돌 가능성이 낮은 값
* `engineId`: string
* `engineSchemaVersion`: number
* `title`: string
* `items`: array
* `createdAt`, `updatedAt`: ISO-8601 string

#### meta (선택)

* `meta`는 선택이며, 엔진은 모르는 필드를 무시해도 된다(MAY).
* **Schedule 엔진 전용 규칙(고정):**

  * `meta.enabled` (boolean)
  * `false`면 해당 데이터 세트 알림 비활성(MUST)
  * 미설정은 `true`로 간주(MUST)

#### source (선택, 추적용)

* `source`는 선택이나, Import로 생성된 데이터 세트는 SHOULD로 기록한다.
* `source.type` MUST be one of:

  * `manual` | `sample` | `url` | `file` | `text`
* `importedAt`, `bundleId`, `url`, `originalDatasetId`는 추적용이다.

---

## 6. 브레인(Brain) 포맷: HomiBundleV1 (고정)

### 6.1 HomiBundleV1

```json
{
  "format": "homi",
  "version": 1,
  "bundleType": "sample | import | backup",
  "bundleId": "bundle_sample_v1",
  "title": "브레인 샘플",
  "description": "엔진별 샘플",
  "createdAt": "2026-03-06T00:00:00Z",
  "datasets": [ { "...DataSetPayloadV1..." } ]
}
```

* `format` MUST be `"homi"`
* `version` MUST be `1`
* `bundleType` MUST be one of: `sample | import | backup`
* `datasets` MUST be array length >= 1
* `datasets`에는 엔진이 다른 데이터 세트가 섞여 있어도 된다(MAY). (v1에서 허용)

### 6.2 DataSetPayloadV1 (번들 내 데이터 세트)

* 번들 내에서는 `createdAt/updatedAt/source`를 생략해도 된다(MAY).
* `id`는 생략 가능(MAY). 생략 시 앱에서 새 ID를 생성해야 한다(MUST).
* 필수 필드(MUST):

  * `engineId`, `engineSchemaVersion`, `title`, `items`

예시:

```json
{
  "id": "sample_ds_001",
  "engineId": "dictation",
  "engineSchemaVersion": 1,
  "title": "초등 필수 단어 1",
  "meta": { "tags": ["beginner"] },
  "items": [ { "word": "apple", "meaning": "사과" } ]
}
```

---

## 7. Import/Export 정책 (v1 최종 고정)

### 7.1 입력 포인트(고정)

* Import 입력은 **오직 `/backup`에서만** 수행한다(MUST).

  * URL 입력 Import
  * JSON 텍스트 붙여넣기 Import
  * 로컬 파일 Import
* 엔진 화면(`/engines/{engineId}`)은 **데이터 세트 관리/실행 UI만** 제공한다(MUST).

  * 엔진 화면에 Import UI를 두지 않는다(MUST).

### 7.2 Import 공통 처리 순서(MUST)

Import는 항상 아래 순서로 처리한다.

1. **형식 검증**: 입력이 `HomiBundleV1`인지 검증
2. **미리보기**: 브레인 정보(제목/데이터 세트 수/엔진 목록)를 표시
3. **사용자 확정**: 버튼 `가져오기 확정` 클릭
4. **Replace(전체 교체)** 로 반영한다(MUST).

   * 기존 스토어의 `datasetsByEngine`는 모두 삭제 후,
   * Import된 데이터로 완전히 교체한다(MUST).
   * 병합/추가/부분 반영은 v1에서 금지(MUST).

> SHOULD: Replace는 파괴적 동작이므로, “기존 데이터가 모두 교체됨” 경고를 UI에 표시한다.

### 7.3 Import 변환 규칙(MUST)

Import된 `DataSetPayloadV1`는 로컬 저장을 위해 `DataSetV1`로 변환한다.

* `id`

  * payload에 `id`가 있으면 우선 사용(MUST)
  * 없으면 새 ID 생성(MUST)
* `createdAt`, `updatedAt`

  * Import 확정 시각을 사용(MUST)
* `source`

  * 입력 방식에 따라 type 기록(SHOULD)

    * URL: `url`
    * 파일: `file`
    * 텍스트 붙여넣기: `text`
    * 샘플 로드: `sample`
  * `bundleId`, `url`, `originalDatasetId`는 가능하면 기록(SHOULD)

### 7.4 URL Import 규칙(고정)

* 허용 URL:

  * MUST: `https://`만 허용
  * MAY: 개발 예외로 `http://localhost`만 허용
* MUST: `javascript:` 스킴 차단
* URL 응답은 JSON으로 파싱 가능해야 한다(MUST).
* 브라우저 fetch(CORS) 제약으로 실패할 수 있으며,

  * 이 경우 앱은 “가져올 수 없음(CORS/네트워크)” 오류를 표시해야 한다(SHOULD).

### 7.5 용량/안전치(고정, MUST)

Import 입력은 아래 제한을 넘으면 실패해야 한다.

* JSON 최대 2MB
* 데이터 세트 최대 50개
* 데이터 세트당 항목 최대 10,000개
* 문자열 최대 10,000자

> SHOULD: 제한 초과 시 어떤 제한을 넘었는지 사용자에게 표시한다.

### 7.6 Export 규칙(고정)

* Export 결과물은 항상 `HomiBundleV1`로 생성한다(MUST).
* `bundleType`은 `backup`을 사용한다(SHOULD).
* Export는 `/backup`에서 수행한다(SHOULD).
* Export는 현재 Store의 `datasetsByEngine` 전체를 브레인으로 변환한다(MUST).

---

## 8. 엔진별 Item 스키마 (v1 고정)

### 8.1 공통 규칙(MUST)

* Item은 JSON object여야 한다.
* 엔진은 미지의 필드를 무시할 수 있다(MAY).
* 저장/Export 시 미지의 필드는 SHOULD로 보존한다(데이터 유실 방지).

> v1에서는 “스키마 검증”을 완전 강제하지 않아도 되지만,
> 최소한 “object 여부”와 “크기 제한”은 지켜야 한다(MUST).

---

### 8.2 Schedule 엔진 (고정)

* `engineId`: `schedule`
* `engineSchemaVersion`: `1`

```json
{
  "date": "2026-03-06",
  "title": "병원",
  "timeStart": "10:30",
  "timeEnd": "11:00",
  "notes": "접수 10분 전",
  "tags": ["가족"],
  "repeatIntervalSec": 60
}
```

* `date` MUST be `YYYY-MM-DD`
* `title` MUST be string
* `timeStart`, `timeEnd` MAY be `HH:MM` (24h)
* `notes` MAY be string
* `tags` MAY be string[]
* `repeatIntervalSec` MAY be number (초 단위)

  * 존재 시 반복 알림 대상
  * 미존재 시 알림 대상 아님

---

### 8.3 Dictation 엔진 (고정)

* `engineId`: `dictation`
* `engineSchemaVersion`: `1`

```json
{
  "word": "apple",
  "meaning": "사과",
  "hint": "과일",
  "example": "I ate an apple.",
  "audioUrl": "https://example.com/audio/apple.mp3"
}
```

* `word` MUST be string
* `meaning`, `hint`, `example`, `audioUrl` MAY exist
* `audioUrl` SHOULD be `https://` (외부 요청이 발생함)

---

## 9. 엔진 실행 규칙(게임 동작 고정)

### 9.1 앱 모드(고정)

* v1의 앱 모드는 아래 2개만 존재(MUST)

  * `기본 모드`
  * `받아쓰기 실행모드`

* 현재 모드는 홈 화면 말풍선에 항상 표시(MUST)

### 9.2 Dictation 실행(고정)

#### 실행 진입(MUST)

* 사용자는 `dictation` 엔진 팝업(`/engines/dictation`)에서 데이터 세트를 선택하고 실행한다.
* 실행이 시작되면 앱 모드는 `받아쓰기 실행모드`가 된다(MUST).

#### 진행 규칙(MUST)

* 항목 순서: 데이터 세트 `items`의 **배열 순서 그대로** 진행한다(MUST). (셔플 없음)
* 자동 진행 간격: **10초**로 고정(MUST)
* `Next` 버튼: 즉시 다음 항목으로 이동(MUST)
* 화면 표시: 진행 인덱스/총 항목 수를 표시(MUST)

#### 발화(읽기) 규칙(MUST)

* 모드 A: `한글쓰기(영어 발화)`

  * 발화 텍스트 = 현재 항목의 `word` (MUST)
* 모드 B: `영어쓰기(한국어 발화)`

  * 발화 텍스트 우선순위(MUST):

    1. `meaning`
    2. `hint`
    3. `word`

> “발화”는 브라우저의 TTS(Web Speech API 등)를 의미한다.
> TTS가 불가능한 환경에서는 발화 대신 화면 텍스트 안내로 대체할 수 있다(SHOULD).

#### 종료 규칙(MUST)

* 나가기 버튼으로 즉시 종료 가능(MUST)
* 마지막 항목 완료 시 자동 종료(MUST)
* 종료 시 앱 모드는 `기본 모드`로 돌아간다(MUST)

### 9.3 Schedule 알림(고정)

#### 대상(MUST)

* `meta.enabled !== false` 인 데이터 세트만 알림 대상이다(MUST).
* 항목에 `repeatIntervalSec`가 존재하는 경우에만 반복 알림 대상이다(MUST).

#### 동작 범위(MUST)

* 스케줄 알림은 앱이 실행(열려 있음) 중일 때만 동작한다(MUST).
* v1의 스케줄은 “정교한 캘린더/시간표”가 아니라,

  * **반복 간격 기반의 리듬 알림**에 초점을 둔다.

#### 알림 출력 규칙(MUST)

* 받아쓰기 실행 중(`받아쓰기 실행모드`)에는:

  * 스케줄 알림이 사용자의 흐름을 **강제 인터럽트하지 않는다(MUST)**.
  * OS Notification 대신 말풍선/토스트 안내로만 표시한다(MUST).
* 받아쓰기 실행 중이 아닐 때는:

  * 브라우저 Notification 권한이 있으면 OS 알림을 사용할 수 있다(MAY).
  * 권한이 없거나 실패하면 말풍선/토스트로 안내한다(SHOULD).

---

## 10. 샘플 뇌(고정)

* 샘플 파일 경로(고정): `public/samples/homi.sample.homi.json`
* 샘플 로드는 `/backup`에서 수행한다(MUST).
* 샘플 로드도 Import와 동일하게

  * 검증 → 미리보기 → 가져오기 확정 → Replace(전체 교체)
    를 따른다(MUST).

---

## 11. 보안/안전 (v1 고정)

* 외부 입력(URL/텍스트/파일)은 신뢰되지 않은 데이터로 간주(MUST)
* 화면 렌더링은 텍스트로만 처리(MUST)

  * HTML 주입/스크립트 실행 금지
* `javascript:` URL 차단(MUST)
* 오디오/이미지 URL 실행 시 외부 요청이 발생할 수 있음을 사용자에게 안내(SHOULD)
* Notification은 사용자 권한 동의가 필요함을 안내(SHOULD)

---

## 12. 호환성/확장 규칙 (v1 범위)

### 12.1 엔진 확장에 대한 저장 호환성

* `engineId`는 string이므로 v1 스토어 구조는 엔진 추가에 대해 구조적으로 확장 가능하다.
* v1 앱은 실행 가능한 엔진이 `schedule`, `dictation`뿐이다(MUST).

  * 그 외 `engineId` 데이터 세트가 Import되어도,

    * 스토어에는 보관될 수 있다(MAY),
    * UI에서 실행/편집이 제한될 수 있다(MAY).
  * 단, Export 시에는 데이터 손실 없이 다시 번들로 내보내야 한다(SHOULD).

### 12.2 스키마 버전

* `HomiBundleV1.version`은 반드시 1(MUST)
* 엔진별 `engineSchemaVersion`은 number이며,

  * v1의 `schedule`, `dictation`은 `1`로 고정(MUST)

---

## 13. (선택) 오류 코드 권장(SHOULD)

v1에서 오류 표준화는 MAY이나, 아래 코드 사용을 권장한다.

* `HOMI_ERR_INVALID_BUNDLE` : 번들 포맷/버전 불일치
* `HOMI_ERR_INVALID_URL` : URL 스킴/형식 불일치
* `HOMI_ERR_FETCH_FAILED` : 네트워크/CORS/HTTP 오류
* `HOMI_ERR_TOO_LARGE` : 2MB 제한 초과
* `HOMI_ERR_TOO_MANY_DATASETS` : 데이터 세트 개수 제한 초과
* `HOMI_ERR_TOO_MANY_ITEMS` : 항목 수 제한 초과
* `HOMI_ERR_STRING_TOO_LONG` : 문자열 길이 제한 초과
* `HOMI_ERR_STORAGE_FAILED` : localStorage 저장 실패(쿼터 등)

---

