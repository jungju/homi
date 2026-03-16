# Homi Spawn Agent Templates

이 문서는 homi 전담 프롬프트를 실제 `spawn_agent` 흐름에 연결할 때 쓰는 비권위 템플릿 모음이다. 실제 계약은 여전히 `docs/machine/*` 와 `schemas/domain/*` 이다.

## 기본 원칙

- 구현 작업의 기본 역할은 `executor`
- 작업 라우팅은 `planner`
- 버그 원인 분석은 `debugger`
- 최종 검증은 `verifier`
- 같은 파일을 동시에 수정하지 않게 lead/support의 소유 범위를 분리

## 1. 라우터 먼저 태우기

작업이 어느 모듈인지 애매할 때:

```json
{
  "agent_type": "planner",
  "fork_context": true,
  "message": "Read c:/Users/jeong/.openclaw/workspace/homi/prompts/homi-module-router.prompt.md first. Route this homi task to the best module agent.\n\nTask: <여기에 사용자 작업>\n\nReturn only:\nLead: ...\nSupport: ...\nWhy: ...\nRead First:\n- ...\nVerify:\n- ..."
}
```

## 2. 홈 셸 담당 에이전트

홈 화면, 오버레이, 컴포넌트, 스타일, 라우팅 UX:

```json
{
  "agent_type": "executor",
  "fork_context": true,
  "message": "Read c:/Users/jeong/.openclaw/workspace/homi/prompts/homi-home-shell-agent.prompt.md first. You are the lead module owner for this task.\n\nTask: <여기에 작업>\n\nWrite scope:\n- src/App.svelte\n- src/app.css\n- src/lib/components/*\n- src/lib/state/route.svelte.ts\n- src/lib/state/clock.svelte.ts\n- src/lib/state/face.svelte.ts\n- src/lib/state/message.svelte.ts\n\nDo not redesign store/import/engine contracts unless strictly needed. Report changed files and verification evidence."
}
```

## 3. 계약/런타임 담당 에이전트

스토어, persistence, runtime adapter, 브라우저 의존성 경계:

```json
{
  "agent_type": "executor",
  "fork_context": true,
  "message": "Read c:/Users/jeong/.openclaw/workspace/homi/prompts/homi-contract-runtime-agent.prompt.md first. You are the lead module owner for this task.\n\nTask: <여기에 작업>\n\nWrite scope:\n- src/lib/homi.ts\n- src/lib/runtime.ts\n- src/lib/state/app.svelte.ts\n- tests/unit/homi.spec.ts\n- tests/unit/runtime.spec.ts\n\nPreserve store compatibility unless the task explicitly changes contract. Report compatibility risks, changed files, and verification evidence."
}
```

## 4. Import / Brain 담당 에이전트

import/export, backup overlay, shared import, generator prompt:

```json
{
  "agent_type": "executor",
  "fork_context": true,
  "message": "Read c:/Users/jeong/.openclaw/workspace/homi/prompts/homi-import-brain-agent.prompt.md first. You are the lead module owner for this task.\n\nTask: <여기에 작업>\n\nWrite scope:\n- src/lib/import-core.ts\n- src/lib/state/import.svelte.ts\n- prompts/homi-brain-json-generator.prompt.md\n- tests/unit/import-core.spec.ts\n- tests/fixtures/bundle*.json\n\nKeep import validation and preview/import/export flows aligned with the authoritative contracts. Report affected source types, changed files, and verification evidence."
}
```

## 5. Schedule 담당 에이전트

quiet mode, reminder, chime, preview, 반복 규칙:

```json
{
  "agent_type": "executor",
  "fork_context": true,
  "message": "Read c:/Users/jeong/.openclaw/workspace/homi/prompts/homi-schedule-agent.prompt.md first. You are the lead module owner for this task.\n\nTask: <여기에 작업>\n\nWrite scope:\n- src/lib/engines/schedule-core.ts\n- src/lib/state/schedule.svelte.ts\n- tests/unit/schedule-core.spec.ts\n\nKeep recurrence/reminder logic in the pure core when possible. Report rule changes, changed files, and verification evidence."
}
```

## 6. Dictation 담당 에이전트

세션 전이, auto advance, speech payload, runner 상태:

