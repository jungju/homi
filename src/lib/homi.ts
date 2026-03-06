import { z } from 'zod';

export type SourceType = 'manual' | 'sample' | 'url' | 'file';
export type EngineId = 'schedule' | 'dictation';
export type BundleType = 'sample' | 'import' | 'backup';

export interface SourceV1 {
  type: SourceType;
  importedAt?: string;
  bundleId?: string;
  url?: string | null;
  originalDatasetId?: string;
}

export interface DataSetPayloadV1 {
  id?: string;
  engineId: EngineId;
  engineSchemaVersion: number;
  title: string;
  items: Array<Record<string, unknown>>;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DataSetV1 extends DataSetPayloadV1 {
  id: string;
  createdAt: string;
  updatedAt: string;
  source?: SourceV1;
}

export interface HomiStoreUI {
  lastOpenedEngineId?: string;
}

export interface HomiStoreV1 {
  storeVersion: 1;
  updatedAt: string;
  datasetsByEngine: Record<string, DataSetV1[]>;
  ui?: HomiStoreUI;
}

export interface HomiBundleV1 {
  format: 'homi';
  version: 1;
  bundleType: BundleType;
  bundleId?: string;
  title?: string;
  description?: string;
  createdAt?: string;
  datasets: DataSetPayloadV1[];
}

export interface EngineDefinition {
  id: EngineId;
  title: string;
  description: string;
  sampleBundleUrl: string;
  schemaVersion: number;
}

export interface ParseBundleResult {
  ok: true;
  bundle: HomiBundleV1;
  datasets: DataSetPayloadV1[];
}

export interface ParseBundleError {
  ok: false;
  errors: string[];
}

export interface ParseUrlResult {
  ok: true;
  url: string;
}

export interface ParseUrlError {
  ok: false;
  error: string;
}

export interface ImportResult {
  nextStore: HomiStoreV1;
  imported: DataSetV1[];
}

export interface ItemParseResult {
  ok: true;
  items: Array<Record<string, unknown>>;
}

export interface ItemParseError {
  ok: false;
  error: string;
}

export interface ImportPreviewPayload {
  index: number;
  payload: DataSetPayloadV1;
}

export interface ImportSelection {
  bundle: HomiBundleV1;
  candidates: ImportPreviewPayload[];
}

export const HOMI_STORAGE_KEY = 'homi.store.v1';
export const MAX_BUNDLE_JSON_BYTES = 2_097_152;
export const MAX_DATASET_COUNT_PER_BUNDLE = 50;
export const MAX_ITEMS_PER_DATASET = 10_000;
export const MAX_TEXT_LENGTH = 10_000;
const HOMI_ALL_SAMPLE_BUNDLE_URL = '/samples/homi.sample.homi.json';

const ENGINE_ID_PATTERN = /^[a-z][a-z0-9-]{0,39}$/;
const ISO_DATE_RE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

export const ENGINE_REGISTRY: EngineDefinition[] = [
  {
    id: 'schedule',
    title: '스케줄',
    description: '날짜·시간 기반 일정 항목 모음',
    sampleBundleUrl: HOMI_ALL_SAMPLE_BUNDLE_URL,
    schemaVersion: 1,
  },
  {
    id: 'dictation',
    title: '받아쓰기',
    description: '단어/해석/예문/발음 URL 항목 모음',
    sampleBundleUrl: HOMI_ALL_SAMPLE_BUNDLE_URL,
    schemaVersion: 1,
  },
];

const SourceSchema = z
  .object({
    type: z.enum(['manual', 'sample', 'url', 'file']),
    importedAt: z.string().optional(),
    bundleId: z.string().optional(),
    url: z.union([z.string(), z.null()]).optional(),
    originalDatasetId: z.string().optional(),
  })
  .passthrough();

const ScheduleItemSchema = z
  .object({
    date: z.string().regex(DATE_RE),
    title: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
    timeStart: z.string().trim().regex(TIME_RE).optional(),
    timeEnd: z.string().trim().regex(TIME_RE).optional(),
    notes: z.string().trim().max(MAX_TEXT_LENGTH).optional(),
    tags: z.array(z.string().trim().max(MAX_TEXT_LENGTH)).optional(),
    timezone: z.string().trim().max(MAX_TEXT_LENGTH).optional(),
  })
  .passthrough();

const DictationItemSchema = z
  .object({
    word: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
    meaning: z.string().trim().max(MAX_TEXT_LENGTH).optional(),
    hint: z.string().trim().max(MAX_TEXT_LENGTH).optional(),
    example: z.string().trim().max(MAX_TEXT_LENGTH).optional(),
    audioUrl: z.string().trim().max(MAX_TEXT_LENGTH).optional(),
  })
  .passthrough();

const EngineIdSchema = z
  .string()
  .regex(ENGINE_ID_PATTERN)
  .refine(
    (value) => ENGINE_REGISTRY.some((engine) => engine.id === value),
    { message: '지원하지 않는 엔진입니다.' },
  );

const DataSetPayloadSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    engineId: EngineIdSchema,
    engineSchemaVersion: z.number().int().min(1),
    title: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
    items: z.array(z.unknown()),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const DataSetSchema = DataSetPayloadSchema.extend({
  createdAt: z.string().refine((v) => ISO_DATE_RE.test(v)),
  updatedAt: z.string().refine((v) => ISO_DATE_RE.test(v)),
  source: SourceSchema.optional(),
});

const BundleSchema = z
  .object({
    format: z.literal('homi'),
    version: z.literal(1),
    bundleType: z.enum(['sample', 'import', 'backup']),
    bundleId: z.string().optional(),
    title: z.string().max(MAX_TEXT_LENGTH).optional(),
    description: z.string().max(MAX_TEXT_LENGTH).optional(),
    createdAt: z.string().optional(),
    datasets: z.array(z.unknown()).min(1),
  })
  .passthrough();

const StoreSchema = z
  .object({
    storeVersion: z.literal(1),
    updatedAt: z.string(),
    datasetsByEngine: z.record(z.string(), z.array(z.unknown())),
    ui: z
      .object({
        lastOpenedEngineId: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

function nowIso(): string {
  return new Date().toISOString();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateEngineItem(engineId: EngineId, item: unknown): boolean {
  if (!isPlainObject(item)) {
    return false;
  }
  const schema = engineId === 'dictation' ? DictationItemSchema : ScheduleItemSchema;
  return schema.safeParse(item).success;
}

function validateEngineItems(engineId: EngineId, items: Array<unknown>): boolean {
  return items.every((item) => validateEngineItem(engineId, item));
}

export function isEngineId(value: string): value is EngineId {
  return ENGINE_REGISTRY.some((engine) => engine.id === value);
}

export function getEngineMeta(engineId: string): EngineDefinition | undefined {
  return ENGINE_REGISTRY.find((engine) => engine.id === engineId);
}

export function createId(prefix = 'ds'): string {
  if ('randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyStore(): HomiStoreV1 {
  return {
    storeVersion: 1,
    updatedAt: nowIso(),
    datasetsByEngine: {},
    ui: {},
  };
}

function normalizeDatasetPayload(payload: DataSetPayloadV1, index: number, errors: string[]): DataSetPayloadV1 | null {
  if (!isPlainObject(payload)) {
    errors.push(`datasets[${index}]: object가 필요합니다.`);
    return null;
  }

  const parsed = DataSetPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    errors.push(`datasets[${index}]: ${parsed.error.issues[0]?.message ?? '형식이 올바르지 않습니다.'}`);
    return null;
  }

  if (parsed.data.items.length > MAX_ITEMS_PER_DATASET) {
    errors.push(`datasets[${index}]: 항목 수가 ${MAX_ITEMS_PER_DATASET}개를 초과했습니다.`);
    return null;
  }

  if (!isEngineId(parsed.data.engineId)) {
    errors.push(`datasets[${index}]: engineId가 지원되지 않습니다.`);
    return null;
  }

  const engineId = parsed.data.engineId;
  for (let itemIndex = 0; itemIndex < parsed.data.items.length; itemIndex += 1) {
    const item = parsed.data.items[itemIndex];
    if (!validateEngineItem(engineId, item)) {
      errors.push(`datasets[${index}].items[${itemIndex}]: 항목 스키마가 엔진 규칙과 일치하지 않습니다.`);
      return null;
    }
  }

  return parsed.data as DataSetPayloadV1;
}

function isLegacyDictationLoveSample(dataset: DataSetV1): boolean {
  if (dataset.engineId !== 'dictation') {
    return false;
  }
  if (dataset.title === '1분마다 사랑해(음성)') {
    return true;
  }
  return false;
}

function sanitizeStore(store: HomiStoreV1): HomiStoreV1 {
  let mutated = false;
  const next: HomiStoreV1 = {
    ...store,
    datasetsByEngine: {
      ...store.datasetsByEngine,
    },
  };

  if (!next.datasetsByEngine.dictation) {
    return next;
  }

  const sanitized = next.datasetsByEngine.dictation.filter((item) => !isLegacyDictationLoveSample(item));
  if (sanitized.length !== next.datasetsByEngine.dictation.length) {
    if (sanitized.length > 0) {
      next.datasetsByEngine.dictation = sanitized;
    } else {
      delete next.datasetsByEngine.dictation;
    }
    mutated = true;
  }

  if (!mutated) {
    return next;
  }

  return {
    ...next,
    updatedAt: nowIso(),
  };
}

export function parseBundleText(raw: string): ParseBundleResult | ParseBundleError {
  if (typeof raw !== 'string') {
    return { ok: false, errors: ['텍스트 데이터가 올바르지 않습니다.'] };
  }

  if (new TextEncoder().encode(raw).byteLength > MAX_BUNDLE_JSON_BYTES) {
    return { ok: false, errors: [`JSON 크기가 ${MAX_BUNDLE_JSON_BYTES} bytes를 초과했습니다.`] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, errors: ['JSON 파싱 실패'] };
  }

  const top = BundleSchema.safeParse(parsed);
  if (!top.success) {
    return { ok: false, errors: [top.error.issues[0]?.message ?? '잘못된 bundle 형태입니다.'] };
  }

  const errors: string[] = [];
  if (top.data.datasets.length > MAX_DATASET_COUNT_PER_BUNDLE) {
    errors.push(`datasets 수가 ${MAX_DATASET_COUNT_PER_BUNDLE}개를 초과했습니다.`);
  }

  const datasets: DataSetPayloadV1[] = [];
  top.data.datasets.forEach((rawDataset, index) => {
    const payload = normalizeDatasetPayload(rawDataset as DataSetPayloadV1, index, errors);
    if (payload) {
      datasets.push(payload);
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    bundle: top.data as HomiBundleV1,
    datasets,
  };
}

export function parseItemsForEngine(
  engineId: EngineId,
  raw: string,
): ItemParseResult | ItemParseError {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'JSON 형식이 아닙니다.' };
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, error: '항목은 JSON 배열이어야 합니다.' };
  }

  if (parsed.length > MAX_ITEMS_PER_DATASET) {
    return {
      ok: false,
      error: `항목 수가 ${MAX_ITEMS_PER_DATASET}개를 초과합니다.`,
    };
  }

  const items: Array<Record<string, unknown>> = [];
  for (let i = 0; i < parsed.length; i += 1) {
    const value = parsed[i];
    if (!validateEngineItem(engineId, value)) {
      return {
        ok: false,
        error: `${i + 1}번째 항목이 엔진 스키마와 일치하지 않습니다.`,
      };
    }
    items.push(value as Record<string, unknown>);
  }
  return { ok: true, items };
}

export function normalizeImportUrl(raw: string): ParseUrlResult | ParseUrlError {
  if (!raw.trim()) {
    return { ok: false, error: 'URL을 입력해주세요.' };
  }

  if (raw.startsWith('javascript:')) {
    return { ok: false, error: 'javascript: 스킴은 사용할 수 없습니다.' };
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:') {
      return { ok: true, url: parsed.href };
    }
    if (parsed.protocol === 'http:' && parsed.hostname === 'localhost') {
      return { ok: true, url: parsed.href };
    }
    return { ok: false, error: '현재 v1에서는 https URL만 허용합니다.' };
  } catch {
    return { ok: false, error: '올바른 URL 형식이 아닙니다.' };
  }
}

function stripUnknownFieldsFromDataSet(data: DataSetV1): DataSetPayloadV1 {
  const payload = { ...data } as Omit<DataSetV1, 'createdAt' | 'updatedAt' | 'source'>;
  delete (payload as { createdAt?: string }).createdAt;
  delete (payload as { updatedAt?: string }).updatedAt;
  delete (payload as { source?: SourceV1 }).source;
  return payload as DataSetPayloadV1;
}

export function loadStore(): HomiStoreV1 {
  if (typeof localStorage === 'undefined') {
    return createEmptyStore();
  }

  try {
    const raw = localStorage.getItem(HOMI_STORAGE_KEY);
    if (!raw) {
      return createEmptyStore();
    }

    const parsed = JSON.parse(raw);
    const checked = StoreSchema.safeParse(parsed);
    if (!checked.success) {
      return createEmptyStore();
    }

    const next: HomiStoreV1 = {
      storeVersion: 1,
      updatedAt: checked.data.updatedAt || nowIso(),
      datasetsByEngine: {},
      ui: checked.data.ui ?? {},
    };

    for (const [engineId, rawSet] of Object.entries(checked.data.datasetsByEngine)) {
      if (!isEngineId(engineId) || !Array.isArray(rawSet)) {
        continue;
      }

      const parsedSet = rawSet
        .map((rawDataSet) => {
          const safeParsed = DataSetSchema.safeParse(rawDataSet);
          if (!safeParsed.success) {
            return null;
          }

          if (!Array.isArray(safeParsed.data.items) || !validateEngineItems(engineId, safeParsed.data.items)) {
            return null;
          }

          return safeParsed.data as DataSetV1;
        })
        .filter((dataset): dataset is DataSetV1 => {
          if (!dataset) {
            return false;
          }
          if (dataset.engineId !== engineId) {
            return false;
          }
          return true;
        });

      if (parsedSet.length > 0) {
        next.datasetsByEngine[engineId] = parsedSet;
      }
    }

    const normalized = sanitizeStore(next);
    if (normalized !== next && normalized.datasetsByEngine !== next.datasetsByEngine) {
      saveStore(normalized);
    }
    return normalized;
  } catch {
    return createEmptyStore();
  }
}

export function saveStore(store: HomiStoreV1): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(
    HOMI_STORAGE_KEY,
    JSON.stringify({
      ...store,
      updatedAt: nowIso(),
    }),
  );
}

export function getDatasetsByEngine(store: HomiStoreV1, engineId: EngineId): DataSetV1[] {
  return store.datasetsByEngine[engineId] ?? [];
}

export function upsertDataset(store: HomiStoreV1, dataset: DataSetV1): HomiStoreV1 {
  const next: HomiStoreV1 = {
    ...store,
    datasetsByEngine: {
      ...store.datasetsByEngine,
    },
    updatedAt: nowIso(),
  };

  const current = [...getDatasetsByEngine(next, dataset.engineId)];
  const index = current.findIndex((item) => item.id === dataset.id);
  if (index >= 0) {
    current[index] = dataset;
  } else {
    current.push(dataset);
  }
  next.datasetsByEngine[dataset.engineId] = current;

  return next;
}

export function removeDataset(store: HomiStoreV1, engineId: EngineId, datasetId: string): HomiStoreV1 {
  const next: HomiStoreV1 = {
    ...store,
    datasetsByEngine: {
      ...store.datasetsByEngine,
    },
    updatedAt: nowIso(),
  };

  const current = getDatasetsByEngine(next, engineId).filter((item) => item.id !== datasetId);
  if (current.length > 0) {
    next.datasetsByEngine[engineId] = current;
  } else {
    delete next.datasetsByEngine[engineId];
  }

  return next;
}

export function importDatasets(
  store: HomiStoreV1,
  selected: DataSetPayloadV1[],
  sourceType: SourceType,
  options?: {
    bundleId?: string;
    sourceUrl?: string;
  },
): ImportResult {
  const now = nowIso();
  const next: HomiStoreV1 = {
    ...store,
    datasetsByEngine: {
      ...store.datasetsByEngine,
    },
    updatedAt: now,
  };

  const imported: DataSetV1[] = [];

  const engineToIdSet = new Map<string, Set<string>>();
  for (const [engineId, list] of Object.entries(next.datasetsByEngine)) {
    engineToIdSet.set(
      engineId,
      new Set(list.map((item) => item.id)),
    );
  }

  for (const payload of selected) {
    const existing = getDatasetsByEngine(next, payload.engineId);
    const idSet = engineToIdSet.get(payload.engineId) ?? new Set();
    const hasConflict = payload.id ? idSet.has(payload.id) : false;
    const localId = payload.id && !hasConflict ? payload.id : createId('ds');

    const source: SourceV1 = {
      type: sourceType,
      importedAt: now,
      bundleId: options?.bundleId,
      url: sourceType === 'url' ? options?.sourceUrl ?? null : undefined,
    };
    if (sourceType !== 'manual' && payload.id && hasConflict) {
      source.originalDatasetId = payload.id;
    }
    if (sourceType === 'manual') {
      delete source.importedAt;
      delete source.bundleId;
      delete source.url;
      delete source.originalDatasetId;
    }

    const converted: DataSetV1 = {
      ...payload,
      id: localId,
      createdAt: now,
      updatedAt: now,
      source: sourceType === 'manual' ? undefined : source,
    };

    existing.push(converted);
    idSet.add(localId);
    engineToIdSet.set(payload.engineId, idSet);
    next.datasetsByEngine[payload.engineId] = existing;
    imported.push(converted);
  }

  return { nextStore: next, imported };
}

export function buildBundleFromDatasetIds(
  store: HomiStoreV1,
  ids: string[],
  options: {
    bundleType: BundleType;
    title: string;
    description?: string;
  },
): HomiBundleV1 {
  const set = new Set(ids);
  const payloads: DataSetPayloadV1[] = [];

  for (const list of Object.values(store.datasetsByEngine)) {
    for (const dataset of list) {
      if (set.has(dataset.id)) {
        payloads.push(stripUnknownFieldsFromDataSet(dataset));
      }
    }
  }

  return {
    format: 'homi',
    version: 1,
    bundleType: options.bundleType,
    bundleId: createId('bundle'),
    title: options.title,
    description: options.description,
    createdAt: nowIso(),
    datasets: payloads,
  };
}
