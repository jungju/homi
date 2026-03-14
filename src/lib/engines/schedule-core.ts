import type { DataSetV1 } from '../homi';

export const SCHEDULE_HOURLY_CHIME_AUDIO_URL = '/sounds/chime.mp3';

export interface SchedulePreviewEntry {
  key: string;
  datasetId: string;
  datasetTitle: string;
  itemIndex: number;
  title: string;
  meta: string;
  item: Record<string, unknown>;
}

export interface ScheduleSpeechPayload {
  title: string;
  notificationBody: string;
  audioUrl?: string;
}

export interface ScheduleReminderEffect {
  key: string;
  datasetId: string;
  datasetTitle: string;
  itemIndex: number;
  item: Record<string, unknown>;
  payload: ScheduleSpeechPayload;
}

export interface ScheduleTickResult {
  quietModeActive: boolean;
  nextReminderLastSlot: Map<string, string>;
  nextHourlyChimeLastSlot: string | null;
  reminderEffects: ScheduleReminderEffect[];
  suppressedReminderEffects: ScheduleReminderEffect[];
  hourlyChimeEffect: { audioUrl: string } | null;
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

function getMonthDayFromDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  return value.slice(5);
}

export function getReminderKey(datasetId: string, itemIndex: number) {
  return `${datasetId}:${itemIndex}`;
}

export function getScheduleRepeatMode(item: Record<string, unknown>): 'daily' | 'yearly' | 'interval' | null {
  const repeat = asString(item.repeat);
  if (repeat === 'daily' || repeat === 'yearly') {
    return repeat;
  }
  if (asPositiveInt(item.repeatIntervalSec)) {
    return 'interval';
  }
  if (asString(item.monthDay)) {
    return 'yearly';
  }
  if (asString(item.timeStart) || asString(item.date)) {
    return 'daily';
  }
  return null;
}

export function getScheduleTimingText(item: Record<string, unknown>) {
  const repeatMode = getScheduleRepeatMode(item);
  const timeStart = asString(item.timeStart);
  const monthDay = asString(item.monthDay) ?? getMonthDayFromDate(asString(item.date));

  if (repeatMode === 'interval') {
    const intervalSec = asPositiveInt(item.repeatIntervalSec);
    return intervalSec ? `테스트용 매 ${intervalSec}초` : '테스트용 반복';
  }

  if (repeatMode === 'yearly' && monthDay && timeStart) {
    return `매년 ${monthDay} ${timeStart}`;
  }

  if (timeStart) {
    return `매일 ${timeStart}`;
  }

  return '';
}

function getScheduleReminderSlot(item: Record<string, unknown>, now: number) {
  const repeatMode = getScheduleRepeatMode(item);
  if (!repeatMode) {
    return null;
  }

  if (repeatMode === 'interval') {
    const intervalSec = asPositiveInt(item.repeatIntervalSec);
    if (!intervalSec) {
      return null;
    }
    const intervalMs = intervalSec * 1000;
    return {
      slotKey: `interval:${Math.floor(now / intervalMs)}`,
      fireOnFirstSeen: false,
    };
  }

  const timeStart = asString(item.timeStart);
  if (!timeStart) {
    return null;
  }

  const [targetHourText, targetMinuteText] = timeStart.split(':');
  const targetHour = Number(targetHourText);
  const targetMinute = Number(targetMinuteText);
  if (!Number.isInteger(targetHour) || !Number.isInteger(targetMinute)) {
    return null;
  }

  const current = new Date(now);
  if (current.getHours() !== targetHour || current.getMinutes() !== targetMinute) {
    return {
      slotKey: null,
      fireOnFirstSeen: true,
    };
  }

  const currentMonthDay = `${String(current.getMonth() + 1).padStart(2, '0')}-${String(
    current.getDate(),
  ).padStart(2, '0')}`;

  if (repeatMode === 'yearly') {
    const monthDay = asString(item.monthDay) ?? getMonthDayFromDate(asString(item.date));
    if (!monthDay || monthDay !== currentMonthDay) {
      return {
        slotKey: null,
        fireOnFirstSeen: true,
      };
    }
    return {
      slotKey: `yearly:${current.getFullYear()}-${monthDay}T${timeStart}`,
      fireOnFirstSeen: true,
    };
  }

  return {
    slotKey: `daily:${current.getFullYear()}-${currentMonthDay}T${timeStart}`,
    fireOnFirstSeen: true,
  };
}

export function buildScheduleSpeechPayload(datasetTitle: string, item: Record<string, unknown>): ScheduleSpeechPayload {
  const title = asString(item.title) ?? datasetTitle ?? 'Homi 알림';
  const bodyParts = [getScheduleTimingText(item), asString(item.notes) ?? ''].filter(Boolean);
  return {
    title,
    notificationBody: `${title}${bodyParts.length > 0 ? ` - ${bodyParts.join(' ')}` : ''}`,
    audioUrl: asString(item.audioUrl),
  };
}

