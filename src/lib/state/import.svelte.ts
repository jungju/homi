import {
  type DataSetPayloadV1,
  type DataSetV1,
  type EngineId,
  type HomiBundleV1,
  type HomiStoreV1,
  buildBundleFromDatasetIds,
  computeImportSelectionSignature,
  createEmptyStore,
  createId,
  getDatasetsByEngine,
  getEngineMeta,
  importDatasets,
  MAX_BUNDLE_JSON_BYTES,
  MAX_DATASET_COUNT_PER_BUNDLE,
  MAX_ITEMS_PER_DATASET,
  normalizeImportUrl,
  parseBundleText,
  parseItemsForEngine,
  removeDataset,
  upsertDataset,
  isDatasetEnabled,
} from '../homi';
import {
  currentLinkedImport,
  preserveRememberedLinkedImport,
  rememberedLinkedImport,
  withLinkedImport,
} from '../import-core';
import type { TimerHandle, HomiRuntime } from '../runtime';
import { getStore, persist, setExportSelection, getExportSelection } from './app.svelte';
import { ensureDictationUiStopsIfNeeded, getDictationSession, stopDictation } from './dictation.svelte';
import { triggerHomeWink } from './face.svelte';
import { setMessage, clearMessage } from './message.svelte';
import { canonicalizeRoutePath, getRoute, navigate, BRAIN_ROUTE_PATH } from './route.svelte';

export type BackupTabId = 'url' | 'text' | 'file' | 'sample';

export interface ImportCandidate {
  index: number;
  payload: DataSetPayloadV1;
  selected: boolean;
}

export interface ImportPreview {
  sourceKind: 'url' | 'file' | 'sample' | 'text';
  sourceText: string;
  bundle: HomiBundleV1;
  candidates: ImportCandidate[];
}

export interface DatasetEditor {
  mode: 'add' | 'edit' | null;
  engineId: EngineId;
  datasetId: string;
  title: string;
  itemsText: string;
  error: string;
}

export const BACKUP_TABS: { id: BackupTabId; label: string }[] = [
  { id: 'url', label: 'URL 가져오기' },
  { id: 'text', label: '텍스트로 가져오기' },
  { id: 'file', label: '파일로 가져오기' },
  { id: 'sample', label: '샘플 가져오기' },
];

const SHARED_IMPORT_PARAM = 'import';
const LIMIT_BYTES = MAX_BUNDLE_JSON_BYTES;
const LIMIT_DATASETS = MAX_DATASET_COUNT_PER_BUNDLE;
const LIMIT_ITEMS = MAX_ITEMS_PER_DATASET;
const LINKED_URL_SYNC_INTERVAL_MS = 5 * 60 * 1000;

type HomiWindow = Window & { __HOMI_URL_SYNC_INTERVAL_MS__?: number };

let _runtime: HomiRuntime = null!;
let _preview = $state<ImportPreview | null>(null);
let _importUrl = $state('');
let _backupTab = $state<BackupTabId>('url');
let _editor = $state<DatasetEditor>({
  mode: null,
  engineId: 'schedule',
  datasetId: '',
  title: '',
  itemsText: '[]',
  error: '',
});
let _importJsonText = $state('');
let _linkedImportSyncTimer: TimerHandle | null = null;
let _linkedImportSyncInFlight = false;
let _backupVersionDateText = $state('버전: 확인 중');

export function initImportState(runtime: HomiRuntime) {
  _runtime = runtime;
}

// --- Getters ---
export function getPreview(): ImportPreview | null { return _preview; }
export function setPreview(p: ImportPreview | null) { _preview = p; }
export function getImportUrl(): string { return _importUrl; }
export function setImportUrl(v: string) { _importUrl = v; }
export function getBackupTab(): BackupTabId { return _backupTab; }
export function setBackupTab(v: BackupTabId) { _backupTab = v; }
export function getEditor(): DatasetEditor { return _editor; }
export function setEditor(e: DatasetEditor) { _editor = e; }
export function getImportJsonText(): string { return _importJsonText; }
export function setImportJsonText(v: string) { _importJsonText = v; }
export function getBackupVersionDateText(): string { return _backupVersionDateText; }

