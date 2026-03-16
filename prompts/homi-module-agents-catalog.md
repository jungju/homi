# Homi Module Agents Catalog

이 문서는 `prompts/` 아래에 추가한 모듈 전담 에이전트 프롬프트의 빠른 안내서다. 비권위 문서이며, 실제 계약은 여전히 `docs/machine/*` 와 `schemas/domain/*` 이다.

## Agents

### `homi-home-shell-agent`
- 담당: `src/App.svelte`, `src/app.css`, `src/lib/components/*`, `route/clock/face/message` 상태
- 적합한 일: 화면 조립, 오버레이 UX, 라우팅, 스타일, 접근성

### `homi-contract-runtime-agent`
- 담당: `src/lib/homi.ts`, `src/lib/runtime.ts`, `src/lib/state/app.svelte.ts`
- 적합한 일: store 계약, persistence, runtime adapter, 브라우저 의존성 경계

### `homi-import-brain-agent`
- 담당: `src/lib/import-core.ts`, `src/lib/state/import.svelte.ts`, `prompts/homi-brain-json-generator.prompt.md`
- 적합한 일: import/export, brain overlay, 공유 링크, import validation

### `homi-schedule-agent`
- 담당: `src/lib/engines/schedule-core.ts`, `src/lib/state/schedule.svelte.ts`
- 적합한 일: 반복 일정, quiet mode, reminder, hourly chime, preview metadata

### `homi-dictation-agent`
- 담당: `src/lib/engines/dictation-core.ts`, `src/lib/state/dictation.svelte.ts`
- 적합한 일: 받아쓰기 세션 전이, auto advance, speech payload, runner 상태

### `homi-qa-contract-agent`
- 담당: `docs/machine/*`, `schemas/*`, `scripts/*`, `tests/*`, QA 설정
- 적합한 일: authoritative contract 정렬, schema, fixture, validator, test harness

## Suggested Usage

- 작업 라우팅이 먼저 필요하면 `prompts/homi-module-router.prompt.md`
- 실제 `spawn_agent` 복붙 템플릿이 필요하면 `prompts/homi-spawn-agent-templates.md`
- UI만 바꾸면 `homi-home-shell-agent`
- import와 store가 함께 바뀌면 `homi-import-brain-agent` + `homi-contract-runtime-agent`
- 엔진 규칙 변경이면 `homi-schedule-agent` 또는 `homi-dictation-agent`
- contract까지 바뀌면 항상 `homi-qa-contract-agent`를 같이 붙인다
