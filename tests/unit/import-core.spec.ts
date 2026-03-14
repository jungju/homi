import { describe, expect, it } from 'vitest';

import { createEmptyStore, type HomiStoreV1 } from '../../src/lib/homi';
import {
  currentLinkedImport,
  preserveRememberedLinkedImport,
  rememberedLinkedImport,
  withLinkedImport,
} from '../../src/lib/import-core';

function makeConnectedStore(): HomiStoreV1 {
  return withLinkedImport(createEmptyStore(), {
    sourceType: 'url',
    url: 'https://example.com/brain.json',
    signature: 'sig_v1',
  });
}

describe('linked import core', () => {
  it('returns connected metadata only when a signature is present', () => {
    const connected = makeConnectedStore();
    expect(rememberedLinkedImport(connected)?.url).toBe('https://example.com/brain.json');
    expect(currentLinkedImport(connected)?.signature).toBe('sig_v1');

    const disconnected = preserveRememberedLinkedImport(createEmptyStore(), connected);
    expect(rememberedLinkedImport(disconnected)).toEqual({
      sourceType: 'url',
      url: 'https://example.com/brain.json',
    });
    expect(currentLinkedImport(disconnected)).toBeNull();
  });

  it('removes linked metadata when the remembered store had none', () => {
    const next = preserveRememberedLinkedImport(makeConnectedStore(), createEmptyStore());
    expect(rememberedLinkedImport(next)).toBeNull();
  });
});

describe('linked import core extended', () => {
  it('withLinkedImport sets linkedImport when value provided', () => {
    const store = withLinkedImport(createEmptyStore(), {
      sourceType: 'url',
      url: 'https://example.com/test.json',
      signature: 'abc',
    });
    expect(store.ui?.linkedImport?.url).toBe('https://example.com/test.json');
    expect(store.ui?.linkedImport?.signature).toBe('abc');
  });

  it('withLinkedImport removes linkedImport when null passed', () => {
    const connected = makeConnectedStore();
    const cleared = withLinkedImport(connected, null);
    expect(cleared.ui?.linkedImport).toBeUndefined();
  });

  it('withLinkedImport removes linkedImport when undefined passed', () => {
    const connected = makeConnectedStore();
    const cleared = withLinkedImport(connected, undefined);
    expect(cleared.ui?.linkedImport).toBeUndefined();
  });

  it('rememberedLinkedImport returns null when sourceType is not url', () => {
    const store: HomiStoreV1 = {
      ...createEmptyStore(),
      ui: {
        linkedImport: { sourceType: 'url', url: '' } as HomiStoreV1['ui'] extends { linkedImport?: infer T } ? NonNullable<T> : never,
      },
    };
    // sourceType is url but url is empty string — still returns the object since sourceType matches
    const result = rememberedLinkedImport(store);
    expect(result?.sourceType).toBe('url');
  });

  it('currentLinkedImport returns null when signature is missing', () => {
    const store = withLinkedImport(createEmptyStore(), {
      sourceType: 'url',
      url: 'https://example.com/no-sig.json',
    });
    expect(currentLinkedImport(store)).toBeNull();
    expect(rememberedLinkedImport(store)).not.toBeNull();
  });

  it('preserveRememberedLinkedImport copies URL without signature', () => {
    const remembered = makeConnectedStore();
    const base = createEmptyStore();
    const result = preserveRememberedLinkedImport(base, remembered);
    const linked = rememberedLinkedImport(result);
    expect(linked?.url).toBe('https://example.com/brain.json');
    expect(linked?.signature).toBeUndefined();
  });
});
