# Homi v1 제품/데이터 SPEC (v1.0 Fixed)

## 0. 목표와 비목표

### 목표

* SSG 정적 웹앱(SPA)로 배포 (`server/API 없음`)
* 기능 단위인 **엔진**을 추가 가능
* 사용자 데이터(자료 세트)는 브라우저(localStorage)에서만 보관
* 샘플 뇌(`homi.sample.homi.json`) 1개 포함
* 신뢰되지 않은 외부 입력은 검증 후 Import

### 비목표(v1)

* 회원가입/로그인, 서버 동기화, 다중 디바이스 자동 동기화
* 실시간 협업
* URL 자동 동기화/구독

---

## 1. 용어

* **엔진(Engine)**: 기능 단위 모듈 (`schedule`, `dictation`)
* **데이터 세트(DataSet)**: 엔진이 사용하는 데이터 묶음
* **항목(Item)**: 데이터 세트 내부 개별 레코드
* **브레인(Brain, Bundle)**: 여러 엔진 데이터 세트를 담은 JSON 패키지

---

## 2. 앱 구조(동작 고정)

### 페이지

* `/` : 기본 화면(얼굴 전체화면)
* `/engines/{engineId}` : 엔진 팝업 라우트
* `/backup` : 브레인 설정 팝업 라우트

### 기본 화면 고정 항목

1. 얼굴이 화면 중심에 표시된다.
2. 얼굴 주변에 대화상자(버블)가 떠 현재 상태를 보여준다.
3. 현재 모드는 반드시 텍스트로 표시한다.
   * 기본 모드
   * 받아쓰기 실행모드(받아쓰기 게임이 실행 중)
4. 엔진 설정 버튼이 항상 존재한다.
5. 엔진 버튼은 등록된 엔진 목록을 기준으로 렌더링되어 확장 가능하다.

### 화면 규칙

* 기본 화면은 홈 캐릭터 얼굴이 전체를 채움
* 홈/엔진 실행 진입은 모두 팝업 방식
* 글로벌 헤더/툴바 없음

### 라우팅 정리

* `/engines/{engineId}`는 엔진 목록/데이터 세트 편집/실행 UI
* `/backup`은 브레인 Import/Export/샘플 로드 전용
* 엔진 페이지에 URL/file Import 기능은 두지 않음.
* 샘플/URL/파일 Import는 모두 `/backup`에서만 실행

---

## 3. 로컬 저장소(Storage) SPEC

### 3.1 저장 방식

* 키: `homi.store.v1` (단일 키 고정)
* 엔진별 분리된 구조는 `datasetsByEngine`로 표현

### 3.2 StoreV1

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
```

* `storeVersion`: `1` (고정)
* `updatedAt`: ISO-8601 문자열
* `datasetsByEngine`: `{ [engineId]: DataSetV1[] }`

---

## 4. DataSet 공통 SPEC

## 4.1 DataSetV1

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

### 필수 필드

* `id`: 문자열, 앱 내부 고유값
* `engineId`: `schedule | dictation`
* `engineSchemaVersion`: 엔진 스키마 버전
* `title`, `items`, `createdAt`, `updatedAt`

### meta

* 선택 필드. 엔진에서 무시 가능
* 스케줄 엔진 전용: `enabled` (boolean) 사용 가능
  * 사용 안 함 = `false`
  * 미설정은 `true`로 간주

### source

* `type`: `manual | sample | url | file`
* `importedAt`, `bundleId`, `url`, `originalDatasetId`는 추적용

---

## 5. Import/Export 정책 (v1 최종)

### 5.1 HomiBrain 입력 포인트

* `/backup`에서만 아래 입력을 받음
  * URL 입력
  * JSON 텍스트 붙여넣기
  * 로컬 파일 import
* 엔진 화면(`/engines/{engineId}`)에서는 **데이터 입력/실행/관리만 제공**

### 5.2 공통 처리 규칙

1. 형식 검증
2. 미리보기(브레인 내 총 데이터셋/엔진 목록)
3. 사용자 확정 버튼(`가져오기 확정`) 클릭 후 반영
4. Import는 기존 데이터 전체 삭제 후 교체
   * 선택 항목만 병합/추가하지 않음(Replace)

### 5.3 URL 허용

* v1 기본: `https://`만 허용
* 개발 예외: `http://localhost` 허용
* `javascript:` 스킴 차단

### 5.4 용량/안전치

* JSON 최대 2MB
* 데이터 세트 최대 50개
* 항목 최대 10,000개
* 문자열 최대 10,000자

---

## 6. HomiBundleV1

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

* `datasets` 배열에 엔진이 다른 항목이 섞여 있어도 됨(현재 규격상 허용)
* `bundleType`:
  * `sample`: 기본 샘플
  * `import`: URL/파일로 가져오는 공유 뇌
  * `backup`: 사용자가 Export한 백업

### DataSetPayloadV1

* 번들 내에서 `createdAt/updatedAt/source` 생략 가능
* `id`는 생략 가능(생략 시 앱에서 새 ID 생성)

---

## 7. 엔진별 스키마

### 7.1 공통 규칙

* Item은 JSON object
* 엔진은 미지의 필드 무시 가능
* 저장/Export 시 미지의 필드는 보존 권장

### 7.2 Schedule 엔진 (`engineId: schedule`, `engineSchemaVersion: 1`)

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

* `repeatIntervalSec`: 간격 알림(초)

### 7.3 받아쓰기 엔진 (`engineId: dictation`, `engineSchemaVersion: 1`)

```json
{
  "word": "apple",
  "meaning": "사과",
  "hint": "과일",
  "example": "I ate an apple.",
  "audioUrl": "https://example.com/audio/apple.mp3"
}
```

* `word`: 필수
* `meaning`, `hint`, `example`, `audioUrl`: 선택

### 7.4 엔진 실행 규칙

* 받아쓰기 실행 화면:
  * 데이터 세트 클릭으로 선택
  * 모드: `한글쓰기(영어 발화)` / `영어쓰기(한국어 발화)`
  * 시작 후 기본 10초 간격 자동 진행
  * `Next` 버튼으로 즉시 다음 항목 진행
  * 모드에 따라 `word`/`meaning`을 발음

---

## 8. 운영 규칙

* 스케줄 알림은 앱이 실행 중인 일정에서만 동작
* 스케줄 세트는 `meta.enabled`로 사용/사용안함 토글
* 스케줄 알림이 발생해도 받아쓰기 게임 진행 중이면 음성 알림 대신 메시지 토스트로만 안내

---

## 9. 보안/안전

* 외부 입력은 신뢰되지 않은 데이터로 간주
* 화면 렌더링은 텍스트로만 처리
* 오디오 URL/이미지 URL 실행 시 외부 요청 발생 가능성 사용자 안내
* 브라우저 알림은 권한 동의 필요

---

## 10. Export/Import 파일

### Export

* 모두 `HomiBundleV1`로 생성
* `bundleType`은 기본적으로 `backup`

### Import

* URL/텍스트/파일 입력은 동일한 번들 검증 경로 사용
* `source.type`은 `url` 또는 `file`/`text`(구현상 file source로 기록)로 기록