export function getBackupUrlSyncStatusText(): string {
  const store = getStore();
  const linked = rememberedLinkedImport(store);
  return !linked
    ? '현재 URL 자동 업데이트 연결 없음'
    : linked.signature
      ? `URL 자동 업데이트 연결됨: ${linked.url}`
      : `저장된 URL 유지 중(자동 업데이트 연결 안 됨): ${linked.url}`;
}

export function getDatasetCount(): number {
  const store = getStore();
  return Object.values(store.datasetsByEngine).reduce((sum, list) => sum + list.length, 0);
}

// --- Helpers ---
function prettyBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.round(bytes / 1024)}KB`;
}

export function maybeShowImportLimits() {
  return `가져오기 제한: 최대 ${prettyBytes(LIMIT_BYTES)} JSON, 번들당 최대 ${LIMIT_DATASETS}개 세트, 세트당 최대 ${LIMIT_ITEMS}개 항목`;
}

function formatVersionDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(
    parsed.getUTCDate(),
  ).padStart(2, '0')}`;
}

export async function loadBackupVersionDate() {
  try {
    const response = await _runtime.fetch('/version.json', { cache: 'no-store' });
    if (!response.ok) { _backupVersionDateText = '버전: 알 수 없음'; return; }
    const parsed = (await response.json()) as { buildTime?: unknown };
    if (typeof parsed.buildTime !== 'string') { _backupVersionDateText = '버전: 알 수 없음'; return; }
    const formatted = formatVersionDate(parsed.buildTime);
    _backupVersionDateText = formatted ? `버전: ${formatted}` : '버전: 알 수 없음';
  } catch {
    _backupVersionDateText = '버전: 알 수 없음';
  }
}

function nowTag() {
  const now = _runtime.clock.date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

// --- Route side effects ---
export function applyRouteSideEffects() {
  const route = getRoute();
  const store = getStore();
  if (route.kind === 'engine') {
    setExportSelection(new Set(getDatasetsByEngine(store, route.engineId).map((item) => item.id)));
    if (route.engineId !== 'dictation') {
      stopDictation();
    }
    if (store.ui) {
      store.ui.lastOpenedEngineId = route.engineId;
    } else {
      store.ui = { lastOpenedEngineId: route.engineId };
    }
  } else if (route.kind === 'backup') {
    _backupTab = 'url';
    if (!_importUrl) {
      _importUrl = rememberedLinkedImport(store)?.url ?? '';
    }
    stopDictation();
  } else if (route.kind === 'home') {
    setExportSelection(new Set());
    if (!getDictationSession().gameMode) {
      stopDictation();
    }
  } else {
    setExportSelection(new Set());
    stopDictation();
  }
  _preview = null;
  _editor = { ..._editor, mode: null };
  clearMessage();
}

// --- Backup tab navigation ---
function focusBackupTab(tabId: BackupTabId) {
  requestAnimationFrame(() => {
    document.getElementById(`backup-tab-${tabId}`)?.focus();
  });
}

export function selectBackupTab(tabId: BackupTabId) {
  _backupTab = tabId;
}

export function onBackupTabKeydown(event: KeyboardEvent) {
  const currentIndex = BACKUP_TABS.findIndex((tab) => tab.id === _backupTab);
  if (currentIndex < 0) return;
  let nextIndex = currentIndex;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    nextIndex = (currentIndex + 1) % BACKUP_TABS.length;
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    nextIndex = (currentIndex - 1 + BACKUP_TABS.length) % BACKUP_TABS.length;
  } else if (event.key === 'Home') {
    nextIndex = 0;
  } else if (event.key === 'End') {
    nextIndex = BACKUP_TABS.length - 1;
  } else {
    return;
  }
  event.preventDefault();
  const nextTab = BACKUP_TABS[nextIndex];
  _backupTab = nextTab.id;
  focusBackupTab(nextTab.id);
}

// --- Navigation helpers ---
export function onHomeEngineClick(engineId: EngineId) {
  triggerHomeWink();
  navigate(`/engines/${engineId}`);
}

export function openSettingsPopup() {
  navigate(BRAIN_ROUTE_PATH);
}

export function closePopup() {
  if (getRoute().kind === 'home') return;
  navigate('/');
}

export function onOverlayKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  closePopup();
}

// --- Dataset editor ---
export function startEditDataset(dataset: DataSetV1) {
  _editor = {
    mode: 'edit',
    engineId: dataset.engineId,
    datasetId: dataset.id,
    title: dataset.title,
    itemsText: JSON.stringify(dataset.items, null, 2),
    error: '',
  };
}

