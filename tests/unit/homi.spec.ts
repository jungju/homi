import { describe, expect, it } from 'vitest';

import {
  HOMI_STORAGE_KEY,
  MAX_BUNDLE_JSON_BYTES,
  buildBundleFromDatasetIds,
  computeImportSelectionSignature,
  createEmptyStore,
  getStoredThemeMode,
  getDatasetsByEngine,
  importDatasets,
  isDatasetEnabled,
  loadStoreFromStorage,
  normalizeImportUrl,
  parseBundleText,
  removeDataset,
  upsertDataset,
  type DataSetV1,
} from '../../src/lib/homi';
import { createMemoryStorage } from '../../src/lib/runtime';
import { readFixture, makeDataset, makeStore } from '../helpers/factories';

describe('homi core', () => {
  it('[test.p1.source_type_text_roundtrip] keeps text-source tracking across export and reimport', () => {
    const parsed = parseBundleText(readFixture('tests/fixtures/bundle.roundtrip-text.v1.json'));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const firstImport = importDatasets(createEmptyStore(), parsed.datasets, 'text', {
      bundleId: parsed.bundle.bundleId,
    });
    expect(firstImport.imported).toHaveLength(1);
    expect(firstImport.imported[0]?.source?.type).toBe('text');

    const exported = buildBundleFromDatasetIds(firstImport.nextStore, [firstImport.imported[0]!.id], {
      bundleType: 'backup',
      title: 'roundtrip export',
    });
    expect((exported.datasets[0] as { source?: unknown }).source).toBeUndefined();

    const reparsed = parseBundleText(JSON.stringify(exported));
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) {
      return;
    }

    const secondImport = importDatasets(createEmptyStore(), reparsed.datasets, 'text', {
      bundleId: exported.bundleId,
    });
    expect(secondImport.imported[0]?.source?.type).toBe('text');
    expect(secondImport.imported[0]?.source?.bundleId).toBe(exported.bundleId);
  });

  it('recovers to an empty store when stored JSON is corrupted for the domain rules', () => {
    const storage = createMemoryStorage({
      [HOMI_STORAGE_KEY]: readFixture('tests/fixtures/store.corrupt.v1.json'),
    });

    const recovered = loadStoreFromStorage(storage);

    expect(recovered.datasetsByEngine).toEqual({});
    expect(recovered.ui ?? {}).toEqual({});
    const persisted = JSON.parse(storage.snapshot()[HOMI_STORAGE_KEY]!);
    expect(persisted.datasetsByEngine).toEqual({});
  });

  it('blocks javascript URLs and allows secure https URLs', () => {
    expect(normalizeImportUrl('javascript:alert(1)')).toEqual({
      ok: false,
      error: 'javascript: 스킴은 사용할 수 없습니다.',
    });
    expect(normalizeImportUrl('https://example.com/homi.json')).toEqual({
      ok: true,
      url: 'https://example.com/homi.json',
    });
  });

  it('parses the max-boundary fixture inside v1 limits', () => {
    const parsed = parseBundleText(readFixture('tests/fixtures/bundle.max-boundary.v1.json'));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.datasets).toHaveLength(2);
  });
});

describe('parseBundleText negative paths', () => {
  it('rejects non-JSON text', () => {
    const result = parseBundleText('not json at all');
    expect(result.ok).toBe(false);
  });

  it('rejects text exceeding byte size limit', () => {
    const huge = 'x'.repeat(MAX_BUNDLE_JSON_BYTES + 1);
    const result = parseBundleText(huge);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain('bytes');
    }
  });

  it('rejects bundle with wrong format field', () => {
    const result = parseBundleText(JSON.stringify({
      format: 'other',
      version: 1,
      bundleType: 'import',
      datasets: [{ engineId: 'dictation', engineSchemaVersion: 1, title: 't', items: [{ word: 'a' }] }],
    }));
    expect(result.ok).toBe(false);
  });

  it('rejects bundle with empty datasets array', () => {
    const result = parseBundleText(JSON.stringify({
      format: 'homi',
      version: 1,
      bundleType: 'import',
      datasets: [],
    }));
    expect(result.ok).toBe(false);
  });

  it('rejects dataset with unsupported engineId', () => {
    const result = parseBundleText(JSON.stringify({
      format: 'homi',
      version: 1,
      bundleType: 'import',
      datasets: [{ engineId: 'unknown', engineSchemaVersion: 1, title: 't', items: [] }],
    }));
    expect(result.ok).toBe(false);
  });

  it('rejects dataset with invalid engine item schema', () => {
    const result = parseBundleText(JSON.stringify({
      format: 'homi',
      version: 1,
      bundleType: 'import',
      datasets: [{ engineId: 'dictation', engineSchemaVersion: 1, title: 't', items: [{ noword: true }] }],
    }));
    expect(result.ok).toBe(false);
  });
});

describe('normalizeImportUrl extended', () => {
  it('rejects empty string', () => {
    expect(normalizeImportUrl('')).toEqual({ ok: false, error: 'URL을 입력해주세요.' });
    expect(normalizeImportUrl('   ')).toEqual({ ok: false, error: 'URL을 입력해주세요.' });
  });

  it('blocks mixed-case javascript scheme', () => {
    const result = normalizeImportUrl('JaVaScRiPt:alert(1)');
    expect(result.ok).toBe(false);
  });

  it('rejects non-localhost http URLs', () => {
    const result = normalizeImportUrl('http://example.com/brain.json');
    expect(result.ok).toBe(false);
  });

  it('allows http://localhost for development', () => {
    const result = normalizeImportUrl('http://localhost:3000/brain.json');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).toContain('localhost');
    }
  });

  it('rejects malformed URL', () => {
    const result = normalizeImportUrl('not-a-url');
    expect(result.ok).toBe(false);
  });
});

