# Homi

Homi는 집 안에서 멀리서도 읽히는 큰 홈 화면을 중심으로 동작하는 정적 웹앱입니다.  
현재는 `schedule`과 `dictation` 두 엔진을 관리하고, 브레인 JSON을 가져와 로컬에 저장하며, 홈 화면에서 큰 상태 UI로 보여주는 데 초점을 두고 있습니다.

- 저장 방식: 브라우저 `localStorage`
- 앱 형태: backend 없는 static webapp
- 주요 route:
  - `/`: 홈 얼굴 화면
  - `/engines/{engineId}`: 엔진 설정 overlay
  - `/brain`: 브레인 설정 및 import overlay

## 제품 목적

Homi의 목적은 집 안 홈 화면에서 가족 구성원이 함께 보면 좋은 공통 정보를 상시로 보여주는 것입니다.

지금 기준으로는 거창한 개인 비서보다, 가족이 같이 보는 생활형 알림 화면에 가깝습니다.  
해야 할 일을 딱딱하게 통보하기보다, 친한 말투로 사소한 이야기를 건네듯 알려주는 방향을 지향합니다.

예를 들면 이런 종류의 메시지입니다.

- "이제는 슬슬 나갈 준비해야지"
- "잠잘 시간이야. 이 닦고 얼굴 씻고 잘 준비 하자. 내일 가방 싸는 거 잊지 마"

즉, 일정 알림만 띄우는 화면이 아니라, 조금은 잔소리 같더라도 가족에게 도움이 되는 생활 리마인더를 친근하게 전달하는 홈 디스플레이를 목표로 합니다.

## 현재 구현 상태

Homi는 지금 아래 기능을 중심으로 동작합니다.

- 홈 화면 3x3 control grid 기반의 얼굴형 UI
- 큰 말풍선, 큰 상태 텍스트, 큰 시계 표시
- `schedule` 자료 세트 관리와 알림 처리
- `dictation` 자료 세트 관리와 홈 화면 실행 모드 전환
- 브레인 JSON import
  - URL 가져오기
  - 텍스트로 가져오기
  - 파일로 가져오기
  - 샘플 가져오기
- URL로 전체 브레인을 연결했을 때 주기적 변경 확인 및 자동 갱신
- 마지막으로 저장한 brain JSON URL 유지
- 30분 조용히 모드
- 홈 말풍선/상태 문구를 통한 공통 알림 노출

현재 받아쓰기는 앱 내부 흐름과 UI 제어 중심입니다. 즉, 학습용 문장을 순서대로 진행하고 홈 화면에서 실행 상태를 보여주지만, 아직 실제 음성 인식(STT)으로 사용자의 발화를 직접 판정하는 단계는 아닙니다.

## 로드맵

아래는 현재 계약 문서가 아니라 제품 방향을 설명하는 로드맵입니다.

- 실제 음성 인식(STT) 도입
  - 지금의 10초 자동 진행 기반 받아쓰기 흐름을 넘어서, 사용자의 실제 발화를 받아 입력으로 처리하는 방향을 목표로 합니다.
  - 장기적으로는 음성 입력, 정답 비교, 학습 피드백까지 이어지는 받아쓰기 경험을 만들 계획입니다.
- 받아쓰기 엔진 고도화
  - 진행 제어뿐 아니라 정답 판정, 오답 복습, 난이도 조절 같은 학습 기능 확장
- 브레인 동기화 개선
  - URL 기반 브레인 업데이트 상태를 더 명확하게 보여주고, 원격 변경 관리 경험을 다듬는 방향
- 홈 화면 상호작용 강화
  - 큰 글자와 원거리 가시성은 유지하면서, 알림/상태/실행 전환의 읽기 흐름을 더 매끄럽게 개선

## 빠른 시작

### 개발 서버 실행

```bash
npm install
npm run dev
```

기본 개발 서버는 Vite를 사용합니다.

