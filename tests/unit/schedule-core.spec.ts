import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildSchedulePreviewEntries,
  buildScheduleSpeechPayload,
  evaluateScheduleTick,
  getReminderKey,
  getScheduleHourlyChimeHourKey,
  getScheduleRepeatMode,
  getScheduleTimingText,
  SCHEDULE_HOURLY_CHIME_AUDIO_URL,
} from '../../src/lib/engines/schedule-core';
import { isDatasetEnabled, parseBundleText, type DataSetV1 } from '../../src/lib/homi';

function loadScheduleDataset(relativePath: string): DataSetV1 {
  const parsed = parseBundleText(readFileSync(resolve(relativePath), 'utf8'));
  if (!parsed.ok) {
    throw new Error(parsed.errors.join(', '));
  }
  return parsed.datasets[0] as DataSetV1;
}

describe('schedule core', () => {
  it('fires overlapping daily/yearly reminders once and dedupes the same slot', () => {
    const dataset = loadScheduleDataset('tests/fixtures/bundle.schedule-overlap.v1.json');
    const now = Date.parse('2026-03-14T09:00:05');

    const first = evaluateScheduleTick({
      datasets: [dataset],
      now,
      quietUntilMs: null,
      hourlyChimeEnabled: false,
      dictationActive: false,
      reminderLastSlot: new Map(),
      hourlyChimeLastSlot: null,
      isDatasetEnabled,
    });

    expect(first.reminderEffects.map((effect) => effect.payload.title)).toEqual([
      '매일 스트레칭',
      '화이트데이 준비',
    ]);

    const second = evaluateScheduleTick({
      datasets: [dataset],
      now,
      quietUntilMs: null,
      hourlyChimeEnabled: false,
      dictationActive: false,
      reminderLastSlot: first.nextReminderLastSlot,
      hourlyChimeLastSlot: first.nextHourlyChimeLastSlot,
      isDatasetEnabled,
    });

    expect(second.reminderEffects).toHaveLength(0);
  });

  it('suppresses reminder and hourly chime effects during quiet mode', () => {
    const dataset = loadScheduleDataset('tests/fixtures/bundle.quiet-mode.v1.json');
    const now = Date.parse('2026-03-14T10:00:00');

    const result = evaluateScheduleTick({
      datasets: [dataset],
      now,
      quietUntilMs: now + 60_000,
      hourlyChimeEnabled: true,
      dictationActive: false,
      reminderLastSlot: new Map(),
      hourlyChimeLastSlot: null,
      isDatasetEnabled,
    });

    expect(result.quietModeActive).toBe(true);
    expect(result.reminderEffects).toHaveLength(0);
    expect(result.suppressedReminderEffects).toHaveLength(1);
    expect(result.hourlyChimeEffect).toBeNull();
  });

  it('builds preview metadata with readable recurrence text', () => {
    const dataset = loadScheduleDataset('tests/fixtures/bundle.schedule-overlap.v1.json');

    const entries = buildSchedulePreviewEntries([dataset], isDatasetEnabled);

    expect(entries.map((entry) => entry.meta)).toEqual([
      '아침 알림 묶음 · 사용중 · 매일 09:00 · 매일 09:00',
      '아침 알림 묶음 · 사용중 · 매년 03-14 09:00 · 매년 03-14 09:00',
    ]);
  });
});

