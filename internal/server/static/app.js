(() => {
  const config = window.HOMI_CONFIG;
  const page = document.body.dataset.page || 'home';
  const engineId = document.body.dataset.engineId || '';
  const state = {
    session: null,
    datasetRecords: [],
    datasetsByEngine: {},
    uiRecord: null,
    ui: {},
    selectedDataset: null,
    importSelection: null,
    activeTab: 'url',
    dictation: null,
    dictationTimer: null,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    setInterval(updateClock, 1000);
    bindActions();
    void boot();
  });

  async function boot() {
    try {
      if (config.loginOnStartup) {
        await ensureLogin();
      }
      await loadStore();
      renderAll();
    } catch (error) {
      showStatus(error.message || '오류가 발생했습니다.', 'error');
    }
  }

  async function ensureLogin() {
    const status = $('[data-testid="auth-status"]');
    if (status) status.textContent = 'Ohmesh 로그인 확인 중';

    const response = await fetch(`${config.ohmeshBaseUrl}/auth/me?app=${encodeURIComponent(config.ohmeshAppSlug)}&optional=1`, {
      credentials: 'include',
    });

    if (response.status === 204 || response.status === 401) {
      location.href = loginURL();
      return new Promise(() => {});
    }
    if (!response.ok) {
      throw new Error('Ohmesh 로그인 상태를 확인하지 못했습니다.');
    }

    state.session = await response.json();
    if (status) {
      const email = state.session?.user?.email || state.session?.user?.name || '로그인됨';
      status.textContent = `${email} · ${state.session?.app?.slug || config.ohmeshAppSlug}`;
    }
  }

  function loginURL() {
    const url = new URL(`${config.ohmeshBaseUrl}/login`);
    url.searchParams.set('app', config.ohmeshAppSlug);
    url.searchParams.set('redirect_url', location.href);
    return url.toString();
  }

  function logoutURL() {
    const url = new URL(`${config.ohmeshBaseUrl}/logout`);
    url.searchParams.set('app', config.ohmeshAppSlug);
    url.searchParams.set('redirect_url', location.origin + '/');
    return url.toString();
  }

  async function loadStore() {
    const [datasetRecords, uiRecords] = await Promise.all([
      fetchRecords(config.recordTypes.dataset),
      fetchRecords(config.recordTypes.ui),
    ]);

    state.datasetRecords = datasetRecords
      .filter((record) => record && record.data && isEngineId(record.data.engineId))
      .map((record) => ({
        ...record,
        data: {
          ...clone(record.data),
          __recordId: record.id,
        },
      }));

    state.datasetsByEngine = {};
    for (const record of state.datasetRecords) {
      const dataset = record.data;
      if (!state.datasetsByEngine[dataset.engineId]) {
        state.datasetsByEngine[dataset.engineId] = [];
      }
      state.datasetsByEngine[dataset.engineId].push(dataset);
    }

    state.uiRecord = uiRecords[0] || null;
    state.ui = state.uiRecord?.data && typeof state.uiRecord.data === 'object' ? clone(state.uiRecord.data) : {};
  }

  async function fetchRecords(type) {
    const url = new URL(`${config.ohmeshBaseUrl}/api/apps/${encodeURIComponent(config.ohmeshAppSlug)}/records`);
    url.searchParams.set('type', type);
    url.searchParams.set('limit', '500');
    url.searchParams.set('offset', '0');
    const response = await fetch(url, { credentials: 'include' });
    if (response.status === 401) {
      location.href = loginURL();
      return new Promise(() => {});
    }
    if (!response.ok) {
      throw new Error('Ohmesh 데이터를 읽지 못했습니다.');
    }
    const payload = await response.json();
    return Array.isArray(payload.records) ? payload.records : [];
  }

  async function createRecord(type, data) {
    const response = await fetch(`${config.ohmeshBaseUrl}/api/apps/${encodeURIComponent(config.ohmeshAppSlug)}/records`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data }),
    });
    if (!response.ok) {
      throw new Error(await apiError(response, 'Ohmesh record를 생성하지 못했습니다.'));
    }
    return response.json();
  }

  async function patchRecord(id, data, type) {
    const body = type ? { type, data } : { data };
    const response = await fetch(`${config.ohmeshBaseUrl}/api/apps/${encodeURIComponent(config.ohmeshAppSlug)}/records/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(await apiError(response, 'Ohmesh record를 수정하지 못했습니다.'));
    }
    return response.json();
  }

  async function deleteRecord(id) {
    const response = await fetch(`${config.ohmeshBaseUrl}/api/apps/${encodeURIComponent(config.ohmeshAppSlug)}/records/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(await apiError(response, 'Ohmesh record를 삭제하지 못했습니다.'));
    }
  }

  async function apiError(response, fallback) {
    try {
      const payload = await response.json();
      return payload.error || fallback;
    } catch {
      return fallback;
    }
  }

  function bindActions() {
    document.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-tab]');
      if (tab) {
        selectTab(tab.dataset.tab);
        return;
      }

      const row = event.target.closest('[data-dataset-id]');
      if (row && row.dataset.datasetId) {
        selectDataset(row.dataset.datasetId);
        return;
      }

      const action = event.target.closest('[data-action]')?.dataset.action;
      if (!action) return;

      const task = actionHandlers[action];
      if (task) {
        event.preventDefault();
        void task();
      }
    });
  }

  const actionHandlers = {
    logout: () => {
      location.href = logoutURL();
    },
    'preview-url': previewURLImport,
    'preview-text': previewTextImport,
    'preview-file': previewFileImport,
    'preview-sample': previewSampleImport,
    'confirm-import': confirmImport,
    'cancel-import': () => {
      state.importSelection = null;
      renderImportPreview();
    },
    'quiet-enable': () => saveUI({ scheduleQuietUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString() }),
    'quiet-clear': () => saveUI({ scheduleQuietUntil: null }),
    'theme-light': () => saveUI({ themeMode: 'light' }),
    'theme-dark': () => saveUI({ themeMode: 'dark' }),
    'robot-classic': () => saveUI({ robotStyle: 'classic' }),
    'robot-mint': () => saveUI({ robotStyle: 'mint' }),
    'robot-midnight': () => saveUI({ robotStyle: 'midnight' }),
    'debug-show': () => saveUI({ debugAreasVisible: true }),
    'debug-hide': () => saveUI({ debugAreasVisible: false }),
    'save-dataset': saveDatasetFromForm,
    'new-dataset': () => {
      state.selectedDataset = null;
      renderEngine();
    },
    'delete-dataset': deleteSelectedDataset,
    'toggle-chime': () => saveUI({ scheduleHourlyChimeEnabled: !state.ui.scheduleHourlyChimeEnabled }),
    'start-dictation': startDictation,
    'dictation-next': nextDictation,
    'dictation-exit': exitDictation,
  };

  function renderAll() {
    applyTheme();
    renderHome();
    if (page === 'brain') {
      renderBrain();
    }
    if (page === 'engine') {
      renderEngine();
    }
  }

  function renderHome() {
    const count = state.datasetRecords.length;
    const quietUntil = state.ui.scheduleQuietUntil ? Date.parse(state.ui.scheduleQuietUntil) : 0;
    const status = $('.home-status-text');
    const mode = $('.home-mode-text');
    if (mode) {
      mode.hidden = !state.dictation;
      mode.textContent = state.dictation ? '현재 모드: 받아쓰기 실행모드' : '';
    }
    if (status) {
      if (state.dictation) {
        status.hidden = false;
        status.dataset.tone = 'running';
        status.textContent = '받아쓰기를 진행하고 있어요';
      } else if (quietUntil > Date.now()) {
        status.hidden = false;
        status.dataset.tone = 'default';
        status.textContent = `조용히 모드 ${formatRemaining(quietUntil - Date.now())}`;
      } else if (count === 0 && page !== 'home') {
        status.hidden = false;
        status.dataset.tone = 'default';
        status.textContent = '저장된 자료 세트가 없습니다';
      } else {
        status.hidden = true;
        status.textContent = '';
      }
    }

    const grid = $('[data-testid="home-area-grid"]');
    const labelLayer = $('[data-debug-label-layer]');
    if (grid) grid.dataset.debugAreas = state.ui.debugAreasVisible ? 'visible' : 'hidden';
    if (labelLayer) labelLayer.hidden = !state.ui.debugAreasVisible;
    renderDebugLayer();
  }

  function renderBrain() {
    selectTab(state.activeTab);
    const sync = $('[data-testid="backup-url-sync-status"]');
    if (sync) {
      sync.textContent = state.ui.linkedImport?.url
        ? `연결된 URL: ${state.ui.linkedImport.url}`
        : '연결된 URL 없음';
    }
    const quiet = $('[data-testid="backup-quiet-status"]');
    if (quiet) {
      const until = state.ui.scheduleQuietUntil ? Date.parse(state.ui.scheduleQuietUntil) : 0;
      quiet.textContent = until > Date.now() ? `조용히 모드 ${formatRemaining(until - Date.now())}` : '조용히 모드 꺼짐';
    }
    setText('[data-testid="backup-theme-status"]', `테마: ${themeMode()}`);
    setText('[data-testid="backup-robot-style-status"]', `로봇: ${robotStyle()}`);
    setText('[data-testid="backup-debug-areas-status"]', `디버그 영역: ${state.ui.debugAreasVisible ? 'Show' : 'Hidden'}`);
    renderImportPreview();
  }

  function renderEngine() {
    const datasets = state.datasetsByEngine[engineId] || [];
    const list = $('[data-testid="dataset-list"]');
    if (list) {
      list.replaceChildren(...datasets.map((dataset) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'dataset-row';
        button.dataset.testid = 'dataset-row';
        button.setAttribute('data-testid', 'dataset-row');
        button.dataset.engineId = dataset.engineId;
        button.dataset.datasetId = dataset.id;
        button.dataset.datasetTitle = dataset.title;
        button.setAttribute('aria-selected', state.selectedDataset?.id === dataset.id ? 'true' : 'false');
        button.innerHTML = `<strong></strong><span></span>`;
        button.querySelector('strong').textContent = dataset.title;
        button.querySelector('span').textContent = `${dataset.items?.length || 0} items`;
        return button;
      }));
    }

    if (!state.selectedDataset && datasets.length > 0) {
      state.selectedDataset = datasets[0];
    }
    fillDatasetForm();
    setText('[data-testid="engine-status"]', `${datasets.length}개 자료 세트`);

    if (engineId === 'schedule') {
      renderSchedulePreview();
    }
  }

  function fillDatasetForm() {
    const title = $('[data-testid="dataset-title-input"]');
    const items = $('[data-testid="dataset-items-input"]');
    const enabled = $('[data-testid="schedule-enabled-toggle"]');
    if (!title || !items || !enabled) return;

    const dataset = state.selectedDataset;
    title.value = dataset?.title || '';
    items.value = JSON.stringify(dataset?.items || [], null, 2);
    enabled.checked = dataset ? dataset.meta?.enabled !== false : true;
  }

  function renderSchedulePreview() {
    setText('[data-testid="schedule-hourly-chime-status"]', `정시 차임: ${state.ui.scheduleHourlyChimeEnabled ? 'On' : 'Off'}`);
    const list = $('[data-testid="schedule-preview-list"]');
    if (!list) return;
    const datasets = (state.datasetsByEngine.schedule || []).filter((dataset) => dataset.meta?.enabled !== false);
    const buttons = [];
    for (const dataset of datasets) {
      for (const item of dataset.items || []) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'preview-item';
        button.setAttribute('data-testid', 'schedule-preview-item');
        button.innerHTML = '<strong></strong><span></span>';
        button.querySelector('strong').textContent = item.title || '일정';
        button.querySelector('span').textContent = scheduleMetaText(item);
        button.addEventListener('click', () => {
          setText('[data-testid="schedule-preview-status"]', item.title || '일정');
          speakOrAudio(item.title || '일정', item.audioUrl);
        });
        buttons.push(button);
      }
    }
    list.replaceChildren(...buttons);
  }

  function renderImportPreview() {
    const preview = $('[data-testid="backup-preview"]');
    const confirm = $('[data-testid="backup-confirm"]');
    if (!preview || !confirm) return;
    if (!state.importSelection) {
      preview.hidden = true;
      preview.replaceChildren();
      confirm.disabled = true;
      return;
    }

    const items = state.importSelection.datasets.map((dataset) => {
      const row = document.createElement('div');
      row.className = 'preview-item';
      row.innerHTML = '<strong></strong><span></span>';
      row.querySelector('strong').textContent = dataset.title;
      row.querySelector('span').textContent = `${dataset.engineId} · ${dataset.items?.length || 0} items`;
      return row;
    });
    preview.replaceChildren(...items);
    preview.hidden = false;
    confirm.disabled = false;
  }

  async function previewTextImport() {
    const raw = $('[data-testid="backup-text-input"]')?.value || '';
    await previewRaw(raw, 'text');
  }

  async function previewFileImport() {
    const input = $('[data-testid="backup-file-input"]');
    const file = input?.files?.[0];
    if (!file) {
      showStatus('파일을 선택해주세요.', 'error');
      return;
    }
    await previewRaw(await file.text(), 'file');
  }

  async function previewSampleImport() {
    const response = await fetch('/samples/homi.sample.homi.json');
    if (!response.ok) {
      showStatus('샘플을 읽지 못했습니다.', 'error');
      return;
    }
    await previewRaw(await response.text(), 'sample');
  }

  async function previewURLImport() {
    const input = $('[data-testid="backup-url-input"]');
    const normalized = normalizeImportURL(input?.value || '');
    if (!normalized.ok) {
      showStatus(normalized.error, 'error');
      return;
    }
    try {
      const response = await fetch(normalized.url);
      if (!response.ok) {
        showStatus('URL 데이터를 읽지 못했습니다.', 'error');
        return;
      }
      await previewRaw(await response.text(), 'url', normalized.url);
    } catch {
      showStatus('URL fetch가 실패했습니다. CORS 설정을 확인해주세요.', 'error');
    }
  }

  async function previewRaw(raw, sourceType, sourceUrl = null) {
    const response = await fetch('/api/bundles/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: raw,
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      showStatus((payload.errors || ['미리보기 실패']).join(', '), 'error');
      return;
    }
    state.importSelection = {
      bundle: payload.bundle,
      datasets: payload.datasets,
      sourceType,
      sourceUrl,
    };
    showStatus('미리보기가 준비되었습니다.', 'default');
    renderImportPreview();
  }

  async function confirmImport() {
    if (!state.importSelection) return;
    const now = new Date().toISOString();
    const selected = state.importSelection.datasets;
    const seen = new Set();
    const imported = selected.map((payload) => {
      const hadConflict = payload.id && seen.has(payload.id);
      const id = payload.id && !hadConflict ? payload.id : createId('ds');
      seen.add(id);
      const source = {
        type: state.importSelection.sourceType,
        importedAt: now,
        bundleId: state.importSelection.bundle.bundleId,
      };
      if (state.importSelection.sourceType === 'url') {
        source.url = state.importSelection.sourceUrl;
      }
      if (hadConflict) {
        source.originalDatasetId = payload.id;
      }
      return {
        ...clone(payload),
        id,
        createdAt: now,
        updatedAt: now,
        source,
      };
    });

    for (const record of state.datasetRecords) {
      await deleteRecord(record.id);
    }
    for (const dataset of imported) {
      await createRecord(config.recordTypes.dataset, dataset);
    }
    if (state.importSelection.sourceType === 'url' && state.importSelection.sourceUrl) {
      await saveUI({
        linkedImport: {
          sourceType: 'url',
          url: state.importSelection.sourceUrl,
        },
      }, false);
    }

    state.importSelection = null;
    await loadStore();
    renderAll();
    showStatus('가져오기를 적용했습니다.', 'default');
  }

  async function saveDatasetFromForm() {
    const title = $('[data-testid="dataset-title-input"]')?.value.trim();
    const rawItems = $('[data-testid="dataset-items-input"]')?.value || '[]';
    const enabled = $('[data-testid="schedule-enabled-toggle"]')?.checked !== false;
    if (!title) {
      showStatus('자료 세트 제목이 필요합니다.', 'error');
      return;
    }
    let items;
    try {
      items = JSON.parse(rawItems);
    } catch {
      showStatus('items JSON 형식이 올바르지 않습니다.', 'error');
      return;
    }
    const now = new Date().toISOString();
    const current = state.selectedDataset;
    const dataset = stripPrivate({
      ...(current || {}),
      id: current?.id || createId('ds'),
      engineId,
      engineSchemaVersion: 1,
      title,
      items,
      meta: {
        ...(current?.meta || {}),
        enabled,
      },
      createdAt: current?.createdAt || now,
      updatedAt: now,
      source: current?.source,
    });

    const bundle = {
      format: 'homi',
      version: 1,
      bundleType: 'import',
      datasets: [dataset],
    };
    const response = await fetch('/api/bundles/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bundle),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      showStatus((payload.errors || ['검증 실패']).join(', '), 'error');
      return;
    }

    if (current?.__recordId) {
      await patchRecord(current.__recordId, dataset, config.recordTypes.dataset);
    } else {
      await createRecord(config.recordTypes.dataset, dataset);
    }
    await loadStore();
    state.selectedDataset = findDataset(dataset.id);
    renderAll();
    showStatus('자료 세트를 저장했습니다.', 'default');
  }

  async function deleteSelectedDataset() {
    if (!state.selectedDataset?.__recordId) return;
    await deleteRecord(state.selectedDataset.__recordId);
    state.selectedDataset = null;
    await loadStore();
    renderAll();
  }

  async function saveUI(patch, rerender = true) {
    state.ui = {
      ...state.ui,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    if (state.uiRecord?.id) {
      state.uiRecord = await patchRecord(state.uiRecord.id, state.ui, config.recordTypes.ui);
    } else {
      state.uiRecord = await createRecord(config.recordTypes.ui, state.ui);
    }
    if (rerender) {
      await loadStore();
      renderAll();
    }
  }

  function selectTab(tab) {
    state.activeTab = tab || 'url';
    $$('[data-tab]').forEach((button) => {
      button.setAttribute('aria-selected', button.dataset.tab === state.activeTab ? 'true' : 'false');
    });
    $$('[data-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.panel !== state.activeTab;
    });
  }

  function selectDataset(datasetID) {
    state.selectedDataset = findDataset(datasetID);
    renderEngine();
  }

  function findDataset(datasetID) {
    for (const list of Object.values(state.datasetsByEngine)) {
      const found = list.find((dataset) => dataset.id === datasetID);
      if (found) return found;
    }
    return null;
  }

  function startDictation() {
    const dataset = state.selectedDataset || (state.datasetsByEngine.dictation || [])[0];
    if (!dataset || !Array.isArray(dataset.items) || dataset.items.length === 0) {
      showStatus('실행할 받아쓰기 자료가 없습니다.', 'error');
      return;
    }
    state.dictation = {
      dataset,
      index: 0,
    };
    renderDictationRunner();
    scheduleDictationTick();
  }

  function nextDictation() {
    if (!state.dictation) return;
    const nextIndex = state.dictation.index + 1;
    if (nextIndex >= state.dictation.dataset.items.length) {
      exitDictation();
      return;
    }
    state.dictation.index = nextIndex;
    renderDictationRunner();
    scheduleDictationTick();
  }

  function exitDictation() {
    if (state.dictationTimer) {
      clearTimeout(state.dictationTimer);
      state.dictationTimer = null;
    }
    state.dictation = null;
    renderDictationRunner();
    renderHome();
  }

  function scheduleDictationTick() {
    if (state.dictationTimer) clearTimeout(state.dictationTimer);
    state.dictationTimer = setTimeout(nextDictation, 10_000);
  }

  function renderDictationRunner() {
    const runner = $('[data-testid="dictation-root"]');
    if (!runner) return;
    if (!state.dictation) {
      runner.hidden = true;
      renderHome();
      return;
    }
    const item = state.dictation.dataset.items[state.dictation.index];
    runner.hidden = false;
    setText('[data-testid="dictation-progress"]', `${state.dictation.index + 1} / ${state.dictation.dataset.items.length}`);
    setText('[data-testid="dictation-word"]', item.word || '');
    setText('[data-testid="dictation-meaning"]', item.meaning || item.hint || '');
    speakOrAudio(item.word || '', item.audioUrl);
    renderHome();
  }

  function speakOrAudio(text, audioUrl) {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => speak(text));
      return;
    }
    speak(text);
  }

  function speak(text) {
    if (!text || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    window.speechSynthesis.speak(utterance);
  }

  function applyTheme() {
    document.documentElement.dataset.theme = themeMode();
    const style = robotStyle();
    $$('[data-face-head], [data-face-frame]').forEach((node) => {
      node.dataset.style = style;
    });
  }

  function renderDebugLayer() {
    let layer = $('#debug-layer-root');
    if (!state.ui.debugAreasVisible) {
      layer?.remove();
      return;
    }
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'debug-layer-root';
      document.body.append(layer);
    }
    const popup = page === 'brain' ? 'brain' : page === 'engine' ? engineId : '';
    layer.innerHTML = `
      <span data-testid="debug-page-name">page=${page}</span>
      ${popup ? `<span data-testid="debug-popup-name">popup=${popup}</span>` : ''}
      <span class="debug-section-label" data-debug-target-kind="section" data-debug-target-id="home-bubble-section">home-bubble-section</span>
    `;
  }

  function updateClock() {
    const now = new Date();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    setText('[data-testid="home-clock-date"]', `${now.getFullYear()}.${pad2(now.getMonth() + 1)}.${pad2(now.getDate())} ${weekdays[now.getDay()]}요일`);
    setText('[data-testid="home-clock-time"]', `${pad2(now.getHours())}:${pad2(now.getMinutes())}`);
  }

  function showStatus(text, tone = 'default') {
    const homeStatus = $('.home-status-text');
    if (homeStatus) {
      homeStatus.hidden = false;
      homeStatus.dataset.tone = tone;
      homeStatus.textContent = text;
    }
    setText('[data-testid="engine-status"]', text);
  }

  function normalizeImportURL(raw) {
    const value = raw.trim();
    if (!value) return { ok: false, error: 'URL을 입력해주세요.' };
    if (value.toLowerCase().startsWith('javascript:')) {
      return { ok: false, error: 'javascript: 스킴은 사용할 수 없습니다.' };
    }
    try {
      const parsed = new URL(value);
      if (parsed.protocol === 'javascript:') {
        return { ok: false, error: 'javascript: 스킴은 사용할 수 없습니다.' };
      }
      if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && parsed.hostname === 'localhost')) {
        return { ok: true, url: parsed.href };
      }
      return { ok: false, error: '현재 v1에서는 https URL만 허용합니다.' };
    } catch {
      return { ok: false, error: '올바른 URL 형식이 아닙니다.' };
    }
  }

  function scheduleMetaText(item) {
    if (item.repeat === 'daily') return `매일 ${item.timeStart || ''}`;
    if (item.repeat === 'yearly') return `매년 ${item.monthDay || ''} ${item.timeStart || ''}`;
    if (item.repeatIntervalSec) return `${item.repeatIntervalSec}초 간격`;
    return item.timeStart || item.date || '';
  }

  function formatRemaining(ms) {
    const minutes = Math.max(0, Math.ceil(ms / 60_000));
    return `${minutes}분 남음`;
  }

  function createId(prefix) {
    if (crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function stripPrivate(dataset) {
    const copy = clone(dataset);
    delete copy.__recordId;
    return copy;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isEngineId(value) {
    return value === 'schedule' || value === 'dictation';
  }

  function themeMode() {
    return state.ui.themeMode === 'dark' ? 'dark' : 'light';
  }

  function robotStyle() {
    return ['classic', 'mint', 'midnight'].includes(state.ui.robotStyle) ? state.ui.robotStyle : 'classic';
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function setText(selector, text) {
    const node = $(selector);
    if (node) node.textContent = text;
  }
})();
