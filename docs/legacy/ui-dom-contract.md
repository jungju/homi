---
docId: ui-dom-contract
kind: ui-contract
owners:
  - machine
audience: machine
status: active
machineReadable: true
contractVersion: v1
summary: "Machine-first DOM/testid contract for Homi v1 UI"
lastUpdated: "2026-03-06"
dependencies:
  - contracts/ui-contract.v1.yaml
  - docs/qa-automation.md
  - UI_TESTS.md
---
# Homi v1 UI DOM Contract & Test Selector Registry (Machine-First)

mode: fixed
version: v1

contract:
  purpose:
    - unify UI structure for automation
    - keep selector schema stable
    - avoid human text as source of truth
  scope:
    routes: ["/", "/engines/schedule", "/engines/dictation", "/backup"]
    engines: ["schedule", "dictation"]
    storageKey: "homi.store.v1"
    modeTexts: ["기본 모드", "받아쓰기 실행모드"]

global:
  requiredTestIds:
    - app-root
    - home-root
    - home-face
    - home-bubble
    - home-mode-text
    - toast-root
  requiredText:
    home-mode-text: ["기본 모드", "받아쓰기 실행모드"]
  forbiddenTestIds:
    - global-header
    - global-nav
    - top-navbar
  rules:
    - home-root must remain mounted when overlay is open
    - mode text must be textual (not icon-only)

routes:
  - id: home
    path: "/"
    mustExist:
      - home-root
      - home-face
      - home-bubble
      - home-mode-text
      - home-open-engines
      - home-engine-btn-schedule
      - home-engine-btn-dictation
      - home-bubble
    mustNotExist:
      - overlay-root
      - backup-root
      - engine-root
      - dictation-root
    assertions:
      - selector: "#home-mode-text"
        text: "기본 모드"

  - id: backup_overlay
    path: "/backup"
    mustExist:
      - overlay-root
      - overlay-backdrop
      - overlay-panel
      - overlay-header
      - overlay-title
      - overlay-close
      - backup-root
      - backup-url-input
      - backup-url-preview-btn
      - backup-json-textarea
      - backup-text-preview-btn
      - backup-file-input
      - backup-file-preview-btn
      - backup-preview
      - backup-confirm
      - backup-error
      - backup-export-btn
      - backup-sample-load-btn
    mustNotExist:
      - engine-root
      - dictation-root
    attributes:
      overlay-root:
        data-overlay-kind: "backup"

  - id: engine_dictation
    path: "/engines/dictation"
    mustExist:
      - overlay-root
      - overlay-backdrop
      - overlay-panel
      - overlay-header
      - overlay-title
      - overlay-close
      - engine-root
      - engine-datasets-list
      - engine-empty-state
    mustNotExist:
      - backup-url-input
      - backup-json-textarea
      - backup-file-input
    attributes:
      overlay-root:
        data-overlay-kind: "engine"
        data-engine-id: "dictation"
      engine-root:
        data-engine-id: "dictation"

  - id: engine_schedule
    path: "/engines/schedule"
    mustExist:
      - overlay-root
      - overlay-backdrop
      - overlay-panel
      - overlay-header
      - overlay-title
      - overlay-close
      - engine-root
      - engine-datasets-list
      - engine-empty-state
    mustNotExist:
      - backup-url-input
      - backup-json-textarea
      - backup-file-input
    attributes:
      overlay-root:
        data-overlay-kind: "engine"
        data-engine-id: "schedule"
      engine-root:
        data-engine-id: "schedule"