```json
{
  "agent_type": "executor",
  "fork_context": true,
  "message": "Read c:/Users/jeong/.openclaw/workspace/homi/prompts/homi-dictation-agent.prompt.md first. You are the lead module owner for this task.\n\nTask: <여기에 작업>\n\nWrite scope:\n- src/lib/engines/dictation-core.ts\n- src/lib/state/dictation.svelte.ts\n- tests/unit/dictation-core.spec.ts\n\nKeep session transitions deterministic and keep timers/effects out of the pure core. Report transition changes, changed files, and verification evidence."
}
```

## 7. QA / Contract 담당 에이전트

machine docs, schemas, fixtures, validators, harness:

```json
{
  "agent_type": "verifier",
  "fork_context": true,
  "message": "Read c:/Users/jeong/.openclaw/workspace/homi/prompts/homi-qa-contract-agent.prompt.md first. Validate this task against homi's authoritative contracts.\n\nTask: <여기에 작업>\n\nFocus on:\n- docs/machine alignment\n- schema consistency\n- fixture/test coverage\n- required verification commands\n\nReturn findings first, then required fixes or missing evidence."
}
```

## 8. 자주 쓰는 2-에이전트 플로우

### UI + Schedule

- Lead: `homi-home-shell-agent`
- Support: `homi-schedule-agent`

```json
[
  {
    "agent_type": "executor",
    "fork_context": true,
    "message": "Read c:/Users/jeong/.openclaw/workspace/homi/prompts/homi-home-shell-agent.prompt.md first. Lead the task.\nTask: <여기에 작업>\nWrite scope: src/App.svelte, src/app.css, src/lib/components/*"
  },
  {
    "agent_type": "executor",
    "fork_context": true,
    "message": "Read c:/Users/jeong/.openclaw/workspace/homi/prompts/homi-schedule-agent.prompt.md first. Support the task without touching UI layout files unless necessary.\nTask: <여기에 작업>\nWrite scope: src/lib/engines/schedule-core.ts, src/lib/state/schedule.svelte.ts, tests/unit/schedule-core.spec.ts"
  }
]
```

### Import + Store 계약

- Lead: `homi-import-brain-agent`
- Support: `homi-contract-runtime-agent`

```json
[
  {
    "agent_type": "executor",
    "fork_context": true,
    "message": "Read c:/Users/jeong/.openclaw/workspace/homi/prompts/homi-import-brain-agent.prompt.md first. Lead the task.\nTask: <여기에 작업>\nWrite scope: src/lib/import-core.ts, src/lib/state/import.svelte.ts, tests/unit/import-core.spec.ts"
  },
  {
    "agent_type": "executor",
    "fork_context": true,
    "message": "Read c:/Users/jeong/.openclaw/workspace/homi/prompts/homi-contract-runtime-agent.prompt.md first. Support the task on persistence/runtime boundaries only.\nTask: <여기에 작업>\nWrite scope: src/lib/homi.ts, src/lib/runtime.ts, src/lib/state/app.svelte.ts, tests/unit/homi.spec.ts, tests/unit/runtime.spec.ts"
  }
]
```

### 엔진 변경 + 계약 검증

- Lead: `homi-schedule-agent` 또는 `homi-dictation-agent`
- Support: `homi-qa-contract-agent`

```json
[
  {
    "agent_type": "executor",
    "fork_context": true,
    "message": "Read c:/Users/jeong/.openclaw/workspace/homi/prompts/homi-schedule-agent.prompt.md first. Lead the task.\nTask: <여기에 작업>"
  },
  {
    "agent_type": "verifier",
    "fork_context": true,
    "message": "Read c:/Users/jeong/.openclaw/workspace/homi/prompts/homi-qa-contract-agent.prompt.md first. Verify whether the task requires machine-doc, schema, fixture, or test updates.\nTask: <여기에 작업>"
  }
]
```

## 9. 이미 띄운 에이전트에 방향 수정 보내기

```json
{
  "id": "<agent-id>",
  "interrupt": true,
  "message": "Narrow the task to this scope only:\n- <파일/책임>\nDo not edit other modules.\nBefore finishing, report changed files, tests run, and remaining risks."
}
```

## 10. 추천 운영 순서

1. 애매하면 라우터를 먼저 띄운다.
2. 구현은 해당 모듈 `executor` 에이전트가 맡는다.
3. 계약/테스트 영향이 있으면 `homi-qa-contract-agent`를 같이 태운다.
4. write scope가 겹치면 support agent를 줄이고 lead 하나로 정리한다.
5. 결과를 합칠 때는 changed files, verification, remaining risks 세 줄만 먼저 확인한다.
