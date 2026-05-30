(() => {
  const config = {
    ohmeshBaseUrl: 'https://ohmesh.jjgo.io',
    ohmeshAppSlug: 'homi',
    redirectUrl: `${location.origin}/`,
    recordTypes: {
      dataset: 'homi.dataset.v1',
      ui: 'homi.ui.v1',
    },
    ...(window.HOMI_CONFIG || {}),
  };
  const postLoginKey = 'homi:post-login-path';
  const state = {
    route: readRoute(),
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
    reminderTimer: null,
    reminderSlots: new Map(),
    faceSpeakingUntil: 0,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    setInterval(updateClock, 1000);
    startFaceMotion();
    bindActions();
    bindNavigation();
    void boot();
  });

  window.addEventListener('popstate', () => {
    state.route = readRoute();
    void boot();
  });

  function readRoute() {
    const path = location.pathname.replace(/\/$/, '') || '/';
    if (path === '/' || path === '/index.html') return { page: 'intro' };
    if (path === '/face') return { page: 'home' };
    if (path === '/face/manage' || path === '/brain') return { page: 'brain' };
    const match = path.match(/^\/engines\/([^/?#]+)$/);
    if (match && isEngineId(match[1])) return { page: 'engine', engineId: match[1] };
    return { page: 'intro', unknownPath: path };
  }

  function isProtectedRoute() {
    return state.route.page === 'home' || state.route.page === 'brain' || state.route.page === 'engine';
  }

  async function boot() {
    try {
      setPanels('intro');
      await refreshSession();
      if (state.session) {
        const pendingPath = sessionStorage.getItem(postLoginKey);
        sessionStorage.removeItem(postLoginKey);
        if (pendingPath && state.route.page === 'intro') {
          navigate(pendingPath, true);
          return;
        }
      }

      if (state.route.page === 'intro') {
        stopReminderLoop();
        renderIntro();
        setPanels('intro');
        return;
      }

      if (!state.session) {
        stopReminderLoop();
        renderLoginRequired();
        setPanels('login');
        return;
      }

      await loadStore();
      renderAll();
      startReminderLoop();
      setPanels('app');
    } catch (error) {
      if (isProtectedRoute()) {
        renderLoginRequired(error.message || 'Ohmesh 상태를 확인하지 못했습니다.');
        setPanels('login');
      } else {
        setText('[data-testid="intro-status"]', error.message || 'Ohmesh 상태를 확인하지 못했습니다.');
        setPanels('intro');
      }
    }
  }

  function setPanels(active) {
    $$('[data-page-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.pagePanel !== active;
    });
  }

  async function refreshSession() {
    const url = new URL(`${config.ohmeshBaseUrl}/auth/me`);
    url.searchParams.set('app', config.ohmeshAppSlug);
    url.searchParams.set('optional', '1');
    const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
    if (response.status === 204 || response.status === 401) {
      state.session = null;
      return;
    }
    if (!response.ok) {
      throw new Error('Ohmesh 로그인 상태를 확인하지 못했습니다.');
    }
    state.session = await response.json();
  }

  function renderIntro() {
    const user = sessionLabel();
    const login = $('[data-testid="intro-login"]');
    const open = $('[data-testid="intro-open-face"]');
    if (login) login.hidden = Boolean(state.session);
    if (open) open.hidden = !state.session;
    setText('[data-testid="intro-status"]', state.session ? `${user} · 로그인됨` : '로그인 후 페이스 페이지를 열 수 있습니다.');
  }

  function renderLoginRequired(message = '로그인하면 페이스 페이지를 열 수 있습니다.') {
    setText('[data-testid="login-required-status"]', message);
  }

  function loginURL(nextPath = '/face') {
    sessionStorage.setItem(postLoginKey, nextPath);
    const url = new URL(`${config.ohmeshBaseUrl}/login`);
    url.searchParams.set('app', config.ohmeshAppSlug);
    url.searchParams.set('redirect_url', config.redirectUrl || `${location.origin}/`);
    return url.toString();
  }

  function logoutURL() {
    sessionStorage.removeItem(postLoginKey);
    const url = new URL(`${config.ohmeshBaseUrl}/logout`);
    url.searchParams.set('app', config.ohmeshAppSlug);
    url.searchParams.set('redirect_url', config.redirectUrl || `${location.origin}/`);
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
      if (!state.datasetsByEngine[dataset.engineId]) state.datasetsByEngine[dataset.engineId] = [];
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
    const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
    if (response.status === 401) {
      throw new Error('Ohmesh 로그인이 필요합니다.');
    }
    if (!response.ok) {
      throw new Error('저장된 데이터를 불러오지 못했습니다.');
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
    if (!response.ok) throw new Error(await apiError(response, 'Ohmesh record를 생성하지 못했습니다.'));
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
    if (!response.ok) throw new Error(await apiError(response, 'Ohmesh record를 수정하지 못했습니다.'));
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

  function bindNavigation() {
    document.addEventListener('click', (event) => {
      const anchor = event.target.closest('a[href^="/"]');
      if (!anchor || anchor.target || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(anchor.getAttribute('href'));
    });
  }

  function navigate(path, replace = false) {
    if (replace) {
      history.replaceState({}, '', path);
    } else {
      history.pushState({}, '', path);
    }
    state.route = readRoute();
    state.selectedDataset = null;
    state.importSelection = null;
    void boot();
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
    'login-face': () => {
      location.href = loginURL('/face');
    },
    'login-current': () => {
      location.href = loginURL(location.pathname || '/face');
    },
    'open-face': () => navigate('/face'),
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
    renderRouteChrome();
    renderHome();
    if (state.route.page === 'brain') renderBrain();
    if (state.route.page === 'engine') renderEngine();
  }

  function renderRouteChrome() {
    $('[data-overlay="brain"]').hidden = state.route.page !== 'brain';
    $('[data-overlay="engine"]').hidden = state.route.page !== 'engine';
    const schedulePanel = $('[data-engine-panel="schedule"]');
    const dictationPanel = $('[data-engine-panel="dictation"]');
    if (schedulePanel) schedulePanel.hidden = state.route.engineId !== 'schedule';
    if (dictationPanel) dictationPanel.hidden = state.route.engineId !== 'dictation';
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
      } else if (count === 0) {
        status.hidden = false;
        status.dataset.tone = 'default';
        status.textContent = '저장된 자료 세트가 없습니다';
      } else {
        status.hidden = true;
        status.textContent = '';
      }
    }
    updateFaceMood(status);
  }

  function renderBrain() {
    selectTab(state.activeTab);
    const sync = $('[data-testid="backup-url-sync-status"]');
    if (sync) {
      sync.textContent = state.ui.linkedImport?.url ? `연결된 URL: ${state.ui.linkedImport.url}` : '연결된 URL 없음';
    }
    const quiet = $('[data-testid="backup-quiet-status"]');
    if (quiet) {
      const until = state.ui.scheduleQuietUntil ? Date.parse(state.ui.scheduleQuietUntil) : 0;
      quiet.textContent = until > Date.now() ? `조용히 모드 ${formatRemaining(until - Date.now())}` : '조용히 모드 꺼짐';
    }
    setText('[data-testid="auth-status"]', `${sessionLabel()} · ${config.ohmeshAppSlug}`);
    setText('[data-testid="backup-theme-status"]', `테마: ${themeMode()}`);
    setText('[data-testid="backup-robot-style-status"]', `로봇: ${robotStyle()}`);
    renderImportPreview();
  }

  function renderEngine() {
    const titleText = state.route.engineId === 'schedule' ? '스케줄' : '받아쓰기';
    $$('[data-engine-title]').forEach((node) => {
      node.textContent = titleText;
    });

    const datasets = state.datasetsByEngine[state.route.engineId] || [];
    const list = $('[data-testid="dataset-list"]');
    if (list) {
      list.replaceChildren(...datasets.map((dataset) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'dataset-row';
        button.setAttribute('data-testid', 'dataset-row');
        button.dataset.engineId = dataset.engineId;
        button.dataset.datasetId = dataset.id;
        button.dataset.datasetTitle = dataset.title;
        button.setAttribute('aria-selected', state.selectedDataset?.id === dataset.id ? 'true' : 'false');
        button.innerHTML = '<strong></strong><span></span>';
        button.querySelector('strong').textContent = dataset.title;
        button.querySelector('span').textContent = `${dataset.items?.length || 0} items`;
        return button;
      }));
    }

    if (!state.selectedDataset && datasets.length > 0) state.selectedDataset = datasets[0];
    fillDatasetForm();
    setText('[data-testid="engine-status"]', `${datasets.length}개 자료 세트`);
    if (state.route.engineId === 'schedule') renderSchedulePreview();
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
    previewRaw(raw, 'text');
  }

  async function previewFileImport() {
    const input = $('[data-testid="backup-file-input"]');
    const file = input?.files?.[0];
    if (!file) {
      showStatus('파일을 선택해주세요.', 'error');
      return;
    }
    previewRaw(await file.text(), 'file');
  }

  async function previewSampleImport() {
    const response = await fetch('/samples/homi.sample.homi.json');
    if (!response.ok) {
      showStatus('샘플을 읽지 못했습니다.', 'error');
      return;
    }
    previewRaw(await response.text(), 'sample');
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
      previewRaw(await response.text(), 'url', normalized.url);
    } catch {
      showStatus('URL fetch가 실패했습니다. CORS 설정을 확인해주세요.', 'error');
    }
  }

  function previewRaw(raw, sourceType, sourceUrl = null) {
    const payload = parseBundle(raw);
    if (!payload.ok) {
      showStatus(payload.error, 'error');
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

  function parseBundle(raw) {
    let bundle;
    try {
      bundle = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'JSON 형식이 올바르지 않습니다.' };
    }
    if (!bundle || !Array.isArray(bundle.datasets)) {
      return { ok: false, error: 'datasets 배열이 필요합니다.' };
    }
    const now = new Date().toISOString();
    const datasets = [];
    for (const input of bundle.datasets) {
      if (!isEngineId(input.engineId)) return { ok: false, error: '지원하지 않는 engineId가 있습니다.' };
      if (!input.title || !Array.isArray(input.items)) return { ok: false, error: 'dataset title과 items가 필요합니다.' };
      datasets.push({
        id: input.id || createId('ds'),
        engineId: input.engineId,
        engineSchemaVersion: input.engineSchemaVersion || 1,
        title: input.title,
        items: input.items,
        meta: input.meta || {},
        source: input.source,
        createdAt: input.createdAt || now,
        updatedAt: now,
      });
    }
    return { ok: true, bundle, datasets };
  }

  async function confirmImport() {
    if (!state.importSelection) return;
    const now = new Date().toISOString();
    const selected = state.importSelection.datasets;
    for (const record of state.datasetRecords) await deleteRecord(record.id);
    for (const payload of selected) {
      await createRecord(config.recordTypes.dataset, {
        ...payload,
        id: payload.id || createId('ds'),
        updatedAt: now,
      });
    }
    if (state.importSelection.sourceType === 'url' && state.importSelection.sourceUrl) {
      await saveUI({ linkedImport: { sourceType: 'url', url: state.importSelection.sourceUrl } }, false);
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
    if (!Array.isArray(items)) {
      showStatus('items는 배열이어야 합니다.', 'error');
      return;
    }
    const now = new Date().toISOString();
    const current = state.selectedDataset;
    const dataset = stripPrivate({
      ...(current || {}),
      id: current?.id || createId('ds'),
      engineId: state.route.engineId,
      engineSchemaVersion: current?.engineSchemaVersion || 1,
      title,
      items,
      meta: { ...(current?.meta || {}), enabled },
      source: current?.source || { type: 'manual' },
      createdAt: current?.createdAt || now,
      updatedAt: now,
    });

    if (current?.__recordId) {
      await patchRecord(current.__recordId, dataset, config.recordTypes.dataset);
    } else {
      await createRecord(config.recordTypes.dataset, dataset);
    }
    await loadStore();
    state.selectedDataset = (state.datasetsByEngine[state.route.engineId] || []).find((item) => item.id === dataset.id) || null;
    renderAll();
    showStatus('자료 세트를 저장했습니다.', 'default');
  }

  async function deleteSelectedDataset() {
    if (!state.selectedDataset?.__recordId) return;
    if (!confirm(`"${state.selectedDataset.title}"를 삭제할까요?`)) return;
    await deleteRecord(state.selectedDataset.__recordId);
    await loadStore();
    state.selectedDataset = null;
    renderAll();
    showStatus('자료 세트를 삭제했습니다.', 'default');
  }

  async function saveUI(patch, shouldReload = true) {
    const next = { ...(state.ui || {}), ...patch };
    Object.keys(next).forEach((key) => {
      if (next[key] === null || next[key] === undefined) delete next[key];
    });
    if (state.uiRecord?.id) {
      await patchRecord(state.uiRecord.id, next, config.recordTypes.ui);
    } else {
      state.uiRecord = await createRecord(config.recordTypes.ui, next);
    }
    if (shouldReload) await loadStore();
    renderAll();
  }

  function selectDataset(id) {
    const datasets = state.datasetsByEngine[state.route.engineId] || [];
    state.selectedDataset = datasets.find((dataset) => dataset.id === id) || null;
    renderEngine();
  }

  function selectTab(tabId) {
    state.activeTab = tabId;
    $$('[data-tab]').forEach((button) => {
      button.setAttribute('aria-selected', button.dataset.tab === tabId ? 'true' : 'false');
    });
    $$('[data-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.panel !== tabId;
    });
  }

  function startDictation() {
    const datasets = state.datasetsByEngine.dictation || [];
    const dataset = state.selectedDataset?.engineId === 'dictation' ? state.selectedDataset : datasets[0];
    if (!dataset || !dataset.items?.length) {
      showStatus('받아쓰기 자료가 없습니다.', 'error');
      return;
    }
    state.dictation = { dataset, index: 0 };
    renderDictationRunner();
    scheduleDictationTick();
  }

  function nextDictation() {
    if (!state.dictation) return;
    const nextIndex = state.dictation.index + 1;
    if (nextIndex >= state.dictation.dataset.items.length) {
      exitDictation();
      showStatus('받아쓰기를 마쳤습니다.', 'default');
      return;
    }
    state.dictation.index = nextIndex;
    renderDictationRunner();
    scheduleDictationTick();
  }

  function exitDictation() {
    if (state.dictationTimer) clearTimeout(state.dictationTimer);
    state.dictationTimer = null;
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

  function startReminderLoop() {
    if (state.reminderTimer) return;
    tickScheduleReminder();
    state.reminderTimer = setInterval(tickScheduleReminder, 1000);
  }

  function stopReminderLoop() {
    if (state.reminderTimer) clearInterval(state.reminderTimer);
    state.reminderTimer = null;
  }

  function tickScheduleReminder() {
    if (state.dictation) return;
    const quietUntil = state.ui.scheduleQuietUntil ? Date.parse(state.ui.scheduleQuietUntil) : 0;
    if (quietUntil > Date.now()) return;

    const now = new Date();
    const hhmm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    const monthDay = `${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const datasets = (state.datasetsByEngine.schedule || []).filter((dataset) => dataset.meta?.enabled !== false);
    for (const dataset of datasets) {
      for (const item of dataset.items || []) {
        const dueDaily = item.repeat === 'daily' && item.timeStart === hhmm;
        const dueYearly = item.repeat === 'yearly' && item.monthDay === monthDay && item.timeStart === hhmm;
        const dueInterval = Number.isFinite(Number(item.repeatIntervalSec)) && Number(item.repeatIntervalSec) > 0
          && Math.floor(Date.now() / 1000) % Number(item.repeatIntervalSec) === 0;
        if (!dueDaily && !dueYearly && !dueInterval) continue;

        const slot = `${dataset.id}:${item.title || ''}:${hhmm}:${Math.floor(Date.now() / 60_000)}`;
        if (state.reminderSlots.get(slot)) continue;
        state.reminderSlots.set(slot, true);
        showStatus(item.title || dataset.title || '알림', 'default');
        speakOrAudio(item.title || dataset.title || '알림', item.audioUrl);
      }
    }
  }

  function speakOrAudio(text, audioUrl) {
    markFaceSpeaking();
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => speak(text));
      audio.addEventListener('ended', () => {
        state.faceSpeakingUntil = Date.now();
        renderHome();
      }, { once: true });
      return;
    }
    speak(text);
  }

  function speak(text) {
    if (!text || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.onend = () => {
      state.faceSpeakingUntil = Date.now();
      renderHome();
    };
    window.speechSynthesis.speak(utterance);
  }

  function applyTheme() {
    document.documentElement.dataset.theme = themeMode();
    const style = robotStyle();
    $$('[data-face-root], [data-face-head], [data-face-frame]').forEach((node) => {
      node.dataset.style = style;
    });
  }

  function updateFaceMood(status) {
    const face = $('[data-face-root]');
    if (!face) return;
    if (Date.now() < state.faceSpeakingUntil || state.dictation) {
      face.dataset.faceMood = 'speaking';
      return;
    }
    if (status && !status.hidden && status.dataset.tone === 'error') {
      face.dataset.faceMood = 'concern';
      return;
    }
    if (state.datasetRecords.length === 0) {
      face.dataset.faceMood = 'curious';
      return;
    }
    face.dataset.faceMood = 'idle';
  }

  function markFaceSpeaking(durationMs = 2200) {
    state.faceSpeakingUntil = Math.max(state.faceSpeakingUntil, Date.now() + durationMs);
    updateFaceMood($('.home-status-text'));
  }

  function startFaceMotion() {
    const face = $('[data-face-root]');
    if (!face) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      face.style.setProperty('--eye-x', '0%');
      face.style.setProperty('--eye-y', '0%');
      face.style.setProperty('--mouth-open', '0.14');
      face.style.setProperty('--blink', '0');
      return;
    }

    let startedAt = 0;
    let lastFrameAt = 0;
    const tick = (now) => {
      if (!startedAt) startedAt = now;
      if (now - lastFrameAt >= 33) {
        const t = (now - startedAt) / 1000;
        const mood = face.dataset.faceMood || 'idle';
        const speaking = mood === 'speaking';
        const blink = Math.min(1, Math.max(0, Math.sin(t * 1.15) - 0.985) * 55);
        const idleMouth = mood === 'curious'
          ? 0.22 + Math.max(0, Math.sin(t * 3.2)) * 0.12
          : mood === 'concern'
            ? 0.05
            : 0.14 + Math.max(0, Math.sin(t * 1.8)) * 0.04;
        const mouthOpen = speaking ? 0.28 + Math.max(0, Math.sin(t * 10.4)) * 0.72 : idleMouth;

        face.style.setProperty('--eye-x', `${(Math.sin(t * 0.7) * 4.8 + Math.sin(t * 0.23) * 2.4).toFixed(2)}%`);
        face.style.setProperty('--eye-y', `${(Math.sin(t * 0.52 + 1.3) * 2.6).toFixed(2)}%`);
        face.style.setProperty('--mouth-open', mouthOpen.toFixed(3));
        face.style.setProperty('--blink', blink.toFixed(3));
        lastFrameAt = now;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
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
      updateFaceMood(homeStatus);
    }
    setText('[data-testid="engine-status"]', text);
  }

  function normalizeImportURL(raw) {
    const value = raw.trim();
    if (!value) return { ok: false, error: 'URL을 입력해주세요.' };
    if (value.toLowerCase().startsWith('javascript:')) return { ok: false, error: 'javascript: 스킴은 사용할 수 없습니다.' };
    try {
      const parsed = new URL(value);
      if (parsed.protocol === 'javascript:') return { ok: false, error: 'javascript: 스킴은 사용할 수 없습니다.' };
      if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && parsed.hostname === 'localhost')) return { ok: true, url: parsed.href };
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

  function sessionLabel() {
    return state.session?.user?.email || state.session?.user?.name || '로그인됨';
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function setText(selector, text) {
    const node = $(selector);
    if (node) node.textContent = text;
  }
})();
