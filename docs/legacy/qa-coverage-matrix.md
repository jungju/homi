---
docId: qa-coverage-matrix
kind: qa-coverage-matrix
audience: machine
status: active
machineReadable: true
contractVersion: v1
lastUpdated: "2026-03-06"
dependencies:
  - docs/machine/coverage-matrix.v1.yaml
  - docs/machine/manifest.yaml
  - docs/qa-automation.md
  - docs/UI_TESTS.md
  - tests/qa-homi.spec.ts
  - contracts/ui-contract.v1.yaml
---

# Homi v1 QA Coverage Matrix (Machine Registry)

registry:
  source: docs/machine/coverage-matrix.v1.yaml
  scope:
    version: v1
    target: P0
    p0:
      total: 14
      covered: 0
      partial: 6
      gap: 8
    p1: 0
  status: gate_pending

syncPolicy:
  sourceOfTruth:
    yaml: docs/machine/coverage-matrix.v1.yaml
    thisDoc: generated_projection
  requiredUpdates:
    - docs/machine/coverage-matrix.v1.yaml
    - docs/qa-automation.md
    - docs/UI_TESTS.md
    - tests
  allowedChanges:
    - tests-only: false
    - contractOnly: false

coverageRows:
  - id: UI-ROUTE-001
    contract: 기본 진입 홈 라우트/전체화면 표시 계약
    status:
      summary: partial
      p0: partial
    source:
      docs: ["README", "SPEC 3.1"]
      dom: ["home-root", "home-face"]
      links: ["docs/UI_TESTS.md:UI-HOME-001", "docs/qa-automation.md:TC-P0-001", "tests/qa-homi.spec.ts:home"]

  - id: UI-HOME-001
    contract: 말풍선 모드 텍스트 상시 표시 계약
    status:
      summary: partial
      p0: partial
    source:
      docs: ["README 3.2", "SPEC 3.2/9.1"]
      dom: ["home-mode-text"]
      links: ["docs/UI_TESTS.md:UI-HOME-002", "docs/qa-automation.md:TC-P0-001"]

  - id: UI-OVERLAY-001
    contract: 엔진 라우트 오버레이(홈 위) 계약
    status:
      summary: partial
      p0: partial
    source:
      docs: ["SPEC 3.1", "SPEC 3.3"]
      dom: ["overlay-root", "home-root"]
      links: ["docs/UI_TESTS.md:UI-OVERLAY-001", "docs/qa-automation.md:TC-P0-002", "tests/qa-homi.spec.ts:overlay-engine"]

  - id: UI-OVERLAY-002
    contract: /backup 오버레이(홈 위) 계약
    status:
      summary: partial
      p0: partial
    source:
      docs: ["SPEC 3.1", "SPEC 3.3"]
      dom: ["overlay-root"]
      links: ["docs/UI_TESTS.md:UI-OVERLAY-002", "docs/qa-automation.md:TC-P0-003", "tests/qa-homi.spec.ts:overlay-backup"]

  - id: IMPORT-ENTRY-001
    contract: Import 진입점은 /backup 단독 계약
    status:
      summary: gap
      p0: gap
    source:
      docs: ["SPEC 7.1", "README source 정책"]
      dom: ["backup-url-input", "backup-json-textarea", "backup-file-input", "engine-root"]
      links: ["docs/UI_TESTS.md:UI-BACKUP-001", "docs/qa-automation.md:TC-P0-004"]

  - id: IMPORT-FLOW-001
    contract: 미리보기 후 확정 저장 계약
    status:
      summary: gap
      p0: gap
    source:
      docs: ["SPEC 7.2", "README Import"]
      dom: ["backup-preview", "backup-confirm"]
      links: ["docs/UI_TESTS.md:UI-BACKUP-003", "docs/qa-automation.md:TC-P0-005"]

  - id: IMPORT-APPLY-001
    contract: Import 적용은 replace(전체 교체) 계약
    status:
      summary: gap
      p0: gap
    source:
      docs: ["SPEC 7.2", "SPEC 7.6"]
      dom: ["backup-confirm"]
      links: ["docs/UI_TESTS.md:UI-BACKUP-005", "docs/qa-automation.md:TC-P0-006"]

  - id: IMPORT-URL-001
    contract: URL Import 스킴 허용/차단 계약
    status:
      summary: partial
      p0: partial
    source:
      docs: ["SPEC 7.4", "contracts/ui-contract.v1.yaml"]
      dom: ["backup-url-input", "backup-error"]
      links: ["docs/UI_TESTS.md:UI-BACKUP-006", "docs/qa-automation.md:TC-P0-007"]

  - id: SECURITY-RENDER-001
    contract: HTML 미렌더/텍스트 렌더링 계약
    status:
      summary: gap
      p0: gap
    source:
      docs: ["SPEC 11", "README 보안"]
      dom: ["backup-preview"]
      links: ["docs/UI_TESTS.md:SEC-UI-001", "docs/qa-automation.md:TC-P0-013"]

  - id: DICT-MODE-001
    contract: dictation 실행 모드 텍스트 계약
    status:
      summary: gap
      p0: gap
    source:
      docs: ["SPEC 9.2"]
      dom: ["home-mode-text"]
      links: ["docs/UI_TESTS.md:UI-MODE-002", "docs/qa-automation.md:TC-P0-008"]

  - id: DICT-TIMER-001
    contract: dictation 자동진행/Next 즉시계약
    status:
      summary: gap
      p0: gap
    source:
      docs: ["SPEC 9.2", "contracts/ui-contract.v1.yaml"]
      dom: ["dictation-progress", "dictation-next"]
      links: ["docs/UI_TESTS.md:GAME-DICT-002/003", "docs/qa-automation.md:TC-P0-009"]

  - id: DICT-SPEAK-001
    contract: 발화 우선순위 계약(meaning→hint→word)
    status:
      summary: gap
      p0: gap
    source:
      docs: ["SPEC 9.2", "contracts/ui-contract.v1.yaml"]
      dom: ["dictation-mode-a", "dictation-mode-b"]
      links: ["docs/UI_TESTS.md:GAME-DICT-007", "docs/qa-automation.md:TC-P0-010"]

  - id: DICT-END-001
    contract: 종료 시 기본 모드 복귀 계약
    status:
      summary: gap
      p0: gap
    source:
      docs: ["SPEC 9.2"]
      dom: ["dictation-exit", "home-mode-text"]
      links: ["docs/UI_TESTS.md:GAME-DICT-005/004", "docs/qa-automation.md:TC-P0-011"]

  - id: SCH-NOTIF-001
    contract: dictation 실행 중 알림은 토스트-only 계약
    status:
      summary: gap
      p0: gap
    source:
      docs: ["SPEC 9.3", "SPEC 8"]
      dom: ["schedule-toast", "toast-root"]
      links: ["docs/UI_TESTS.md:ALARM-SCH-003", "docs/qa-automation.md:TC-P0-012"]

  - id: TEXT-SOURCE-001
    contract: source.type=text Import 추적 정합성(P1로 상향)
    status:
      summary: gap
      p0: gap
    source:
      docs: ["README source.type", "SPEC 5"]
      dom: ["backup-text-preview-btn", "backup-confirm", "backup-export-btn", "backup-preview"]
      links: ["docs/UI_TESTS.md:UI-BACKUP-014", "docs/qa-automation.md:TC-P1-014"]
