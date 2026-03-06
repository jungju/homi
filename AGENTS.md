# AGENTS.md for homi

## 프로젝트 개요
- `homi`는 정적 웹앱(SSG)이며 서버/DB 없이 동작합니다.
- `v1` 목표는 엔진/자료 세트 기반 데이터 관리, Import/Export, 브라우저 전용 영속성입니다.
- 현재 엔진: `schedule`, `dictation`

## 핵심 디렉터리
- `src/main.ts`: 앱 마운트 진입점.
- `src/App.svelte`: 라우팅(`/`, `/engines/{engineId}`, `/backup`) 및 UI.
- `src/lib/homi.ts`: `HomiStoreV1`, `HomiBundleV1`, 데이터셋 CRUD, Import/Export, 검증 유틸.
- `public/samples/*.homi.json`: 엔진 샘플 번들.
- `.github/workflows/deploy-pages.yml`: GitHub Pages 배포.

## 실행 환경
- Node: `.nvmrc` 기준
- 주요 스크립트:
  - `pnpm install`
  - `pnpm dev`
  - `pnpm build`
  - `pnpm check`(선택)

## 스토어 규칙
- 단일 localStorage 키: `homi.store.v1`
- 저장 데이터 타입: `HomiStoreV1`
- 저장/로드는 `loadStore` / `saveStore`를 경유할 것.
- localStorage 파싱 실패, 스키마 불일치, 손상 시 빈 스토어로 복구.

## 구현 규칙
1. Import/Export는 항상 번들 단위를 기반으로 처리.
2. URL 및 파일 Import는 자동 저장을 하지 않고, 미리보기 후 사용자 확정 저장.
3. Import 시 필드 스펙과 제한을 준수(파일 크기/세트 수/항목 수/문자열 길이 기본 제한).
4. 엔진 항목 스키마를 우선 검증하되, 임의 필드는 보존(향후 확장 대응).
5. 충돌된 데이터셋 ID는 v1 정책상 새 ID 생성으로 Add 처리.

## 보안 주의
- URL Import은 원격 호출이므로 사용자에게 사전 안내.
- `javascript:` 등 위험한 스킴은 차단.
- CORS 실패는 사용자에게 명시적 메시지로 처리.
- 데이터 표시 시 텍스트로 렌더링, HTML 파싱 없음.

## 검토 포인트
- 라우팅 변경 시 `route` 해석과 이동 처리 일관성 유지.
- import preview에서 선택 가능한 engine mismatch 처리.
- export/import 파일 포맷(`HomiBundleV1`) 변경 시 `SPEC` 동기화.
- sample 번들 추가/수정 시 포맷 검증과 파일 경로 확인.
