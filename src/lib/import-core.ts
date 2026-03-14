import type { HomiStoreV1, LinkedUrlImportV1 } from './homi';

export function rememberedLinkedImport(store: HomiStoreV1): LinkedUrlImportV1 | null {
  return store.ui?.linkedImport?.sourceType === 'url' ? store.ui.linkedImport : null;
}

export function currentLinkedImport(store: HomiStoreV1): LinkedUrlImportV1 | null {
  const linkedImport = rememberedLinkedImport(store);
  if (!linkedImport?.signature) {
    return null;
  }
  return linkedImport;
}

export function withLinkedImport(
  baseStore: HomiStoreV1,
  linkedImport?: LinkedUrlImportV1 | null,
): HomiStoreV1 {
  const nextUi = {
    ...(baseStore.ui ?? {}),
  };

  if (linkedImport) {
    nextUi.linkedImport = linkedImport;
  } else {
    delete nextUi.linkedImport;
  }

  return {
    ...baseStore,
    ui: nextUi,
  };
}

export function preserveRememberedLinkedImport(
  baseStore: HomiStoreV1,
  rememberedStore: HomiStoreV1,
): HomiStoreV1 {
  const linkedImport = rememberedLinkedImport(rememberedStore);
  if (!linkedImport) {
    return withLinkedImport(baseStore, null);
  }
  return withLinkedImport(baseStore, {
    sourceType: 'url',
    url: linkedImport.url,
  });
}