export function getScheduleHourlyChimeHourKey(now: number) {
  const current = new Date(now);
  return `hourly:${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(
    current.getDate(),
  ).padStart(2, '0')}T${String(current.getHours()).padStart(2, '0')}`;
}

function formatSchedulePreviewMeta(
  dataset: DataSetV1,
  item: Record<string, unknown>,
  isDatasetEnabled: (dataset: DataSetV1) => boolean,
) {
  const parts = [
    dataset.title,
    isDatasetEnabled(dataset) ? '사용중' : '사용안함',
    getScheduleTimingText(item),
    asString(item.notes) ?? '',
  ].filter(Boolean);
  return parts.join(' · ');
}

export function buildSchedulePreviewEntries(
  datasets: DataSetV1[],
  isDatasetEnabled: (dataset: DataSetV1) => boolean,
): SchedulePreviewEntry[] {
  return datasets.flatMap((dataset) =>
    dataset.items.flatMap((rawItem, itemIndex) => {
      if (!isPlainRecord(rawItem)) {
        return [];
      }
      return [
        {
          key: getReminderKey(dataset.id, itemIndex),
          datasetId: dataset.id,
          datasetTitle: dataset.title,
          itemIndex,
          title: asString(rawItem.title) ?? `${dataset.title} 항목 ${itemIndex + 1}`,
          meta: formatSchedulePreviewMeta(dataset, rawItem, isDatasetEnabled),
          item: rawItem,
        } satisfies SchedulePreviewEntry,
      ];
    }),
  );
}

export function evaluateScheduleTick(input: {
  datasets: DataSetV1[];
  now: number;
  quietUntilMs: number | null;
  hourlyChimeEnabled: boolean;
  dictationActive: boolean;
  reminderLastSlot: ReadonlyMap<string, string>;
  hourlyChimeLastSlot: string | null;
  isDatasetEnabled: (dataset: DataSetV1) => boolean;
}): ScheduleTickResult {
  const reminders = input.datasets.filter((dataset) => input.isDatasetEnabled(dataset));
  const quietModeActive = input.quietUntilMs !== null && input.quietUntilMs > input.now;
  const nextReminderLastSlot = new Map<string, string>();
  const dueCandidates: ScheduleReminderEffect[] = [];
  let nextHourlyChimeLastSlot = input.hourlyChimeLastSlot;

  if (input.hourlyChimeEnabled) {
    const currentHourKey = getScheduleHourlyChimeHourKey(input.now);
    if (new Date(input.now).getMinutes() === 0 && input.hourlyChimeLastSlot !== currentHourKey) {
      nextHourlyChimeLastSlot = currentHourKey;
    }
  } else {
    nextHourlyChimeLastSlot = null;
  }

  reminders.forEach((dataset) => {
    dataset.items.forEach((rawItem, itemIndex) => {
      if (!isPlainRecord(rawItem)) {
        return;
      }

      const key = getReminderKey(dataset.id, itemIndex);
      const reminderSlot = getScheduleReminderSlot(rawItem, input.now);
      if (!reminderSlot) {
        return;
      }

      const lastSlot = input.reminderLastSlot.get(key);
      if (lastSlot !== undefined) {
        nextReminderLastSlot.set(key, lastSlot);
      }

      if (!reminderSlot.slotKey) {
        return;
      }

      if (lastSlot === undefined && !reminderSlot.fireOnFirstSeen) {
        nextReminderLastSlot.set(key, reminderSlot.slotKey);
        return;
      }

      if (lastSlot === reminderSlot.slotKey) {
        nextReminderLastSlot.set(key, reminderSlot.slotKey);
        return;
      }

      dueCandidates.push({
        key,
        datasetId: dataset.id,
        datasetTitle: dataset.title,
        itemIndex,
        item: rawItem,
        payload: buildScheduleSpeechPayload(dataset.title, rawItem),
      });
      nextReminderLastSlot.set(key, reminderSlot.slotKey);
    });
  });

  const reminderEffects =
    quietModeActive || input.dictationActive ? [] : dueCandidates;
  const suppressedReminderEffects =
    quietModeActive || input.dictationActive ? dueCandidates : [];
  const hourlyChimeEffect =
    input.hourlyChimeEnabled &&
    new Date(input.now).getMinutes() === 0 &&
    nextHourlyChimeLastSlot !== null &&
    nextHourlyChimeLastSlot !== input.hourlyChimeLastSlot &&
    !quietModeActive &&
    !input.dictationActive
      ? { audioUrl: SCHEDULE_HOURLY_CHIME_AUDIO_URL }
      : null;

  return {
    quietModeActive,
    nextReminderLastSlot,
    nextHourlyChimeLastSlot,
    reminderEffects,
    suppressedReminderEffects,
    hourlyChimeEffect,
  };
}