elements:
  home:
    required:
      home-root: {}
      home-face: {}
      home-bubble: {}
      home-mode-text:
        text: true
      home-open-engines: {}
      home-engine-btn-schedule: {}
      home-engine-btn-dictation: {}
    actions:
      openEngine:
        schedule: home-engine-btn-schedule
        dictation: home-engine-btn-dictation

  overlay:
    required:
      overlay-root:
        attrs:
          data-overlay-kind:
            - "engine"
            - "backup"
          data-engine-id:
            when:
              data-overlay-kind: "engine"
            allowed:
              - "schedule"
              - "dictation"
      overlay-backdrop: {}
      overlay-panel: {}
      overlay-header: {}
      overlay-title: {}
      overlay-close: {}
      overlay-content: {}

  engine:
    required:
      engine-root:
        attrs:
          data-engine-id:
            - "schedule"
            - "dictation"
      engine-datasets-list: {}
      engine-empty-state: {}
    datasetRow:
      testId: dataset-row
      attrs:
        data-engine-id:
          required: true
        data-dataset-id:
          requiredWhenMissing: data-dataset-title
        data-dataset-title: {}
      children:
        dataset-open: {}
        dataset-title: {}
        dataset-item-count: {}

  dictation:
    required:
      dictation-root:
        attrs:
          data-engine-id: "dictation"
          data-dataset-id: optional
      dictation-mode-a: {}
      dictation-mode-b: {}
      dictation-progress: {}
      dictation-progress-index: {}
      dictation-progress-total: {}
      dictation-next: {}
      dictation-exit: {}
      dictation-current-text: { optional: true }
    assertions:
      - when: running
        homeModeText: "받아쓰기 실행모드"
      - when: stopped
        homeModeText: "기본 모드"

  schedule:
    required:
      schedule-enabled-toggle:
        attrs:
          role: "switch"
          aria-checked:
            - "true"
            - "false"
      schedule-toast: {}
    optional:
      dictation:
        forbidNotificationDuringDictation: true

  backup:
    required:
      backup-root: {}
      backup-url-input: {}
      backup-url-preview-btn: {}
      backup-json-textarea: {}
      backup-text-preview-btn: {}
      backup-file-input: {}
      backup-file-preview-btn: {}
      backup-preview: {}
      backup-preview-summary: {}
      backup-preview-bundle-title: {}
      backup-preview-bundle-id: {}
      backup-preview-bundle-type: {}
      backup-preview-dataset-count: {}
      backup-preview-engine-list: {}
      backup-preview-engine-chip: {}
      backup-preview-datasets-list: {}
      backup-preview-dataset-row: {}
      backup-preview-dataset-engine: {}
      backup-preview-dataset-title: {}
      backup-preview-dataset-item-count: {}
      backup-confirm: {}
      backup-error: {}
      backup-export-btn: {}
      backup-sample-load-btn: {}
      backup-replace-warning: {}
    attributes:
      backup-preview-dataset-row:
        attrs:
          data-engine-id:
            required: true

  toast:
    required:
      toast-root: {}
    scheduleToast:
      testId: schedule-toast
      visibleOnInterruptWhenDictationRunning: true
      attrs:
        data-dataset-id: optional
        data-item-title: optional

interactions:
  openScheduleEngine:
    click: home-engine-btn-schedule
  openDictationEngine:
    click: home-engine-btn-dictation
  startDictationDataset:
    click:
      container: engine-root
      action: dataset-open
  closeOverlay:
    click: overlay-close
  backup:
    previewByUrl: backup-url-preview-btn
    previewByText: backup-text-preview-btn
    previewByFile: backup-file-preview-btn
    confirm: backup-confirm
  dictation:
    next: dictation-next
    exit: dictation-exit
    switchModeA: dictation-mode-a
    switchModeB: dictation-mode-b
  schedule:
    toggleEnabled: schedule-enabled-toggle

schemas:
  modeTransition:
    from: "기본 모드"
    to: "받아쓰기 실행모드"
    fromRoute: "/engines/dictation"
    when: dictationRunnerVisible
  dictationTiming:
    autoAdvanceSeconds: 10
    nextIsImmediate: true
    autoStopOnLastItem: true
  backupFlow:
    requiresPreviewBeforeConfirm: true
    confirmTestId: backup-confirm
    applyMode: replace
    replaceTarget: "allEngines"
  scheduleFlow:
    onlyRunInDictation: false
    notifyThroughToastDuringDictation: true
    forbidOsNotificationDuringDictation: true

snapshots:
  - route: "/"
    requiredVisible:
      - home-root
  - route: "/backup"
    requiredVisible:
      - overlay-root
      - backup-preview
  - route: "/engines/dictation"
    requiredVisible:
      - dictation-root
  - route: "/engines/dictation"
    requiredVisible:
      - schedule-toast

changePolicy:
  allowRenameOwners: false
  allowTestIdRename: false
  allowElementRemoval:
    requires:
      - replacementTestId
      - testUpdate
      - contractUpdate