export function cancelEditor() {
  _editor = { ..._editor, mode: null, error: '' };
}

export function saveEditor() {
  if (!_editor.mode) return;
  const savedMode = _editor.mode;
  const title = _editor.title.trim();
  if (!title) {
    _editor = { ..._editor, error: '제목은 필수입니다.' };
    return;
  }
  const parsed = parseItemsForEngine(_editor.engineId, _editor.itemsText);
  if (!parsed.ok) {
    _editor = { ..._editor, error: parsed.error };
    return;
  }
  const store = getStore();
  const now = _runtime.clock.toISOString();
  const origin = _editor.mode === 'edit'
    ? getDatasetsByEngine(store, _editor.engineId).find((item) => item.id === _editor.datasetId)
    : undefined;
  const nextDataset: DataSetV1 = {
    id: _editor.mode === 'add' ? createId('ds') : _editor.datasetId,
    engineId: _editor.engineId,
    engineSchemaVersion: getEngineMeta(_editor.engineId)?.schemaVersion ?? 1,
    title,
    items: parsed.items,
    createdAt: origin?.createdAt ?? now,
    updatedAt: now,
    meta: origin?.meta,
    source: origin?.source ?? { type: 'manual' },
  };
  persist(preserveRememberedLinkedImport(upsertDataset(store, nextDataset), store));
  const route = getRoute();
  if (route.kind === 'engine' && _editor.engineId === 'dictation') {
    ensureDictationUiStopsIfNeeded();
  }
  _editor = { ..._editor, mode: null, error: '' };
  setMessage(savedMode === 'add' ? '자료 세트를 추가했습니다.' : '자료 세트를 저장했습니다.', 'ok', _runtime.clock);
}

export function onDeleteDataset(dataset: DataSetV1) {
  if (!confirm(`"${dataset.title}"를 삭제할까요?`)) return;
  const store = getStore();
  persist(preserveRememberedLinkedImport(removeDataset(store, dataset.engineId, dataset.id), store));
  if (dataset.engineId === 'dictation' && getDictationSession().datasetId === dataset.id) {
    stopDictation();
    // reset dictation session handled by stopDictation
  }
  setMessage('자료 세트를 삭제했습니다.', 'ok', _runtime.clock);
}

export function toggleScheduleDatasetEnabled(dataset: DataSetV1) {
  if (dataset.engineId !== 'schedule') return;
  const store = getStore();
  const nextEnabled = !isDatasetEnabled(dataset);
  const nextMeta = { ...(dataset.meta ?? {}), enabled: nextEnabled };
  const now = _runtime.clock.toISOString();
  const nextDataset: DataSetV1 = { ...dataset, meta: nextMeta, updatedAt: now };
  persist(preserveRememberedLinkedImport(upsertDataset(store, nextDataset), store));
  setMessage(`${dataset.title}를 ${nextEnabled ? '사용' : '사용안함'} 상태로 바꿨습니다.`, 'ok', _runtime.clock);
}

// --- Export ---
export function selectExport(id: string, checked: boolean) {
  const sel = getExportSelection();
  if (checked) {
    sel.add(id);
    setExportSelection(new Set(sel));
    return;
  }
  sel.delete(id);
  setExportSelection(new Set(sel));
}

export function selectAllCurrentEngine(checked: boolean) {
  const route = getRoute();
  if (route.kind !== 'engine') return;
  const store = getStore();
  const ids = getDatasetsByEngine(store, route.engineId).map((item) => item.id);
  setExportSelection(new Set(checked ? ids : []));
}

export function exportEngineSelection() {
  const route = getRoute();
  if (route.kind !== 'engine') return;
  const meta = getEngineMeta(route.engineId);
  if (!meta) return;
  const sel = getExportSelection();
  const ids = [...sel];
  if (ids.length === 0) {
    setMessage('내보낼 항목을 하나 이상 선택해주세요.', 'error', _runtime.clock);
    return;
  }
  const store = getStore();
  const bundle = buildBundleFromDatasetIds(store, ids, {
    bundleType: 'backup',
    title: `${meta.title} Export`,
    description: `${meta.title} export from homi`,
  });
  downloadBundle(bundle, `homi-${meta.id}-${nowTag()}.json`);
  setMessage('선택한 자료 세트를 내보냈습니다.', 'ok', _runtime.clock);
}

