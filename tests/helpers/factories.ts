import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { DataSetV1, DataSetPayloadV1, HomiBundleV1, HomiStoreV1 } from '../../src/lib/homi';

export function readFixture(relativePath: string): string {
  return readFileSync(resolve(relativePath), 'utf8');
}

export function makeDataset(overrides: Partial<DataSetV1> & { engineId: DataSetV1['engineId']; items: DataSetV1['items'] }): DataSetV1 {
  return {
    id: 'ds_unit_1',
    engineSchemaVersion: 1,
    title: '단위 테스트',
    createdAt: '2026-03-14T00:00:00.000Z',
    updatedAt: '2026-03-14T00:00:00.000Z',
    ...overrides,
  };
}

export function makeStore(overrides?: Partial<HomiStoreV1>): HomiStoreV1 {
  return {
    storeVersion: 1,
    updatedAt: '2026-03-14T00:00:00.000Z',
    datasetsByEngine: {},
    ui: {},
    ...overrides,
  };
}

export function makeBundle(overrides?: Partial<HomiBundleV1> & { datasets: DataSetPayloadV1[] }): HomiBundleV1 {
  return {
    format: 'homi',
    version: 1,
    bundleType: 'import',
    ...overrides,
  } as HomiBundleV1;
}