describe('importDatasets logic', () => {
  it('generates a new id when dataset id conflicts with existing', () => {
    const existing = makeDataset({
      id: 'ds_conflict',
      engineId: 'dictation',
      items: [{ word: 'existing' }],
    });
    const store = makeStore({
      datasetsByEngine: { dictation: [existing] },
    });

    const result = importDatasets(store, [
      { id: 'ds_conflict', engineId: 'dictation', engineSchemaVersion: 1, title: 'new', items: [{ word: 'new' }] },
    ], 'text');

    expect(result.imported).toHaveLength(1);
    expect(result.imported[0]!.id).not.toBe('ds_conflict');
    expect(result.imported[0]!.source?.originalDatasetId).toBe('ds_conflict');
  });

  it('preserves original id when no conflict', () => {
    const result = importDatasets(createEmptyStore(), [
      { id: 'ds_unique', engineId: 'dictation', engineSchemaVersion: 1, title: 'test', items: [{ word: 'a' }] },
    ], 'text');

    expect(result.imported[0]!.id).toBe('ds_unique');
    expect(result.imported[0]!.source?.originalDatasetId).toBeUndefined();
  });

  it('omits source metadata for manual sourceType', () => {
    const result = importDatasets(createEmptyStore(), [
      { engineId: 'dictation', engineSchemaVersion: 1, title: 'manual', items: [{ word: 'a' }] },
    ], 'manual');

    expect(result.imported[0]!.source).toBeUndefined();
  });

  it('imports multiple datasets at once', () => {
    const result = importDatasets(createEmptyStore(), [
      { engineId: 'dictation', engineSchemaVersion: 1, title: 'd1', items: [{ word: 'a' }] },
      { engineId: 'schedule', engineSchemaVersion: 1, title: 's1', items: [{ title: 'test', timeStart: '09:00', repeat: 'daily' }] },
    ], 'file');

    expect(result.imported).toHaveLength(2);
    expect(result.nextStore.datasetsByEngine.dictation).toHaveLength(1);
    expect(result.nextStore.datasetsByEngine.schedule).toHaveLength(1);
  });
});

describe('store operations', () => {
  it('returns empty store from empty storage', () => {
    const storage = createMemoryStorage();
    const store = loadStoreFromStorage(storage);
    expect(store.datasetsByEngine).toEqual({});
  });

  it('defaults theme mode to light and preserves a stored dark mode preference', () => {
    expect(getStoredThemeMode(createEmptyStore())).toBe('light');

    const storage = createMemoryStorage({
      [HOMI_STORAGE_KEY]: JSON.stringify({
        storeVersion: 1,
        updatedAt: '2026-03-16T00:00:00.000Z',
        datasetsByEngine: {},
        ui: {
          themeMode: 'dark',
        },
      }),
    });

    const store = loadStoreFromStorage(storage);
    expect(getStoredThemeMode(store)).toBe('dark');
    expect(store.ui?.themeMode).toBe('dark');
  });

  it('getDatasetsByEngine returns empty array for missing engine', () => {
    expect(getDatasetsByEngine(createEmptyStore(), 'dictation')).toEqual([]);
  });

  it('upsertDataset inserts new and updates existing', () => {
    const dataset = makeDataset({ id: 'ds_1', engineId: 'dictation', items: [{ word: 'a' }], title: 'v1' });
    const store1 = upsertDataset(createEmptyStore(), dataset);
    expect(getDatasetsByEngine(store1, 'dictation')).toHaveLength(1);

    const updated = { ...dataset, title: 'v2' };
    const store2 = upsertDataset(store1, updated);
    expect(getDatasetsByEngine(store2, 'dictation')).toHaveLength(1);
    expect(getDatasetsByEngine(store2, 'dictation')[0]!.title).toBe('v2');
  });

  it('removeDataset deletes entry and cleans engine key when empty', () => {
    const dataset = makeDataset({ id: 'ds_rm', engineId: 'dictation', items: [{ word: 'a' }] });
    const store1 = upsertDataset(createEmptyStore(), dataset);
    expect(getDatasetsByEngine(store1, 'dictation')).toHaveLength(1);

    const store2 = removeDataset(store1, 'dictation', 'ds_rm');
    expect(getDatasetsByEngine(store2, 'dictation')).toHaveLength(0);
    expect(store2.datasetsByEngine.dictation).toBeUndefined();
  });

  it('isDatasetEnabled returns true when meta is absent or enabled is not false', () => {
    const noMeta = makeDataset({ engineId: 'dictation', items: [] });
    expect(isDatasetEnabled(noMeta)).toBe(true);

    const enabledTrue = makeDataset({ engineId: 'dictation', items: [], meta: { enabled: true } });
    expect(isDatasetEnabled(enabledTrue)).toBe(true);

    const enabledFalse = makeDataset({ engineId: 'dictation', items: [], meta: { enabled: false } });
    expect(isDatasetEnabled(enabledFalse)).toBe(false);
  });

  it('computeImportSelectionSignature is deterministic for same input', () => {
    const payload = [{ engineId: 'dictation' as const, engineSchemaVersion: 1, title: 'x', items: [{ word: 'a' }] }];
    const sig1 = computeImportSelectionSignature(payload);
    const sig2 = computeImportSelectionSignature(payload);
    expect(sig1).toBe(sig2);
    expect(typeof sig1).toBe('string');
    expect(sig1.length).toBeGreaterThan(0);
  });
});