function downloadBundle(bundle: HomiBundleV1, filename: string) {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

// --- Import ---
function applyPreview(text: string, sourceKind: 'url' | 'file' | 'sample' | 'text', sourceText: string): boolean {
  const parsed = parseBundleText(text);
  if (!parsed.ok) {
    _preview = null;
    setMessage(parsed.errors.join('\n'), 'error', _runtime.clock);
    return false;
  }
  const candidates: ImportCandidate[] = parsed.datasets.map((dataset, index) => ({
    index,
    payload: dataset,
    selected: true,
  }));
  _preview = { sourceKind, sourceText, bundle: parsed.bundle, candidates };
  return true;
}

function extractSharedImportToken(url: URL) {
  const queryValue = url.searchParams.get(SHARED_IMPORT_PARAM);
  if (queryValue) return queryValue;
  const hashText = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  if (!hashText) return null;
  const hashParams = new URLSearchParams(hashText);
  return hashParams.get(SHARED_IMPORT_PARAM);
}

function decodeBase64UrlUtf8(raw: string) {
  const normalized = raw.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

function resolveSharedImportPayload(rawUrl: string):
  | { ok: true; text: string; sourceText: string }
  | { ok: false; error: string }
  | null {
  try {
    const parsedUrl = new URL(rawUrl, window.location.origin);
    const token = extractSharedImportToken(parsedUrl);
    if (!token) return null;
    const text = decodeBase64UrlUtf8(token.trim());
    return { ok: true, text, sourceText: '공유 링크' };
  } catch {
    return { ok: false, error: '공유 링크를 해석할 수 없습니다.' };
  }
}

function removeSharedImportParam(rawUrl: string) {
  const parsedUrl = new URL(rawUrl, window.location.origin);
  let changed = false;
  if (parsedUrl.searchParams.has(SHARED_IMPORT_PARAM)) {
    parsedUrl.searchParams.delete(SHARED_IMPORT_PARAM);
    changed = true;
  }
  const hashText = parsedUrl.hash.startsWith('#') ? parsedUrl.hash.slice(1) : parsedUrl.hash;
  if (hashText) {
    const hashParams = new URLSearchParams(hashText);
    if (hashParams.has(SHARED_IMPORT_PARAM)) {
      hashParams.delete(SHARED_IMPORT_PARAM);
      parsedUrl.hash = hashParams.toString() ? `#${hashParams.toString()}` : '';
      changed = true;
    }
  }
  if (!changed) return null;
  return `${canonicalizeRoutePath(parsedUrl.pathname)}${parsedUrl.search}${parsedUrl.hash}`;
}

export function maybeLoadSharedImportFromLocation() {
  const route = getRoute();
  if (route.kind !== 'backup') return;
  const sharedImport = resolveSharedImportPayload(window.location.href);
  if (!sharedImport) return;
  const cleanedPath = removeSharedImportParam(window.location.href);
  if (cleanedPath) {
    history.replaceState({}, '', cleanedPath);
  }
  if (!sharedImport.ok) {
    _preview = null;
    setMessage(sharedImport.error, 'error', _runtime.clock);
    return;
  }
  if (new TextEncoder().encode(sharedImport.text).byteLength > LIMIT_BYTES) {
    setMessage(`공유 링크 JSON 크기가 제한(${prettyBytes(LIMIT_BYTES)})을 초과했습니다.`, 'error', _runtime.clock);
    return;
  }
  applyPreview(sharedImport.text, 'text', sharedImport.sourceText);
}

export async function runUrlImport() {
  _preview = null;
  const normalized = normalizeImportUrl(_importUrl);
  if (!normalized.ok) {
    setMessage(normalized.error, 'error', _runtime.clock);
    return;
  }
  const sharedImport = resolveSharedImportPayload(normalized.url);
  if (sharedImport) {
    if (!sharedImport.ok) {
      setMessage(sharedImport.error, 'error', _runtime.clock);
      return;
    }
    if (new TextEncoder().encode(sharedImport.text).byteLength > LIMIT_BYTES) {
      setMessage(`공유 링크 JSON 크기가 제한(${prettyBytes(LIMIT_BYTES)})을 초과했습니다.`, 'error', _runtime.clock);
      return;
    }
    if (applyPreview(sharedImport.text, 'text', sharedImport.sourceText)) {
      _importUrl = '';
    }
    return;
  }
  try {
    const response = await _runtime.fetch(normalized.url);
    if (!response.ok) {
      setMessage(`요청 실패: ${response.status} ${response.statusText}`, 'error', _runtime.clock);
      return;
    }
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const length = Number.parseInt(contentLength, 10);
      if (Number.isFinite(length) && length > LIMIT_BYTES) {
        setMessage(`가져오려는 파일이 ${prettyBytes(length)}로, v1 권장 제한(${prettyBytes(LIMIT_BYTES)})를 초과합니다.`, 'error', _runtime.clock);
        return;
      }
    }
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > LIMIT_BYTES) {
      setMessage(`가져온 JSON 크기가 제한(${prettyBytes(LIMIT_BYTES)})을 초과했습니다.`, 'error', _runtime.clock);
      return;
    }
    applyPreview(text, 'url', normalized.url);
  } catch (err) {
    const errorMessage = String((err as Error).message ?? err);
    const hint = '네트워크/CORS 제한일 수 있습니다. 해당 호스트의 CORS 설정을 확인해 주세요.';
    setMessage(`불러오기 실패: ${errorMessage} / ${hint}`, 'error', _runtime.clock);
  }
}

