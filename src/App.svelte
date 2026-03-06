<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import {
    ENGINE_REGISTRY,
    type DataSetV1,
    type DataSetPayloadV1,
    type EngineId,
    type HomiBundleV1,
    type HomiStoreV1,
    buildBundleFromDatasetIds,
    createEmptyStore,
    createId,
    MAX_BUNDLE_JSON_BYTES,
    MAX_DATASET_COUNT_PER_BUNDLE,
    MAX_ITEMS_PER_DATASET,
    getDatasetsByEngine,
    getEngineMeta,
    importDatasets,
    isEngineId,
    loadStore,
    normalizeImportUrl,
    parseBundleText,
    parseItemsForEngine,
    removeDataset,
    saveStore,
    upsertDataset,
  } from './lib/homi';

  type Route =
    | { kind: 'home' }
    | { kind: 'engine'; engineId: EngineId }
    | { kind: 'backup' }
    | { kind: 'unknown'; path: string };

  interface ImportCandidate {
    index: number;
    payload: DataSetPayloadV1;
    selected: boolean;
  }

  interface ImportPreview {
    sourceKind: 'url' | 'file' | 'sample' | 'text';
    sourceText: string;
    bundle: HomiBundleV1;
    candidates: ImportCandidate[];
  }

  interface DatasetEditor {
    mode: 'add' | 'edit' | null;
    engineId: EngineId;
    datasetId: string;
    title: string;
    itemsText: string;
    error: string;
  }

  interface Message {
    text: string;
    type: 'ok' | 'error';
  }

  type HomeMood = 'smile' | 'curious' | 'proud' | 'calm' | 'concern' | 'wink';
  type DictationWriteMode = 'korean' | 'english';

  let store: HomiStoreV1 = loadStore();
  let route: Route = parseRoute(window.location.pathname);
  let preview: ImportPreview | null = null;
  let importUrl = '';
  let editor: DatasetEditor = {
    mode: null,
    engineId: 'schedule',
    datasetId: '',
    title: '',
    itemsText: '[]',
    error: '',
  };
  let message: Message | null = null;
  let exportSelection = new Set<string>();
  let fileImportInput: HTMLInputElement | null = null;
  let blink = false;
  let blinkResetTimeout: number | null = null;
  let importJsonText = '';
  let scheduleReminderTimer: number | null = null;
  let scheduleReminderLastFired = new Map<string, number>();
  let reminderPermissionWarned = false;
  let dictationDatasetId: string | null = null;
  let dictationMode: DictationWriteMode = 'korean';
  let dictationCurrentIndex = 0;
  let dictationRunning = false;
  let dictationIntervalTimer: number | null = null;
  let dictationGameMode = false;
  let selectedDictationDataset: DataSetV1 | null = null;
  let dictationFaceBlink = false;
  let dictationFaceBlinkTimeout: number | null = null;
  const LIMIT_BYTES = MAX_BUNDLE_JSON_BYTES;
  const LIMIT_DATASETS = MAX_DATASET_COUNT_PER_BUNDLE;
  const LIMIT_ITEMS = MAX_ITEMS_PER_DATASET;
  const SCHEDULE_REMINDER_TICK_MS = 1000;
  const DICTATION_INTERVAL_MS = 10_000;

  const ENGINE_VISUALS: Record<EngineId, { icon: string; accent: string; bg: string }> = {
    schedule: {
      icon: '📅',
      accent: '#4a90e2',
      bg: '#dce9ff',
    },
    dictation: {
      icon: '🎧',
      accent: '#f0a44e',
      bg: '#ffe2be',
    },
  };

  function prettyBytes(bytes: number) {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${Math.round(bytes / 1024)}KB`;
  }

  function maybeShowImportLimits() {
    return `가져오기 제한: 최대 ${prettyBytes(LIMIT_BYTES)} JSON, 번들당 최대 ${LIMIT_DATASETS}개 세트, 세트당 최대 ${LIMIT_ITEMS}개 항목`;
  }

  function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function asString(value: unknown): string | undefined {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return undefined;
  }

  function asPositiveInt(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value > 0) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      const parsed = Number(value);
      if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return null;
  }

  function getReminderKey(datasetId: string, itemIndex: number) {
    return `${datasetId}:${itemIndex}`;
  }

  function cleanupReminderState(validKeys: Set<string>) {
    for (const key of scheduleReminderLastFired.keys()) {
      if (!validKeys.has(key)) {
        scheduleReminderLastFired.delete(key);
      }
    }
  }

  function announceReminder(datasetTitle: string, item: Record<string, unknown>) {
    const title = asString(item.title) ?? 'Homi 알림';
    const bodyParts = [
      asString(item.timeStart) ?? '',
      asString(item.notes) ?? '',
      asString(item.date) ?? '',
    ].filter(Boolean);
    const messageText = `${datasetTitle} · ${title}${bodyParts.length > 0 ? ` - ${bodyParts.join(' ')}` : ''}`;

    const isDictationGameActive = route.kind === 'engine' && route.engineId === 'dictation' && dictationGameMode;
    if (isDictationGameActive) {
      setMessage(`일정 알림: ${messageText}`, 'ok');
      return;
    }

    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') {
        new Notification(`Homi / ${datasetTitle}`, {
          body: `${title}${bodyParts.length > 0 ? ` - ${bodyParts.join(' ')}` : ''}`,
        });
      } else if (!reminderPermissionWarned && Notification.permission !== 'denied') {
        setMessage('브라우저 알림이 차단되어 있어 표시되지 않을 수 있어요. 알림 허용 시 스케줄 알림이 뜹니다.', 'error');
        reminderPermissionWarned = true;
      }
    }

    const audioUrl = asString(item.audioUrl);
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      void audio.play().catch(() => {
        // 오디오 URL이 차단/실패하면 텍스트 음성으로 대체
        const utter = new SpeechSynthesisUtterance(title);
        utter.lang = 'ko-KR';
        if (window.speechSynthesis && !window.speechSynthesis.speaking) {
          window.speechSynthesis.speak(utter);
        }
      });
      return;
    }

    const utter = new SpeechSynthesisUtterance(title);
    utter.lang = 'ko-KR';
    if (window.speechSynthesis && !window.speechSynthesis.speaking) {
      window.speechSynthesis.speak(utter);
    }
  }

  function tickScheduleReminder() {
    const reminders = getDatasetsByEngine(store, 'schedule').filter((dataset) => isDatasetEnabled(dataset));
    const now = Date.now();
    const validKeys = new Set<string>();
    const intervalCandidates: Array<{ datasetTitle: string; item: Record<string, unknown> }> = [];

    reminders.forEach((dataset) => {
      dataset.items.forEach((rawItem, index) => {
        if (!isPlainRecord(rawItem)) {
          return;
        }
        const intervalSec = asPositiveInt(rawItem.repeatIntervalSec);
        if (!intervalSec || intervalSec <= 0) {
          return;
        }
        const key = getReminderKey(dataset.id, index);
        validKeys.add(key);

        const lastFiredAt = scheduleReminderLastFired.get(key);
        if (lastFiredAt === undefined) {
          scheduleReminderLastFired.set(key, now);
          return;
        }

        const intervalMs = intervalSec * 1000;
        if (now - lastFiredAt >= intervalMs) {
          intervalCandidates.push({
            datasetTitle: dataset.title,
            item: rawItem,
          });
          scheduleReminderLastFired.set(key, now);
        }
      });
    });

    cleanupReminderState(validKeys);
    if (intervalCandidates.length === 0) {
      return;
    }

    triggerHomeWink();
    intervalCandidates.forEach((candidate) => {
      announceReminder(candidate.datasetTitle, candidate.item);
    });
  }

  function startScheduleReminder() {
    if (scheduleReminderTimer !== null) return;
    tickScheduleReminder();
    scheduleReminderTimer = window.setInterval(() => {
      tickScheduleReminder();
    }, SCHEDULE_REMINDER_TICK_MS);
  }

  function stopScheduleReminder() {
    if (scheduleReminderTimer === null) return;
    clearInterval(scheduleReminderTimer);
    scheduleReminderTimer = null;
  }

  function homeGreeting() {
    const count = totalDatasetCount();
    if (count === 0) {
      return '안녕하세요! Homi에 오신 걸 환영해요. 오늘도 우리 가족처럼 따뜻하게 시작해볼까요?';
    }
    if (count < 3) {
      return '아직 막 정리 중이지만 얼굴이 미소 짓고 있어요. 데이터가 보태질수록 더 재밌어져요.';
    }
    return '좋아요. 자료가 꽤 모였어요. 지금 바로 엔진으로 이동해서 이어가보세요.';
  }

  $: homeMood = getHomeMood();
  $: displayMood = blink ? 'wink' : homeMood;
  $:
    homeModeText =
      route.kind === 'engine' && route.engineId === 'dictation' && dictationGameMode
        ? '현재 모드: 받아쓰기 실행모드'
        : '현재 모드: 기본 모드';
  $:
    selectedDictationDataset = dictationDatasetId
      ? getDatasetsByEngine(store, 'dictation').find((dataset) => dataset.id === dictationDatasetId) ?? null
      : null;

  function getHomeMood(): HomeMood {
    if (preview) {
      return 'calm';
    }
    if (message?.type === 'error') {
      return 'concern';
    }
    if (totalDatasetCount() === 0) {
      return 'curious';
    }
    return totalDatasetCount() > 0 ? 'proud' : 'smile';
  }

  function triggerHomeWink() {
    blink = true;
    if (blinkResetTimeout !== null) {
      clearTimeout(blinkResetTimeout);
    }
    blinkResetTimeout = window.setTimeout(() => {
      blink = false;
      blinkResetTimeout = null;
    }, 450);
  }

  function getSelectedDictationDataset(): DataSetV1 | null {
    if (!dictationDatasetId) {
      return null;
    }
    const list = getDatasetsByEngine(store, 'dictation');
    return list.find((dataset) => dataset.id === dictationDatasetId) ?? null;
  }

  function selectDictationDataset(dataset: DataSetV1) {
    if (dataset.engineId !== 'dictation') {
      return;
    }
    if (dictationRunning) {
      stopDictationSession();
    }
    dictationDatasetId = dataset.id;
    dictationCurrentIndex = 0;
    if (route.kind === 'engine') {
      setMessage(`"${dataset.title}"를 받아쓰기 대상으로 선택했습니다.`, 'ok');
    }
  }

  function getDictationSpeechPayload(item: Record<string, unknown>) {
    if (dictationMode === 'korean') {
      const englishWord = asString(item.word);
      return englishWord
        ? {
            text: englishWord,
            lang: 'en-US',
          }
        : null;
    }

    const koreanText = asString(item.meaning);
    if (koreanText) {
      return {
        text: koreanText,
        lang: 'ko-KR',
      };
    }

    const fallbackWord = asString(item.word);
    return fallbackWord
      ? {
          text: fallbackWord,
          lang: 'ko-KR',
        }
      : null;
  }

  function getDictationDisplayText(item: Record<string, unknown>) {
    const word = asString(item.word) ?? '';
    const meaning = asString(item.meaning) ?? '';
    return dictationMode === 'korean' ? word : meaning || word;
  }

  function getCurrentDictationItem(dataset: DataSetV1 | null): Record<string, unknown> | null {
    if (!dataset) return null;
    const item = dataset.items[dictationCurrentIndex];
    return isPlainRecord(item) ? item : null;
  }

  function isDatasetEnabled(dataset: DataSetV1): boolean {
    if (!dataset.meta || typeof dataset.meta !== 'object') {
      return true;
    }
    const enabled = (dataset.meta as Record<string, unknown>).enabled;
    return enabled !== false;
  }

  function toggleScheduleDatasetEnabled(dataset: DataSetV1) {
    if (dataset.engineId !== 'schedule') {
      return;
    }
    const nextEnabled = !isDatasetEnabled(dataset);
    const nextMeta = {
      ...(dataset.meta ?? {}),
      enabled: nextEnabled,
    };
    const now = new Date().toISOString();
    const nextDataset: DataSetV1 = {
      ...dataset,
      meta: nextMeta,
      updatedAt: now,
    };
    persist(upsertDataset(store, nextDataset));
    setMessage(
      `${dataset.title}를 ${nextEnabled ? '사용' : '사용안함'} 상태로 바꿨습니다.`,
      'ok',
    );
  }

  function triggerDictationFaceWink() {
    dictationFaceBlink = true;
    if (dictationFaceBlinkTimeout !== null) {
      clearTimeout(dictationFaceBlinkTimeout);
    }
    dictationFaceBlinkTimeout = window.setTimeout(() => {
      dictationFaceBlink = false;
      dictationFaceBlinkTimeout = null;
    }, 420);
  }

  function stopDictationSession() {
    if (!dictationRunning) {
      dictationRunning = false;
    }
    dictationGameMode = false;
    if (dictationIntervalTimer !== null) {
      clearInterval(dictationIntervalTimer);
      dictationIntervalTimer = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
    }
    dictationRunning = false;
  }

  function startDictationAutoTimer() {
    if (dictationIntervalTimer !== null) {
      clearInterval(dictationIntervalTimer);
    }
    dictationIntervalTimer = window.setInterval(() => {
      if (!dictationRunning) return;
      moveToNextDictationItem(true);
    }, DICTATION_INTERVAL_MS);
  }

  function playDictationCurrentItem(auto = false) {
    const dataset = getSelectedDictationDataset();
    if (!dataset) {
      if (dictationRunning) {
        stopDictationSession();
      }
      return;
    }

    if (dataset.items.length === 0 || dictationCurrentIndex >= dataset.items.length) {
      stopDictationSession();
      setMessage('마지막 항목까지 진행했습니다.', 'ok');
      return;
    }

    const raw = dataset.items[dictationCurrentIndex];
    if (!isPlainRecord(raw)) {
      if (auto) {
        moveToNextDictationItem(true);
        return;
      }
      setMessage('현재 항목 형식이 유효하지 않습니다.', 'error');
      return;
    }

    const payload = getDictationSpeechPayload(raw);
    if (!payload) {
      if (auto) {
        moveToNextDictationItem(true);
        return;
      }
      setMessage('현재 항목에 발화할 텍스트가 없습니다.', 'error');
      return;
    }

    const utter = new SpeechSynthesisUtterance(payload.text);
    utter.lang = payload.lang;
    if (window.speechSynthesis?.speaking || window.speechSynthesis?.pending) {
      window.speechSynthesis.cancel();
    }
    triggerDictationFaceWink();
    window.speechSynthesis?.speak(utter);
  }

  function moveToNextDictationItem(auto = false) {
    const dataset = getSelectedDictationDataset();
    if (!dataset) {
      stopDictationSession();
      return;
    }

    if (dictationCurrentIndex + 1 >= dataset.items.length) {
      stopDictationSession();
      setMessage('마지막 항목까지 진행했습니다.', 'ok');
      return;
    }

    dictationCurrentIndex += 1;
    playDictationCurrentItem(auto);

    if (auto) {
      return;
    }

    startDictationAutoTimer();
  }

  function startDictationSession() {
    const dataset = getSelectedDictationDataset();
    if (!dataset) {
      setMessage('받아쓰기 데이터를 먼저 선택해주세요.', 'error');
      return;
    }

    if (dataset.items.length === 0) {
      setMessage('선택한 데이터셋이 비어 있습니다.', 'error');
      return;
    }

    stopDictationSession();
    dictationRunning = true;
    dictationGameMode = true;
    dictationCurrentIndex = 0;
    playDictationCurrentItem();
    startDictationAutoTimer();
    setMessage(`"${dataset.title}" 받아쓰기 시작`, 'ok');
  }

  function onNextDictationItem() {
    if (!dictationRunning) {
      setMessage('시작한 뒤 Next를 눌러주세요.', 'error');
      return;
    }
    moveToNextDictationItem();
  }

  function ensureDictationUiStopsIfNeeded() {
    const dataset = getSelectedDictationDataset();
    if (!dataset) {
      stopDictationSession();
      return;
    }
    if (dictationCurrentIndex >= dataset.items.length) {
      dictationCurrentIndex = Math.max(0, dataset.items.length - 1);
      stopDictationSession();
    }
  }

  function parseRoute(pathname: string): Route {
    const clean = (pathname || '/').replace(/\/$/, '') || '/';
    if (clean === '/' || clean === '/index.html') {
      return { kind: 'home' };
    }
    if (clean === '/backup') {
      return { kind: 'backup' };
    }

    const engineMatch = clean.match(/^\/engines\/([^/?#]+)$/);
    if (engineMatch) {
      const engineId = decodeURIComponent(engineMatch[1]);
      if (isEngineId(engineId)) {
        return { kind: 'engine', engineId };
      }
      return { kind: 'unknown', path: clean };
    }

    return { kind: 'unknown', path: clean };
  }

  function parsePath() {
    route = parseRoute(window.location.pathname);
    applyRouteSideEffects();
  }

  function applyRouteSideEffects() {
    if (route.kind === 'engine') {
      exportSelection = new Set(getDatasetsByEngine(store, route.engineId).map((item) => item.id));
      if (route.engineId !== 'dictation') {
        stopDictationSession();
      }
      if (store.ui) {
        store.ui.lastOpenedEngineId = route.engineId;
      } else {
        store.ui = { lastOpenedEngineId: route.engineId };
      }
    } else if (route.kind === 'backup') {
      // 백업은 전체 Export만 사용
      stopDictationSession();
    } else {
      exportSelection = new Set();
      stopDictationSession();
    }
    preview = null;
    editor.mode = null;
    message = null;
  }

  function navigate(path: string) {
    history.pushState({}, '', path);
    parsePath();
  }

  function setMessage(text: string, type: Message['type']) {
    message = { text, type };
    setTimeout(() => {
      message = null;
    }, 3500);
  }

  function nowTag() {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate(),
    ).padStart(2, '0')}`;
  }

  function persist(nextStore: HomiStoreV1) {
    store = nextStore;
    saveStore(store);
    if (route.kind === 'engine') {
      exportSelection = new Set(getDatasetsByEngine(store, route.engineId).map((item) => item.id));
    } else if (route.kind === 'backup') {
      // no-op
    }
  }

  function currentEngineMeta() {
    if (route.kind !== 'engine') return undefined;
    return getEngineMeta(route.engineId);
  }

  function onHomeEngineClick(engineId: EngineId) {
    triggerHomeWink();
    navigate(`/engines/${engineId}`);
  }

  function openSettingsPopup() {
    triggerHomeWink();
    navigate('/backup');
  }

  function closePopup() {
    if (route.kind === 'home') return;
    navigate('/');
  }

  function startAddDataset(engineId: EngineId) {
    editor = {
      mode: 'add',
      engineId,
      datasetId: '',
      title: '',
      itemsText: '[]',
      error: '',
    };
  }

  function startEditDataset(dataset: DataSetV1) {
    editor = {
      mode: 'edit',
      engineId: dataset.engineId,
      datasetId: dataset.id,
      title: dataset.title,
      itemsText: JSON.stringify(dataset.items, null, 2),
      error: '',
    };
  }

  function cancelEditor() {
    editor = {
      ...editor,
      mode: null,
      error: '',
    };
  }

  function saveEditor() {
    if (!editor.mode) {
      return;
    }
    const savedMode = editor.mode;

    const title = editor.title.trim();
    if (!title) {
      editor = { ...editor, error: '제목은 필수입니다.' };
      return;
    }

    const parsed = parseItemsForEngine(editor.engineId, editor.itemsText);
    if (!parsed.ok) {
      editor = { ...editor, error: parsed.error };
      return;
    }

    const now = new Date().toISOString();
    const origin =
      editor.mode === 'edit'
        ? getDatasetsByEngine(store, editor.engineId).find((item) => item.id === editor.datasetId)
        : undefined;

    const nextDataset: DataSetV1 = {
      id: editor.mode === 'add' ? createId('ds') : editor.datasetId,
      engineId: editor.engineId,
      engineSchemaVersion: getEngineMeta(editor.engineId)?.schemaVersion ?? 1,
      title,
      items: parsed.items,
      createdAt: origin?.createdAt ?? now,
      updatedAt: now,
      meta: origin?.meta,
      source: origin?.source ?? { type: 'manual' },
    };

    persist(upsertDataset(store, nextDataset));
    if (route.kind === 'engine' && editor.engineId === 'dictation') {
      ensureDictationUiStopsIfNeeded();
    }
    editor = { ...editor, mode: null, error: '' };
    setMessage(savedMode === 'add' ? '자료 세트를 추가했습니다.' : '자료 세트를 저장했습니다.', 'ok');
  }

  function onDeleteDataset(dataset: DataSetV1) {
    if (!confirm(`"${dataset.title}"를 삭제할까요?`)) return;
    persist(removeDataset(store, dataset.engineId, dataset.id));
    if (dataset.engineId === 'dictation' && dictationDatasetId === dataset.id) {
      stopDictationSession();
      dictationDatasetId = null;
      dictationCurrentIndex = 0;
    }
    setMessage('자료 세트를 삭제했습니다.', 'ok');
  }

  function selectExport(id: string, checked: boolean) {
    if (checked) {
      exportSelection.add(id);
      exportSelection = new Set(exportSelection);
      return;
    }
    exportSelection.delete(id);
    exportSelection = new Set(exportSelection);
  }

  function selectAllCurrentEngine(checked: boolean) {
    if (route.kind !== 'engine') return;
    const ids = getDatasetsByEngine(store, route.engineId).map((item) => item.id);
    exportSelection = new Set(checked ? ids : []);
  }

  function exportEngineSelection() {
    if (route.kind !== 'engine' || !currentEngineMeta()) {
      return;
    }
    const meta = currentEngineMeta()!;
    const ids = [...exportSelection];
    if (ids.length === 0) {
      setMessage('내보낼 항목을 하나 이상 선택해주세요.', 'error');
      return;
    }
    const bundle = buildBundleFromDatasetIds(store, ids, {
      bundleType: 'backup',
      title: `${meta.title} Export`,
      description: `${meta.title} export from homi`,
    });
    downloadBundle(bundle, `homi-${meta.id}-${nowTag()}.json`);
    setMessage('선택한 자료 세트를 내보냈습니다.', 'ok');
  }

  function exportAllForBackup() {
    const allIds = Object.values(store.datasetsByEngine).flatMap((list) => list.map((item) => item.id));
    if (allIds.length === 0) {
      setMessage('내보낼 자료 세트가 없습니다.', 'error');
      return;
    }
    const bundle = buildBundleFromDatasetIds(store, allIds, {
      bundleType: 'backup',
      title: 'Homi 전체 백업',
      description: 'export from all datasets',
    });
    downloadBundle(bundle, `homi-backup-${nowTag()}.json`);
    setMessage('전체 백업 파일을 생성했습니다.', 'ok');
  }

  function downloadBundle(bundle: HomiBundleV1, filename: string) {
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function runUrlImport() {
    const normalized = normalizeImportUrl(importUrl);
    if (!normalized.ok) {
      setMessage(normalized.error, 'error');
      return;
    }

    try {
      const response = await fetch(normalized.url);
      if (!response.ok) {
        setMessage(`요청 실패: ${response.status} ${response.statusText}`, 'error');
        return;
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const length = Number.parseInt(contentLength, 10);
        if (Number.isFinite(length) && length > LIMIT_BYTES) {
          setMessage(
            `가져오려는 파일이 ${prettyBytes(length)}로, v1 권장 제한(${prettyBytes(
              LIMIT_BYTES,
            )})를 초과합니다.`,
            'error',
          );
          return;
        }
      }

      const text = await response.text();
      if (new TextEncoder().encode(text).byteLength > LIMIT_BYTES) {
        setMessage(
          `가져온 JSON 크기가 제한(${prettyBytes(LIMIT_BYTES)})을 초과했습니다.`,
          'error',
        );
        return;
      }

      applyPreview(text, 'url', normalized.url);
    } catch (err) {
      const errorMessage = String((err as Error).message ?? err);
      const hint = '네트워크/CORS 제한일 수 있습니다. 해당 호스트의 CORS 설정을 확인해 주세요.';
      setMessage(`불러오기 실패: ${errorMessage} / ${hint}`, 'error');
    }
  }

  function runTextImport() {
    const text = importJsonText.trim();
    if (!text) {
      setMessage('JSON 텍스트를 입력해주세요.', 'error');
      return;
    }

    if (new TextEncoder().encode(text).byteLength > LIMIT_BYTES) {
      setMessage(`입력한 JSON 크기가 제한(${prettyBytes(LIMIT_BYTES)})을 초과했습니다.`, 'error');
      return;
    }

    applyPreview(text, 'text', '직접 입력된 JSON');
    importJsonText = '';
  }

  async function loadSampleBundle() {
    if (route.kind !== 'backup') {
      setMessage('샘플 가져오기는 브레인 설정( /backup )에서만 할 수 있습니다.', 'error');
      return;
    }
    try {
      const response = await fetch('/samples/homi.sample.homi.json');
      if (!response.ok) {
        setMessage('샘플 불러오기 실패', 'error');
        return;
      }
      const text = await response.text();
      applyPreview(text, 'sample', '/samples/homi.sample.homi.json');
    } catch (err) {
      setMessage(`샘플 불러오기 실패: ${String((err as Error).message ?? err)}`, 'error');
    }
  }

  function applyPreview(
    text: string,
    sourceKind: 'url' | 'file' | 'sample' | 'text',
    sourceText: string,
  ) {
    const parsed = parseBundleText(text);
    if (!parsed.ok) {
      setMessage(parsed.errors.join('\n'), 'error');
      return;
    }

    const candidates: ImportCandidate[] = parsed.datasets.map((dataset, index) => ({
      index,
      payload: dataset,
      selected: true,
    }));

    preview = {
      sourceKind,
      sourceText,
      bundle: parsed.bundle,
      candidates,
    };
  }

  async function importFromFile(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (file.size > LIMIT_BYTES) {
      setMessage(`선택한 파일이 ${prettyBytes(file.size)}로 제한(${prettyBytes(LIMIT_BYTES)})을 초과합니다.`, 'error');
      if (target) target.value = '';
      return;
    }

    try {
      const text = await file.text();
      if (new TextEncoder().encode(text).byteLength > LIMIT_BYTES) {
        setMessage(`선택한 파일 내용이 제한(${prettyBytes(LIMIT_BYTES)})을 초과합니다.`, 'error');
        return;
      }
      applyPreview(text, 'file', file.name);
    } catch (err) {
      setMessage(`파일 읽기 실패: ${String((err as Error).message ?? err)}`, 'error');
    } finally {
      if (target) target.value = '';
    }
  }

  function togglePreviewSelection(index: number, checked: boolean) {
    if (!preview) return;
    const target = preview.candidates.find((item) => item.index === index);
    if (!target) return;
    target.selected = checked;
    preview = { ...preview };
  }

  function importFromPreview() {
    if (!preview) {
      return;
    }

    const selected = preview.candidates.filter((item) => item.selected).map((item) => item.payload);
    if (selected.length === 0) {
      setMessage('가져올 항목을 하나 이상 선택해주세요.', 'error');
      return;
    }

    const sourceType =
      preview.sourceKind === 'file'
        ? 'file'
        : preview.sourceKind === 'sample'
          ? 'sample'
          : preview.sourceKind === 'text'
            ? 'text'
            : 'url';

    const replaceStore: HomiStoreV1 = createEmptyStore();
    if (store.ui) {
      replaceStore.ui = store.ui;
    }
    const imported = importDatasets(replaceStore, selected, sourceType, {
      bundleId: preview.bundle.bundleId,
      sourceUrl: preview.sourceKind === 'url' ? preview.sourceText : undefined,
    });

    persist(imported.nextStore);
    ensureDictationUiStopsIfNeeded();
    setMessage(`기존 자료를 교체하고 총 ${imported.imported.length}개 자료 세트를 가져왔습니다.`, 'ok');
    preview = null;
  }

  function hasDatasets() {
    return Object.values(store.datasetsByEngine).some((list) => list.length > 0);
  }

  function totalDatasetCount() {
    return Object.values(store.datasetsByEngine).reduce((sum, list) => sum + list.length, 0);
  }

  function onPopState() {
    parsePath();
  }

  onMount(() => {
    if (!store?.datasetsByEngine) {
      store = createEmptyStore();
    }
    startScheduleReminder();

    if (route.kind === 'unknown') {
      navigate('/');
      return;
    }

    if (route.kind === 'home' && store.ui?.lastOpenedEngineId) {
      const lastEngine = store.ui.lastOpenedEngineId;
      if (isEngineId(lastEngine)) {
        // show home first, keep navigation state explicit
      }
    }

    parsePath();
    window.addEventListener('popstate', onPopState);
  });

  onDestroy(() => {
    window.removeEventListener('popstate', onPopState);
    if (blinkResetTimeout !== null) {
      clearTimeout(blinkResetTimeout);
      blinkResetTimeout = null;
    }
    if (dictationFaceBlinkTimeout !== null) {
      clearTimeout(dictationFaceBlinkTimeout);
      dictationFaceBlinkTimeout = null;
    }
    stopDictationSession();
    stopScheduleReminder();
  });
</script>

<div class="layout home-layout" data-testid="app-root">
  {#if message}
    <div data-testid="toast-root" class={`toast ${message.type}`}>{message.text}</div>
    {#if message.type === 'ok' && message.text.startsWith('일정 알림:')}
      <div data-testid="schedule-toast" class="toast ok">{message.text}</div>
    {/if}
  {/if}

  <main class="home" data-testid="home-root">
      <section class="home-fullscreen">
        <div class="home-fullscreen__halo"></div>
        <div class="home-face" data-testid="home-face" role="img" aria-label="친근한 홈 캐릭터 얼굴">
          <div class="home-face__frame">
            <div class="home-face__head" data-mood={displayMood}>
              <div class="home-face__eyes">
                <div class="home-face__eye"></div>
                <div class="home-face__eye"></div>
              </div>
              <div class="home-face__mouth"></div>
              <div class="home-face__cheek left"></div>
              <div class="home-face__cheek right"></div>
              <div class="home-face__spark left"></div>
              <div class="home-face__spark right"></div>
            </div>
          </div>
        </div>
        <section class="home-dialog" data-testid="home-bubble" role="status" aria-live="polite">
          <p class="home-msg">{homeGreeting()}</p>
          <p data-testid="home-mode-text" class="home-mode">{homeModeText}</p>
        </section>
        <div class="home-engine-row" data-testid="home-open-engines">
          {#each ENGINE_REGISTRY as engine}
            <button
              class="home-engine-btn"
              data-testid={`home-engine-btn-${engine.id}`}
              on:click={() => onHomeEngineClick(engine.id)}
            >
              <span
                class="engine-badge"
                style={`--engine-color: ${ENGINE_VISUALS[engine.id]?.accent}; --engine-bg: ${ENGINE_VISUALS[engine.id]?.bg};`}
              >
                {ENGINE_VISUALS[engine.id]?.icon}
              </span>
              <span>{engine.title} 열기</span>
            </button>
          {/each}
        </div>
        <button
          type="button"
          class="home-engine-btn"
          data-testid="home-open-backup"
          on:click={openSettingsPopup}
        >
          브레인 설정
        </button>
      </section>
    </main>

  {#if route.kind === 'engine'}
    {@const meta = currentEngineMeta()}
    {@const currentEngineId: EngineId = route.engineId}
    {@const currentEngineDatasets = getDatasetsByEngine(store, currentEngineId).filter((dataset) => dataset.engineId === currentEngineId)}
    <div
      class="popup-overlay"
      data-testid="overlay-root"
      data-overlay-kind="engine"
      data-engine-id={currentEngineId}
      role="dialog"
      aria-modal="true"
      on:click={closePopup}
    >
      <section
        class="popup-panel"
        data-testid="engine-root"
        data-overlay-kind="engine"
        data-engine-id={currentEngineId}
        on:click|stopPropagation
      >
        <button type="button" class="popup-close" data-testid="overlay-close" on:click={closePopup}>닫기</button>
        <p class="muted" data-testid="overlay-title">페이지: /engines/{currentEngineId}</p>
        <div class="popup-content">
          <section class="toolbar">
            <button
              type="button"
              data-testid="engine-dataset-add"
              on:click={() => startAddDataset(currentEngineId)}
            >
              새 자료 세트
            </button>
          </section>

              {#if currentEngineId === 'dictation' && dictationGameMode && selectedDictationDataset}
                <section class="card dictation-game-screen" data-testid="dictation-root">
                  <h3>받아쓰기 게임</h3>
              <p class="muted">
                모드: {dictationMode === 'korean' ? '한글쓰기(영어 발화)' : '영어쓰기(한국어 발화)'}
                · 데이터셋: {selectedDictationDataset.title}
              </p>
              <div class="home-face dictation-game-face" role="img" aria-label="받아쓰기 진행 중 얼굴">
                <div class="home-face__frame dictation-game-face__frame">
                  <div class="home-face__head" data-mood={dictationFaceBlink ? 'wink' : 'smile'}>
                    <div class="home-face__eyes">
                      <div class="home-face__eye"></div>
                      <div class="home-face__eye"></div>
                    </div>
                    <div class="home-face__mouth"></div>
                    <div class="home-face__cheek left"></div>
                    <div class="home-face__cheek right"></div>
                  </div>
                </div>
              </div>

              {#if selectedDictationDataset.items.length > 0}
                {@const currentDictationItem = getCurrentDictationItem(selectedDictationDataset)}
                {#if currentDictationItem}
                  <p class="count" data-testid="dictation-progress">
                    진행:
                    <span data-testid="dictation-progress-index">{dictationCurrentIndex + 1}</span>
                    /
                    <span data-testid="dictation-progress-total">{selectedDictationDataset.items.length}</span>
                  </p>
                  <p class="muted" data-testid="dictation-current-text">현재 항목: {getDictationDisplayText(currentDictationItem)}</p>
                {/if}
              {/if}

              <p class="muted">10초마다 자동으로 다음 항목으로 넘어갑니다.</p>
                  <div class="inline">
                    <button data-testid="dictation-next" on:click={onNextDictationItem}>Next</button>
                    <button data-testid="dictation-exit" on:click={stopDictationSession}>게임 나가기</button>
                  </div>
                </section>
              {/if}

          {#if currentEngineId === 'dictation' && !dictationGameMode}
            <section class="card" data-testid="dictation-root">
              <h3>받아쓰기 실행</h3>
              <p class="muted">한글쓰기면 영어 발화, 영어쓰기면 한국어 발화</p>
              <p class="muted">학습 모드</p>
              <div class="inline">
                <label class="inline">
                  <input
                    type="radio"
                    name="dictationMode"
                    data-testid="dictation-mode-a"
                    bind:group={dictationMode}
                    value="korean"
                  />
                  한글쓰기
                </label>
                <label class="inline">
                  <input
                    type="radio"
                    name="dictationMode"
                    data-testid="dictation-mode-b"
                    bind:group={dictationMode}
                    value="english"
                  />
                  영어쓰기
                </label>
              </div>

              {#if selectedDictationDataset}
                <p class="muted">
                  선택: {selectedDictationDataset.title} · {selectedDictationDataset.items.length}개
                </p>
                <p class="count" data-testid="dictation-progress">
                  진행:
                  <span data-testid="dictation-progress-index">
                    {selectedDictationDataset.items.length > 0 ? dictationCurrentIndex + 1 : 0}
                  </span>
                  /
                  <span data-testid="dictation-progress-total">{selectedDictationDataset.items.length}</span>
                </p>
                {#if selectedDictationDataset.items.length > 0}
                  {@const currentDictationItem = getCurrentDictationItem(selectedDictationDataset)}
                  {#if currentDictationItem}
                    <p class="muted" data-testid="dictation-current-text">현재 항목: {getDictationDisplayText(currentDictationItem)}</p>
                  {/if}
                {/if}
              {:else}
                <p class="muted">실행할 데이터셋을 먼저 선택해주세요.</p>
              {/if}

                <div class="inline">
                  <button on:click={startDictationSession} disabled={!selectedDictationDataset}>시작</button>
                </div>
              </section>
            {/if}

          {#if currentEngineId !== 'dictation' || !dictationGameMode}
            <section class="card" data-testid="engine-datasets-list">
              <div class="inline header-row">
                <h3>자료 세트</h3>
                <button on:click={() => selectAllCurrentEngine(true)}>전체 선택</button>
                <button on:click={() => selectAllCurrentEngine(false)}>전체 해제</button>
                <button
                  on:click={exportEngineSelection}
                  disabled={currentEngineDatasets.length === 0}
                  class:disabled={currentEngineDatasets.length === 0}
                >
                  선택 내보내기
                </button>
              </div>

              <p class="muted" data-testid="engine-empty-state" hidden={currentEngineDatasets.length !== 0}>
                아직 데이터가 없습니다.
              </p>

              {#each currentEngineDatasets as dataset}
                <article
                  class="dataset"
                  data-testid="dataset-row"
                  data-engine-id={dataset.engineId}
                  data-dataset-id={dataset.id}
                  data-dataset-title={dataset.title}
                >
                  <label class="item-check">
                    <input
                      type="checkbox"
                      checked={exportSelection.has(dataset.id)}
                      on:change={(event) => {
                        const target = event.currentTarget as HTMLInputElement;
                        selectExport(dataset.id, target.checked);
                      }}
                    />
                    <div>
                      <h4>{dataset.title}</h4>
                      <p class="muted">아이템 {dataset.items.length}개 · 마지막 수정 {dataset.updatedAt}</p>
                      {#if dataset.meta && typeof dataset.meta === 'object'}
                        <p class="muted">source: {JSON.stringify(dataset.source)}</p>
                      {/if}
                    </div>
                  </label>
                  <div class="dataset-actions">
                    {#if currentEngineId === 'schedule'}
                      <button
                        data-testid="schedule-enabled-toggle"
                        class:disabled={isDatasetEnabled(dataset) === false}
                        on:click={() => toggleScheduleDatasetEnabled(dataset)}
                        type="button"
                      >
                        {isDatasetEnabled(dataset) ? '사용함' : '사용안함'}
                      </button>
                    {/if}
                    {#if currentEngineId === 'dictation'}
                      <button
                        type="button"
                        data-testid="dataset-open"
                        class:dictation-selected={dictationDatasetId === dataset.id}
                        on:click={() => selectDictationDataset(dataset)}
                        class:disabled={dictationRunning}
                        disabled={dictationRunning}
                      >
                        {dictationDatasetId === dataset.id ? '선택됨' : '선택'}
                      </button>
                    {/if}
                    <button on:click={() => startEditDataset(dataset)}>편집</button>
                    <button on:click={() => onDeleteDataset(dataset)}>삭제</button>
                  </div>
                </article>
              {/each}
            </section>
          {/if}

          {#if editor.mode}
            <section class="card">
              <h3>{editor.mode === 'add' ? '자료 세트 추가' : '자료 세트 편집'}</h3>
              <p class="muted">항목은 엔진 스키마 형식의 JSON 배열로 입력해주세요.</p>
              <label>
                제목
                <input type="text" bind:value={editor.title} />
              </label>
              <label>
                항목(JSON)
                <textarea rows="10" bind:value={editor.itemsText}></textarea>
              </label>
              {#if editor.error}
                <p class="error">{editor.error}</p>
              {/if}
              <div class="inline">
                <button on:click={saveEditor}>저장</button>
                <button on:click={cancelEditor}>취소</button>
              </div>
              <p class="muted">
                예시:
                {#if currentEngineId === 'schedule'}
                  {"[{ \"date\": \"2026-03-06\", \"title\": \"병원\", \"timeStart\": \"10:30\" }]"}
                {:else}
                  {"[{ \"word\": \"apple\", \"meaning\": \"사과\", \"example\": \"I ate an apple.\" }]"}
                {/if}
              </p>
            </section>
          {/if}
        </div>
      </section>
    </div>
  {/if}

  {#if route.kind === 'backup'}
    <div
      class="popup-overlay"
      data-testid="overlay-root"
      data-overlay-kind="backup"
      role="dialog"
      aria-modal="true"
      on:click={closePopup}
    >
      <section
        class="popup-panel"
        data-testid="engine-root"
        data-overlay-kind="backup"
        on:click|stopPropagation
      >
        <button type="button" class="popup-close" data-testid="overlay-close" on:click={closePopup}>닫기</button>
        <p class="muted" data-testid="overlay-title">페이지: /backup</p>
        {#if message && message.type === 'error'}
          <p data-testid="backup-error" class="error">{message.text}</p>
        {/if}
        <div class="popup-content">
          <section class="card">
            <h2>백업</h2>
            <p class="muted">현재 저장 데이터: {totalDatasetCount()}개</p>
            <div class="inline">
              <button data-testid="backup-export-btn" on:click={exportAllForBackup} disabled={!hasDatasets()}>전체 Export</button>
            </div>
          </section>

          <section class="card">
            <h2>브레인 입력</h2>
            <p class="muted">브레인 URL 또는 JSON 텍스트를 넣어 가져올 수 있습니다.</p>
          </section>

          <section class="card">
            <h3>샘플 가져오기</h3>
            <p class="muted">기본 샘플 뇌(스케줄 + 받아쓰기) 번들을 한 번에 가져올 수 있습니다.</p>
            <button
              type="button"
              data-testid="backup-sample-load-btn"
              on:click={loadSampleBundle}
            >
              기본 샘플 뇌 가져오기
            </button>
          </section>

          <section class="card">
            <h3>URL Import</h3>
            <div class="inline">
              <input
                data-testid="backup-url-input"
                placeholder="https://.../bundle.json"
                bind:value={importUrl}
                type="url"
                inputmode="url"
              />
              <button data-testid="backup-url-preview-btn" type="button" on:click={runUrlImport}>가져오기</button>
            </div>
            <p class="muted">{`허용 스킴: https://  (개발환경: http://localhost 허용)`}</p>
          </section>

          <section class="card">
            <h3>JSON 텍스트 Import</h3>
            <label for="import-json-text-backup">JSON 텍스트</label>
            <textarea
              id="import-json-text-backup"
              data-testid="backup-json-textarea"
              rows="10"
              bind:value={importJsonText}
              placeholder="브레인 JSON 붙여넣기 예: format:homi, version:1, datasets:..."
            ></textarea>
            <div class="inline">
              <button
                type="button"
                data-testid="backup-text-preview-btn"
                on:click={runTextImport}
              >
                텍스트로 가져오기
              </button>
            </div>
            <p class="muted">브레인 JSON을 붙여넣으면 미리보기 후 확인 저장됩니다.</p>
          </section>

          <section class="card">
            <h3>파일 Import</h3>
            <div class="inline">
              <button type="button" data-testid="backup-file-preview-btn" on:click={() => fileImportInput?.click()}>
                파일 선택
              </button>
              <span>또는 파일 입력</span>
            </div>
            <input
              bind:this={fileImportInput}
              data-testid="backup-file-input"
              style="display:none"
              type="file"
              accept="application/json,.json"
              on:change={importFromFile}
            />
            <p class="muted">파일 Import도 URL Import와 동일하게 미리보기 후 확인 저장됩니다.</p>
          </section>

          {#if preview}
            <section class="card" data-testid="backup-preview">
              <h3>Import 미리보기</h3>
              <p class="muted">출처: {preview.sourceText}</p>
              <p class="muted">bundleType: {preview.bundle.bundleType}, datasets: {preview.bundle.datasets.length}</p>
              {#each preview.candidates as candidate}
                <label class="item-check">
                  <input
                    type="checkbox"
                    checked={candidate.selected}
                    on:change={(event) => {
                      const target = event.currentTarget as HTMLInputElement;
                      togglePreviewSelection(candidate.index, target.checked);
                    }}
                  />
                  <div>
                    <h4>{candidate.payload.title}</h4>
                    <p class="muted">엔진: {candidate.payload.engineId} / 항목: {candidate.payload.items.length}개</p>
                    {#if candidate.payload.id}
                      <p class="muted">원본 id: {candidate.payload.id}</p>
                    {/if}
                  </div>
                </label>
              {/each}
              <div class="inline">
                <button data-testid="backup-confirm" on:click={importFromPreview}>가져오기 확정</button>
                <button on:click={() => (preview = null)}>취소</button>
              </div>
            </section>
          {/if}
        </div>
      </section>
    </div>
  {/if}

  {#if route.kind === 'unknown'}
    <div class="popup-overlay" data-testid="overlay-root" role="dialog" aria-modal="true" on:click={closePopup}>
      <section class="popup-panel" on:click|stopPropagation>
        <button type="button" class="popup-close" on:click={closePopup}>닫기</button>
        <section class="card">
          <h2>알 수 없는 경로입니다.</h2>
          <p class="muted">`{route.path}`</p>
          <div class="inline">
            <button on:click={() => navigate('/')}>홈으로 이동</button>
          </div>
        </section>
      </section>
    </div>
  {/if}
</div>

<style>
  :global(:root) {
    --bg-start: #eef3ff;
    --bg-mid: #f5f9ff;
    --bg-end: #f8fbff;
    --text-main: #0f2744;
    --text-muted: #49617f;
    --text-strong: #1a3f64;
    --panel-bg: #ffffff;
    --panel-border: #c3d5ef;
    --panel-shadow: rgba(31, 90, 179, 0.08);
    --button-bg: #ffffff;
    --button-border: #9fbbe1;
    --button-text: #1a3f64;
    --button-hover-bg: #eff4ff;
    --muted-bg: #fff8e8;
    --muted-end: #fff2d9;
    --muted-border: #f0d4aa;
    --muted-text: #8f4f24;
    --toast-ok-bg: #ecf7ee;
    --toast-ok-border: #89d89c;
    --toast-ok-text: #0f5a2d;
    --toast-err-bg: #fff2f2;
    --toast-err-border: #e58f8f;
    --toast-err-text: #8b1e1e;
    --card-hover-shadow: 0 8px 22px var(--panel-shadow);
  }

  :global(body) {
    margin: 0;
    font-family: 'Pretendard', 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
    background: linear-gradient(180deg, var(--bg-start) 0%, var(--bg-mid) 50%, var(--bg-end) 100%);
    color: var(--text-main);
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(input, textarea, button) {
    font: inherit;
  }

  .layout {
    max-width: 980px;
    margin: 0 auto;
    padding: 1rem;
    display: grid;
    gap: 1rem;
  }

  .layout.home-layout {
    max-width: none;
    width: 100%;
    min-height: 100vh;
    padding: 0;
    gap: 0;
  }

  .popup-overlay {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    z-index: 20;
    background: rgba(10, 24, 46, 0.28);
    padding: 1rem;
    overflow: auto;
  }

  .popup-panel {
    width: min(980px, 96vw);
    max-height: 92vh;
    overflow-y: auto;
    border: 1px solid var(--panel-border);
    border-radius: 14px;
    background: var(--panel-bg);
    box-shadow: 0 18px 40px rgba(12, 36, 72, 0.22);
    padding: 1rem;
    display: grid;
    gap: 0.8rem;
  }

  .popup-close {
    font-weight: 700;
    color: #122f4d;
    justify-self: end;
  }

  .popup-content {
    display: grid;
    gap: 0.8rem;
  }

  h1,
  h2,
  h3,
  h4,
  p {
    margin: 0;
  }

  .muted {
    color: var(--text-muted);
    font-size: 0.92rem;
  }

  button {
    border: 1px solid var(--button-border);
    border-radius: 8px;
    padding: 0.5rem 0.8rem;
    color: var(--button-text);
    background: var(--button-bg);
    cursor: pointer;
  }

  .dictation-selected {
    background: #2f5ea8;
    color: #ffffff;
    border-color: #2f5ea8;
  }

  button:hover {
    background: var(--button-hover-bg);
  }

  .active {
    background: var(--button-text);
    color: var(--button-bg);
  }

  .card {
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 12px;
    padding: 1rem;
    display: grid;
    gap: 0.65rem;
  }

  .home {
    height: 100vh;
    min-height: 100vh;
    max-height: 100vh;
    display: grid;
    place-items: center;
    align-content: center;
    padding: clamp(0.4rem, 1vw, 0.8rem);
    box-sizing: border-box;
    overflow: hidden;
  }

  .home-fullscreen {
    width: min(100vw, 980px);
    height: 100vh;
    max-height: 100vh;
    border-radius: 2rem;
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 0.5rem;
    position: relative;
    padding: clamp(0.35rem, 0.9vw, 0.75rem);
    overflow: hidden;
  }

  .home-fullscreen__halo {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(circle at 50% 48%, rgba(255, 255, 255, 0.22), transparent 63%);
    pointer-events: none;
    filter: blur(0.2rem);
  }

  .home-face {
    position: relative;
    z-index: 1;
    width: clamp(190px, min(82vmin, calc(100vh - 16rem)), 560px);
    height: clamp(190px, min(82vmin, calc(100vh - 16rem)), 560px);
    display: grid;
    justify-items: center;
    gap: 0.6rem;
  }

  .dictation-game-screen {
    display: grid;
    gap: 0.7rem;
    justify-items: center;
    text-align: center;
  }

  .dictation-game-face {
    width: clamp(170px, min(70vmin, 420px), 420px);
    height: clamp(170px, min(70vmin, 420px), 420px);
  }

  .dictation-game-face__frame {
    width: 100%;
    height: 100%;
  }

  .home-msg {
    margin: 0;
    font-size: 0.98rem;
    line-height: 1.42;
  }

  .home-mode {
    margin: 0;
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--muted-text);
  }

  .home-dialog {
    position: absolute;
    top: min(12vh, 120px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
    padding: 0.65rem 0.85rem;
    border-radius: 14px;
    border: 1px solid var(--panel-border);
    background: color-mix(in srgb, var(--panel-bg) 80%, var(--text-color) 5%);
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.08);
    display: grid;
    gap: 0.26rem;
    text-align: center;
    max-width: min(58ch, 86vw);
  }

  .home-dialog:after {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: -8px;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 10px solid color-mix(in srgb, var(--panel-bg) 80%, var(--text-color) 5%);
  }

  @media (max-width: 700px) {
    .home-dialog {
      top: 8vh;
      max-width: min(90vw, 430px);
    }
  }
  .home-msg {
    text-align: center;
    color: var(--text-main);
    line-height: 1.45;
    margin: 0;
    font-size: clamp(0.75rem, 1.5vw, 0.95rem);
  }

  .home-engine-row {
    position: relative;
    z-index: 1;
    width: min(600px, 84vw);
    display: grid;
    justify-content: center;
    gap: 0.45rem;
    grid-template-columns: repeat(2, minmax(160px, 1fr));
  }

  .home-engine-btn {
    height: 2.7rem;
    border: 1px solid var(--panel-border);
    border-radius: 999px;
    background: color-mix(in srgb, var(--panel-bg) 82%, #fff 18%);
    color: var(--text-main);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    width: 100%;
    font-weight: 700;
    padding: 0 0.8rem;
  }

  .home-engine-btn:hover {
    background: color-mix(in srgb, var(--button-hover-bg) 78%, #fff 22%);
  }

  .home-face__frame {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: transparent;
    border: 0;
    display: grid;
    place-items: center;
    box-shadow:
      0 12px 30px rgba(143, 79, 36, 0.22);
    position: relative;
    overflow: visible;
  }

  .home-face__head {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #ffd28b;
    position: relative;
    display: grid;
    place-items: center;
  }

  .home-face__eyes {
    display: flex;
    gap: clamp(14px, 4.4vmin, 44px);
    margin-top: clamp(30px, 8.5vmin, 84px);
  }

  .home-face__eye {
    width: clamp(10px, 2.6vmin, 28px);
    height: clamp(10px, 2.6vmin, 28px);
    border-radius: 50%;
    background: #2d3f57;
    position: relative;
    box-shadow: inset -2px 0 0 rgba(255, 255, 255, 0.7);
  }

  .home-face__eye::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    width: clamp(4px, 1.4vmin, 14px);
    height: clamp(4px, 1.4vmin, 14px);
    top: clamp(2px, 0.7vmin, 10px);
    left: clamp(2px, 0.7vmin, 10px);
    background: #fff;
  }

  .home-face__mouth {
    margin-top: clamp(22px, 6.1vmin, 46px);
    width: clamp(42px, 12vmin, 92px);
    height: clamp(5px, 1.4vmin, 10px);
    border-radius: 999px;
    background: #b45a2a;
  }

  .home-face__cheek {
    position: absolute;
    width: clamp(12px, 3.6vmin, 24px);
    height: clamp(8px, 2.8vmin, 15px);
    background: #f7b3b3;
    border-radius: 50%;
    top: clamp(52px, 18vmin, 168px);
    filter: blur(0.2px);
  }

  .home-face__cheek.left {
    left: clamp(34px, 7.8vmin, 82px);
  }

  .home-face__cheek.right {
    right: clamp(34px, 7.8vmin, 82px);
  }

  .home-face__spark {
    position: absolute;
    width: 6px;
    height: 6px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 50%;
    top: clamp(18px, 9vmin, 56px);
    opacity: 0.85;
    animation: sparkle 2.3s infinite ease-in-out;
  }

  .home-face__spark.left {
    left: clamp(30px, 10.5vmin, 92px);
    animation-delay: 0.3s;
  }

  .home-face__spark.right {
    right: clamp(30px, 10.5vmin, 92px);
    animation-delay: 1.1s;
  }

  .home-face__head[data-mood='wink'] {
    animation: head-bounce 1s ease;
  }

  .home-face__head[data-mood='wink'] .home-face__eye:first-child {
    height: 2px;
    transform: translateY(5px);
    transition: all 90ms ease;
    border-radius: 2px;
  }

  .home-face__head[data-mood='proud'] .home-face__mouth {
    width: clamp(52px, 14vmin, 104px);
    height: clamp(6px, 1.6vmin, 12px);
    background: #e16b24;
  }

  .home-face__head[data-mood='proud'] .home-face__cheek {
    opacity: 0.42;
    transform: scale(1.08);
  }

  .home-face__head[data-mood='curious'] .home-face__mouth {
    width: 38px;
    height: clamp(5px, 1.4vmin, 10px);
    background: #cc6f2f;
    transform: rotate(10deg);
  }

  .home-face__head[data-mood='concern'] .home-face__eye {
    transform: translateY(1px);
  }

  .home-face__head[data-mood='concern'] .home-face__mouth {
    transform: rotate(-8deg);
    background: #9c5e34;
  }

  .home-face__head[data-mood='calm'] .home-face__mouth {
    width: clamp(36px, 10vmin, 80px);
    height: clamp(4px, 1.2vmin, 8px);
    background: #b45a2a;
  }

  .home-face__head[data-mood='wink'],
  .home-face__head[data-mood='proud'],
  .home-face__head[data-mood='curious'],
  .home-face__head[data-mood='concern'],
  .home-face__head[data-mood='calm'] {
    transition: all 260ms ease;
  }

  .home-face__head[data-mood='wink'] {
    animation: head-tilt 0.9s ease;
  }

  @keyframes head-bounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(2px);
    }
  }

  @keyframes head-tilt {
    0% {
      transform: rotate(0deg);
    }
    50% {
      transform: rotate(-3.5deg);
    }
    100% {
      transform: rotate(0deg);
    }
  }

  @keyframes sparkle {
    0%,
    100% {
      transform: scale(0.9);
      opacity: 0.35;
    }
    50% {
      transform: scale(1.25);
      opacity: 1;
    }
  }

  .card {
    transition: transform 180ms ease, box-shadow 180ms ease;
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: var(--card-hover-shadow);
  }

  .engine-title {
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }

  .engine-badge {
    width: 2.1rem;
    height: 2.1rem;
    border-radius: 50%;
    background: var(--engine-bg, #dce9ff);
    color: #0f2b4a;
    display: grid;
    place-items: center;
    border: 2px solid var(--engine-color, #7ab3f7);
    font-size: 1.05rem;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
  }

  .grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .count {
    font-weight: 600;
  }

  .toolbar,
  .inline {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .header-row {
    align-items: center;
  }

  .toast {
    position: fixed;
    top: 0.9rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 30;
    width: min(96vw, 680px);
    box-sizing: border-box;
    border-radius: 8px;
    padding: 0.6rem 0.8rem;
    border: 1px solid transparent;
  }

  .toast.ok {
    background: var(--toast-ok-bg);
    border-color: var(--toast-ok-border);
    color: var(--toast-ok-text);
  }

  .toast.error {
    background: var(--toast-err-bg);
    border-color: var(--toast-err-border);
    color: var(--toast-err-text);
  }

  .dataset {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.8rem;
    border: 1px dashed var(--panel-border);
    border-radius: 10px;
    padding: 0.6rem;
  }

  .dataset-actions {
    display: flex;
    gap: 0.45rem;
  }

  .item-check {
    display: flex;
    gap: 0.6rem;
    align-items: flex-start;
  }

  input[type='text'],
  input[type='url'],
  textarea {
    width: 100%;
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    background: var(--panel-bg);
    padding: 0.55rem 0.65rem;
  }

  textarea {
    min-height: 160px;
    resize: vertical;
  }

  .error {
    color: #f25f5f;
  }

  .dataset h4,
  .dataset p {
    margin: 0;
  }

  .dataset p.muted {
    margin-top: 0.28rem;
    max-width: 100%;
    overflow-wrap: anywhere;
    font-size: 0.82rem;
  }

  @media (max-width: 720px) {
    .toolbar,
    .inline {
      flex-direction: column;
      align-items: stretch;
    }

    .home {
      min-height: 100vh;
      padding: 0.4rem;
    }

    .home-fullscreen {
      min-height: 100vh;
      width: 100vw;
      border-radius: 0;
      padding: 0.8rem 0.45rem;
    }

    .home-face {
      width: 94vw;
      height: 94vw;
    }

    .home-engine-row {
      width: 100%;
      grid-template-columns: 1fr;
      gap: 0.55rem;
    }

    .popup-overlay {
      align-items: flex-start;
      padding: 0.6rem;
    }

    .popup-panel {
      width: 100%;
      max-height: 95vh;
      border-radius: 12px;
      padding: 0.85rem;
    }

  }

  .disabled {
    opacity: 0.6;
    pointer-events: none;
  }
</style>