### 빌드

```bash
npm run build
```

`prebuild` 단계에서 `public/version.json`이 생성됩니다.

## 주요 스크립트

```bash
npm run check
npm run validate:machine-docs
npm run validate:domain-schemas
npm run qa:contract
npm run qa:smoke
npm run qa:ai-review
npm run qa:gate
```

간단한 용도별 설명:

- `npm run check`: Svelte/TypeScript 정적 검사
- `npm run validate:machine-docs`: machine docs 스키마 검증
- `npm run validate:domain-schemas`: domain schema 검증
- `npm run qa:contract`: 계약 기반 문서/그래프 생성 포함 검증
- `npm run qa:smoke`: Playwright E2E 실행
- `npm run qa:ai-review`: AI 기반 UI 리뷰 실행
- `npm run qa:gate`: 계약 검증 + 스모크 + AI 리뷰를 한 번에 실행

## 데이터와 저장 방식

- 영속 저장 키: `homi.store.v1`
- 저장소 타입: `HomiStoreV1`
- 브레인 번들 스키마: `schemas/domain/homi-bundle.v1.schema.json`
- 샘플 브레인 파일: `public/samples/homi.sample.homi.json`

브레인 가져오기는 항상 검증과 미리보기를 거친 뒤, 사용자가 확인해야 실제 저장됩니다.  
전체 URL 번들을 가져온 경우에는 해당 URL과 연결된 상태를 기억하고, 이후 변경 여부를 주기적으로 확인할 수 있습니다.

## 저장소 구조

- `src/`: Svelte 앱 소스
- `public/`: 정적 리소스와 샘플 브레인 JSON
- `schemas/domain/`: 실제 저장 데이터와 엔진 데이터 스키마
- `schemas/machine/`: machine docs 스키마
- `docs/spec.md`: Codex용 문서 탐색 진입점(authoritative 아님)
- `docs/machine/`: authoritative contract 문서
- `docs/legacy/`: 참고용 구 문서
- `tests/e2e/`: Playwright E2E
- `scripts/`: 검증, 그래프 생성, UI 히스토리, 릴리즈 후처리 스크립트

## Contract Governance (Machine-First)

이 저장소의 제품/테스트/QA/AI 리뷰 계약은 사람이 읽는 Markdown이 아니라 machine docs가 기준입니다.

- Authoritative root: `docs/machine/manifest.v1.yaml`
- Codex navigation: `docs/spec.md` (not authoritative)
- Truth order: `docs/machine/truth-order.v1.yaml`
- Task read sets: `docs/machine/read-sets.v1.yaml`
- Product contract: `docs/machine/product.v1.yaml`
- UI contract: `docs/machine/ui.v1.yaml`
- Flow contract: `docs/machine/flows.v1.yaml`
- Test registry: `docs/machine/tests.v1.yaml`
- Machine schemas: `schemas/machine/*.schema.json`
- Domain schemas: `schemas/domain/*.schema.json`

`README.md`는 사람을 위한 안내 문서이며 source of truth가 아닙니다.

## 배포

- `main` 브랜치 push 시 `.github/workflows/deploy-pages.yml`이 GitHub Pages에 배포합니다.
- 수동 재배포가 필요하면 `gh workflow run deploy-pages.yml --ref main`을 실행합니다.
- 로컬에서 `gh-pages` 브랜치로 직접 publish하지 않습니다.
- release 발행 시 별도 workflow가 UI 캡처를 생성해 release notes를 보강합니다.

## Legacy Docs

기존 Markdown 문서는 `docs/legacy/`로 격리되어 있으며 authoritative로 취급하지 않습니다.

## License

Source code in this repository is licensed under the [MIT License](LICENSE).

Non-code assets, including text content, images, photos, videos, audio, service
names, logos, and brand materials, are not covered by the MIT License. See
[ASSET-LICENSE.md](ASSET-LICENSE.md).
