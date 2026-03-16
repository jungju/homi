import {
  type HomiStoreV1,
  type HomiStoreUI,
  type ThemeMode,
  getStoredThemeMode,
  loadStore,
  saveStore,
  getDatasetsByEngine,
} from '../homi';
import type { HomiRuntime } from '../runtime';
import { getRoute } from './route.svelte';

let _runtime: HomiRuntime = null!;
let _store = $state<HomiStoreV1>(null!);
let _exportSelection = $state<Set<string>>(new Set());

export function initAppState(runtime: HomiRuntime) {
  _runtime = runtime;
  _store = loadStore(runtime.storage);
  applyThemeModeFromStore(_store);
}

export function getStore(): HomiStoreV1 {
  return _store;
}

export function setStore(store: HomiStoreV1) {
  _store = store;
  applyThemeModeFromStore(_store);
}

export function getExportSelection(): Set<string> {
  return _exportSelection;
}

export function setExportSelection(selection: Set<string>) {
  _exportSelection = selection;
}

export function persist(nextStore: HomiStoreV1) {
  _store = nextStore;
  applyThemeModeFromStore(_store);
  saveStore(_store, _runtime.storage);
  const route = getRoute();
  if (route.kind === 'engine') {
    _exportSelection = new Set(getDatasetsByEngine(_store, route.engineId).map((item) => item.id));
  }
}

function applyThemeMode(mode: ThemeMode) {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
}

function applyThemeModeFromStore(store: HomiStoreV1) {
  applyThemeMode(getStoredThemeMode(store));
}

export function updateStoreUi(patch: Partial<HomiStoreUI>) {
  const nextUi: HomiStoreUI & Record<string, unknown> = {
    ...(_store.ui ?? {}),
    ...patch,
  };
  Object.keys(nextUi).forEach((key) => {
    if (nextUi[key] === undefined) {
      delete nextUi[key];
    }
  });
  persist({
    ..._store,
    ui: nextUi,
  });
}

export function getThemeMode(): ThemeMode {
  return getStoredThemeMode(_store);
}

export function setThemeMode(themeMode: ThemeMode) {
  updateStoreUi({ themeMode });
}

export function getRuntime(): HomiRuntime {
  return _runtime;
}