describe('schedule core extended', () => {
  it('getReminderKey formats as datasetId:itemIndex', () => {
    expect(getReminderKey('ds_abc', 3)).toBe('ds_abc:3');
  });

  it('getScheduleRepeatMode detects daily, yearly, interval, and null', () => {
    expect(getScheduleRepeatMode({ repeat: 'daily', timeStart: '09:00' })).toBe('daily');
    expect(getScheduleRepeatMode({ repeat: 'yearly', monthDay: '03-14', timeStart: '09:00' })).toBe('yearly');
    expect(getScheduleRepeatMode({ repeatIntervalSec: 5 })).toBe('interval');
    expect(getScheduleRepeatMode({ timeStart: '08:00' })).toBe('daily');
    expect(getScheduleRepeatMode({ monthDay: '12-25', timeStart: '10:00' })).toBe('yearly');
    expect(getScheduleRepeatMode({})).toBeNull();
  });

  it('getScheduleTimingText formats each repeat mode correctly', () => {
    expect(getScheduleTimingText({ repeat: 'daily', timeStart: '09:00' })).toBe('매일 09:00');
    expect(getScheduleTimingText({ repeat: 'yearly', monthDay: '03-14', timeStart: '09:00' })).toBe('매년 03-14 09:00');
    expect(getScheduleTimingText({ repeatIntervalSec: 10 })).toBe('테스트용 매 10초');
    expect(getScheduleTimingText({})).toBe('');
  });

  it('buildScheduleSpeechPayload constructs title and notificationBody', () => {
    const payload = buildScheduleSpeechPayload('데이터셋', {
      title: '알림 제목',
      timeStart: '09:00',
      repeat: 'daily',
      notes: '메모',
    });
    expect(payload.title).toBe('알림 제목');
    expect(payload.notificationBody).toContain('알림 제목');
    expect(payload.notificationBody).toContain('매일 09:00');
    expect(payload.notificationBody).toContain('메모');
  });

  it('buildScheduleSpeechPayload falls back to dataset title when item has no title', () => {
    const payload = buildScheduleSpeechPayload('대체 이름', {});
    expect(payload.title).toBe('대체 이름');
  });

  it('getScheduleHourlyChimeHourKey produces correct hourly key', () => {
    const key = getScheduleHourlyChimeHourKey(Date.parse('2026-03-14T15:30:00'));
    expect(key).toBe('hourly:2026-03-14T15');
  });

  it('evaluateScheduleTick suppresses reminders during active dictation', () => {
    const dataset = loadScheduleDataset('tests/fixtures/bundle.quiet-mode.v1.json');
    const now = Date.parse('2026-03-14T10:00:00');

    const result = evaluateScheduleTick({
      datasets: [dataset],
      now,
      quietUntilMs: null,
      hourlyChimeEnabled: false,
      dictationActive: true,
      reminderLastSlot: new Map(),
      hourlyChimeLastSlot: null,
      isDatasetEnabled,
    });

    expect(result.reminderEffects).toHaveLength(0);
    expect(result.suppressedReminderEffects).toHaveLength(1);
  });

  it('evaluateScheduleTick fires hourly chime at the top of the hour', () => {
    const now = Date.parse('2026-03-14T11:00:00');

    const result = evaluateScheduleTick({
      datasets: [],
      now,
      quietUntilMs: null,
      hourlyChimeEnabled: true,
      dictationActive: false,
      reminderLastSlot: new Map(),
      hourlyChimeLastSlot: null,
      isDatasetEnabled,
    });

    expect(result.hourlyChimeEffect).toEqual({ audioUrl: SCHEDULE_HOURLY_CHIME_AUDIO_URL });
    expect(result.nextHourlyChimeLastSlot).toBe('hourly:2026-03-14T11');
  });

  it('evaluateScheduleTick does not fire chime when disabled', () => {
    const now = Date.parse('2026-03-14T11:00:00');

    const result = evaluateScheduleTick({
      datasets: [],
      now,
      quietUntilMs: null,
      hourlyChimeEnabled: false,
      dictationActive: false,
      reminderLastSlot: new Map(),
      hourlyChimeLastSlot: null,
      isDatasetEnabled,
    });

    expect(result.hourlyChimeEffect).toBeNull();
    expect(result.nextHourlyChimeLastSlot).toBeNull();
  });

  it('evaluateScheduleTick deduplicates hourly chime in the same hour', () => {
    const now = Date.parse('2026-03-14T11:00:30');
    const existingSlot = 'hourly:2026-03-14T11';

    const result = evaluateScheduleTick({
      datasets: [],
      now,
      quietUntilMs: null,
      hourlyChimeEnabled: true,
      dictationActive: false,
      reminderLastSlot: new Map(),
      hourlyChimeLastSlot: existingSlot,
      isDatasetEnabled,
    });

    expect(result.hourlyChimeEffect).toBeNull();
  });

  it('evaluateScheduleTick skips disabled datasets', () => {
    const dataset = loadScheduleDataset('tests/fixtures/bundle.quiet-mode.v1.json');
    const disabledDataset: DataSetV1 = {
      ...dataset,
      meta: { enabled: false },
    };
    const now = Date.parse('2026-03-14T10:00:00');

    const result = evaluateScheduleTick({
      datasets: [disabledDataset],
      now,
      quietUntilMs: null,
      hourlyChimeEnabled: false,
      dictationActive: false,
      reminderLastSlot: new Map(),
      hourlyChimeLastSlot: null,
      isDatasetEnabled,
    });

    expect(result.reminderEffects).toHaveLength(0);
    expect(result.suppressedReminderEffects).toHaveLength(0);
  });
});