export function runTextImport() {
  _preview = null;
  const text = _importJsonText.trim();
  if (!text) {
    setMessage('JSON 텍스트를 입력해주세요.', 'error', _runtime.clock);
    return;
  }
  if (new TextEncoder().encode(text).byteLength > LIMIT_BYTES) {
    setMessage(`입력한 JSON 크기가 제한(${prettyBytes(LIMIT_BYTES)})을 초과했습니다.`, 'error', _runtime.clock);
    return;
  }
  if (applyPreview(text, 'text', '직접 입력된 JSON')) {
    _importJsonText = '';
  }
}

export async function loadSampleBundle() {
  const route = getRoute();
  if (route.kind !== 'backup') {
    setMessage(`샘플 가져오기는 브레인 설정( ${BRAIN_ROUTE_PATH} )에서만 할 수 있습니다.`, 'error', _runtime.clock);
    return;
  }
  _preview = null;
  try {
    const response = await _runtime.fetch('/samples/homi.sample.homi.json');
    if (!response.ok) {
      setMessage('샘플 불러오기 실패', 'error', _runtime.clock);
      return;
    }
    const text = await response.text();
    applyPreview(text, 'sample', '/samples/homi.sample.homi.json');
  } catch (err) {
    setMessage(`샘플 불러오기 실패: ${String((err as Error).message ?? err)}`, 'error', _runtime.clock);
  }
}

export async function importFromFile(event: Event) {
  const target = event.currentTarget as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  _preview = null;
  if (file.size > LIMIT_BYTES) {
    setMessage(`선택한 파일이 ${prettyBytes(file.size)}로 제한(${prettyBytes(LIMIT_BYTES)})을 초과합니다.`, 'error', _runtime.clock);
    if (target) target.value = '';
    return;
  }
  try {
    const text = await file.text();
    if (new TextEncoder().encode(text).byteLength > LIMIT_BYTES) {
      setMessage(`선택한 파일 내용이 제한(${prettyBytes(LIMIT_BYTES)})을 초과합니다.`, 'error', _runtime.clock);
      return;
    }
    applyPreview(text, 'file', file.name);
  } catch (err) {
    setMessage(`파일 읽기 실패: ${String((err as Error).message ?? err)}`, 'error', _runtime.clock);
  } finally {
    if (target) target.value = '';
  }
}

export function togglePreviewSelection(index: number, checked: boolean) {
  if (!_preview) return;
  const target = _preview.candidates.find((item) => item.index === index);
  if (!target) return;
  target.selected = checked;
  _preview = { ..._preview };
}

export function importFromPreview() {
  if (!_preview) return;
  const store = getStore();
  const selected = _preview.candidates.filter((item) => item.selected).map((item) => item.payload);
  if (selected.length === 0) {
    setMessage('가져올 항목을 하나 이상 선택해주세요.', 'error', _runtime.clock);
    return;
  }
  const sourceType =
    _preview.sourceKind === 'file' ? 'file'
    : _preview.sourceKind === 'sample' ? 'sample'
    : _preview.sourceKind === 'text' ? 'text'
    : 'url';
  const replaceStore: HomiStoreV1 = createEmptyStore();
  const rememberedBefore = rememberedLinkedImport(store);
  const linkEligible = _preview.sourceKind === 'url' && selected.length === _preview.candidates.length;
  const linkedImport =
    _preview.sourceKind === 'url'
      ? {
          sourceType: 'url' as const,
          url: _preview.sourceText,
          ...(linkEligible ? { signature: computeImportSelectionSignature(selected) } : {}),
        }
      : rememberedBefore
        ? { sourceType: 'url' as const, url: rememberedBefore.url }
        : undefined;
  replaceStore.ui = { ...(store.ui ?? {}) };
  const imported = importDatasets(replaceStore, selected, sourceType, {
    bundleId: _preview.bundle.bundleId,
    sourceUrl: _preview.sourceKind === 'url' ? _preview.sourceText : undefined,
  });
  persist(withLinkedImport(imported.nextStore, linkedImport));
  ensureDictationUiStopsIfNeeded();
  const linkedMessage =
    _preview.sourceKind !== 'url'
      ? ''
      : linkedImport
        ? linkEligible
          ? ' URL 연결이 저장되어 이후 변경을 자동으로 확인합니다.'
          : ' URL은 저장되지만 일부만 가져와 자동 업데이트 연결은 켜지지 않습니다.'
        : '';
  setMessage(`기존 자료를 교체하고 총 ${imported.imported.length}개 자료 세트를 가져왔습니다.${linkedMessage}`, 'ok', _runtime.clock);
  _preview = null;
}

// --- Linked Import Sync ---
function getLinkedImportSyncIntervalMs() {
  if (typeof window !== 'undefined') {
    const rawValue = Number((window as HomiWindow).__HOMI_URL_SYNC_INTERVAL_MS__);
    if (Number.isFinite(rawValue) && rawValue >= 100) return rawValue;
  }
  return LINKED_URL_SYNC_INTERVAL_MS;
}

async function syncLinkedImportIfNeeded() {
  const store = getStore();
  const linkedImport = currentLinkedImport(store);
  if (!linkedImport || _linkedImportSyncInFlight) return;
  _linkedImportSyncInFlight = true;
  try {
    const response = await _runtime.fetch(linkedImport.url, { cache: 'no-store' });
    if (!response.ok) return;
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const length = Number.parseInt(contentLength, 10);
      if (Number.isFinite(length) && length > LIMIT_BYTES) return;
    }
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > LIMIT_BYTES) return;
    const parsed = parseBundleText(text);
    if (!parsed.ok) return;
    const nextSignature = computeImportSelectionSignature(parsed.datasets);
    if (nextSignature === linkedImport.signature) return;
    const activeLinkedImport = currentLinkedImport(getStore());
    if (
      !activeLinkedImport ||
      activeLinkedImport.url !== linkedImport.url ||
      activeLinkedImport.signature !== linkedImport.signature
    ) return;
    const currentStore = getStore();
    const replaceStore: HomiStoreV1 = createEmptyStore();
    replaceStore.ui = { ...(currentStore.ui ?? {}) };
    const imported = importDatasets(replaceStore, parsed.datasets, 'url', {
      bundleId: parsed.bundle.bundleId,
      sourceUrl: linkedImport.url,
    });
    const nextStore = withLinkedImport(imported.nextStore, {
      sourceType: 'url',
      url: linkedImport.url,
      signature: nextSignature,
    });
    persist(nextStore);
    ensureDictationUiStopsIfNeeded();
    const route = getRoute();
    if (route.kind !== 'home') {
      setMessage(`연결된 브레인 JSON 변경을 감지해 ${imported.imported.length}개 자료 세트를 업데이트했습니다.`, 'ok', _runtime.clock);
    }
  } catch {
    // 네트워크/CORS 실패는 현재 데이터를 유지하고 다음 주기에서 재시도한다.
  } finally {
    _linkedImportSyncInFlight = false;
  }
}

export function startLinkedImportSync() {
  if (_linkedImportSyncTimer !== null) return;
  _linkedImportSyncTimer = _runtime.clock.setInterval(() => {
    void syncLinkedImportIfNeeded();
  }, getLinkedImportSyncIntervalMs());
}

export function stopLinkedImportSync() {
  if (_linkedImportSyncTimer !== null) {
    _runtime.clock.clearInterval(_linkedImportSyncTimer);
    _linkedImportSyncTimer = null;
  }
}
