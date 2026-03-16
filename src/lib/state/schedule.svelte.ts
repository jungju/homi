import {
  buildSchedulePreviewEntries,
  buildScheduleSpeechPayload,
  evaluateScheduleTick,
  getScheduleHourlyChimeHourKey,
  SCHEDULE_HOURLY_CHIME_AUDIO_URL,
  type SchedulePreviewEntry,
} from '../engines/schedule-core';
import { getDatasetsByEngine, isDatasetEnabled } from '../homi';
import type { TimerHandle, HomiRuntime } from '../runtime';
import { playSpeechOrAudio } from '../runtime';
import { getStore, persist, updateStoreUi } from './app.svelte';
import { triggerHomeWink, showHomeAlert } from './face.svelte';
import { setMessage } from './message.svelte';

const SCHEDULE_REMINDER_TICK_MS = 1000;
const SCHEDULE_QUIET_MODE_MS = 30 * 60 * 1000;

let _runtime: HomiRuntime = null!;
let _scheduleReminderTimer: TimerHandle | null = null;
let _scheduleReminderLastSlot = new Map<string, string>();
let _scheduleTickNow = $state(0);
let _reminderPermissionWarned = false;
let _schedulePreviewPlayedKey = $state<string | null>(null);
let _schedulePreviewPlayedMode = $state<'speech' | 'audio' | 'unavailable' | null>(null);
let _scheduleHourlyChimeLastSlot: string | null = null;
let _scheduleHourlyChimePrimed = false;

export function initScheduleState(runtime: HomiRuntime) {
  _runtime = runtime;
  _scheduleTickNow = runtime.clock.now();
}

export function getScheduleTickNow(): number {
  return _scheduleTickNow;
}

export function getScheduleQuietUntilMs(): number | null {
  const store = getStore();
  const rawValue = store.ui?.scheduleQuietUntil;
  if (!rawValue) return null;
  const parsed = _runtime.clock.parse(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getSchedulePreviewEntries(): SchedulePreviewEntry[] {
  const store = getStore();
  return buildSchedulePreviewEntries(getDatasetsByEngine(store, 'schedule'), isDatasetEnabled);
}

export function getScheduleQuietModeActive(): boolean {
  const quietUntilMs = getScheduleQuietUntilMs();
  return quietUntilMs !== null && quietUntilMs > _scheduleTickNow;
}

export function getScheduleQuietStatusText(): string {
  const quietUntilMs = getScheduleQuietUntilMs();
  const active = quietUntilMs !== null && quietUntilMs > _scheduleTickNow;
  return active
    ? `현재 상태: ${Math.ceil((quietUntilMs! - _scheduleTickNow) / 60_000)}분 남음`
    : '현재 상태: 꺼짐';
}

export function getHomeQuietStatusText(): string {
  const quietUntilMs = getScheduleQuietUntilMs();
  const active = quietUntilMs !== null && quietUntilMs > _scheduleTickNow;
  return active
    ? `알림 조용히 중 · ${Math.ceil((quietUntilMs! - _scheduleTickNow) / 60_000)}분 남음`
    : '';
}

export function getScheduleHourlyChimeStatusText(): string {
  const store = getStore();
  return store.ui?.scheduleHourlyChimeEnabled === true
    ? '현재 상태: 켜짐 · 매시 정각 차임'
    : '현재 상태: 꺼짐';
}

export function getSchedulePreviewStatusText(): string {
  const entries = getSchedulePreviewEntries();
  const lastEntry = _schedulePreviewPlayedKey
    ? entries.find((entry) => entry.key === _schedulePreviewPlayedKey) ?? null
    : null;
  if (entries.length === 0) {
    return '등록된 스케줄 항목이 없습니다.';
  }
  if (lastEntry && _schedulePreviewPlayedMode) {
    return _schedulePreviewPlayedMode === 'audio'
      ? `최근 오디오 미리 듣기: ${lastEntry.title}`
      : _schedulePreviewPlayedMode === 'speech'
        ? `최근 음성 미리 듣기: ${lastEntry.title}`
        : `이 브라우저에서는 "${lastEntry.title}" 음성 미리 듣기를 사용할 수 없습니다.`;
  }
  return '등록된 스케줄 항목을 눌러 음성을 미리 들어보세요.';
}

export async function previewScheduleEntry(entry: SchedulePreviewEntry) {
  const payload = buildScheduleSpeechPayload(entry.datasetTitle, entry.item);
  const mode = await playSpeechOrAudio(_runtime, {
    text: payload.title,
    audioUrl: payload.audioUrl,
    lang: 'ko-KR',
  });
  _schedulePreviewPlayedKey = entry.key;
  _schedulePreviewPlayedMode = mode;
  if (mode !== 'unavailable') {
    triggerHomeWink();
  }
}

async function announceReminder(effect: {
  datasetTitle: string;
  payload: { title: string; notificationBody: string; audioUrl?: string };
}) {
  showHomeAlert(effect.payload.title);
  const permission = _runtime.notifications.permission();
  if (permission === 'granted') {
    _runtime.notifications.notify(`Homi / ${effect.datasetTitle}`, {
      body: effect.payload.notificationBody,
    });
  } else if (!_reminderPermissionWarned && permission !== 'denied' && permission !== 'unsupported') {
    setMessage('브라우저 알림이 차단되어 있어 표시되지 않을 수 있어요. 알림 허용 시 스케줄 알림이 뜹니다.', 'error', _runtime.clock);
    _reminderPermissionWarned = true;
  }
  await playSpeechOrAudio(_runtime, {
    text: effect.payload.title,
    audioUrl: effect.payload.audioUrl,
    lang: 'ko-KR',
  });
}

function tickScheduleReminder(dictationGameMode: boolean) {
  const store = getStore();
  const now = _runtime.clock.now();
  const quietUntilMs = getScheduleQuietUntilMs();
  _scheduleTickNow = now;

  const result = evaluateScheduleTick({
    datasets: getDatasetsByEngine(store, 'schedule'),
    now,
    quietUntilMs,
    hourlyChimeEnabled: store.ui?.scheduleHourlyChimeEnabled === true,
    dictationActive: dictationGameMode,
    reminderLastSlot: _scheduleReminderLastSlot,
    hourlyChimeLastSlot: _scheduleHourlyChimeLastSlot,
    isDatasetEnabled,
  });

  _scheduleReminderLastSlot = result.nextReminderLastSlot;
  _scheduleHourlyChimeLastSlot = result.nextHourlyChimeLastSlot;

  if (result.hourlyChimeEffect) {
    void _runtime.audio.play(result.hourlyChimeEffect.audioUrl);
  }

  if (result.reminderEffects.length === 0) return;
  triggerHomeWink();
  result.reminderEffects.forEach((effect) => {
    void announceReminder(effect);
  });
}

export function startScheduleReminder(getDictationGameMode: () => boolean) {
  if (_scheduleReminderTimer !== null) return;
  tickScheduleReminder(getDictationGameMode());
  _scheduleReminderTimer = _runtime.clock.setInterval(() => {
    tickScheduleReminder(getDictationGameMode());
  }, SCHEDULE_REMINDER_TICK_MS);
}

export function stopScheduleReminder() {
  if (_scheduleReminderTimer === null) return;
  _runtime.clock.clearInterval(_scheduleReminderTimer);
  _scheduleReminderTimer = null;
}

export function startScheduleQuietMode() {
  const quietUntil = _runtime.clock.toISOString(_runtime.clock.now() + SCHEDULE_QUIET_MODE_MS);
  _scheduleTickNow = _runtime.clock.now();
  updateStoreUi({ scheduleQuietUntil: quietUntil });
  setMessage('30분 동안 스케줄 알림을 무시합니다.', 'ok', _runtime.clock);
}

export function clearScheduleQuietMode() {
  _scheduleTickNow = _runtime.clock.now();
  updateStoreUi({ scheduleQuietUntil: undefined });
  setMessage('조용히 모드를 해제했습니다.', 'ok', _runtime.clock);
}

export function toggleScheduleHourlyChime() {
  const store = getStore();
  const nextEnabled = store.ui?.scheduleHourlyChimeEnabled !== true;
  updateStoreUi({ scheduleHourlyChimeEnabled: nextEnabled });
  setMessage(nextEnabled ? '정시 차임을 켰습니다.' : '정시 차임을 껐습니다.', 'ok', _runtime.clock);
}

export function primeHourlyChime() {
  const store = getStore();
  const hourlyChimeEnabled = store.ui?.scheduleHourlyChimeEnabled === true;
  if (hourlyChimeEnabled && !_scheduleHourlyChimePrimed) {
    _scheduleHourlyChimeLastSlot = getScheduleHourlyChimeHourKey(_runtime.clock.now());
  }
  if (!hourlyChimeEnabled) {
    _scheduleHourlyChimeLastSlot = null;
  }
  _scheduleHourlyChimePrimed = hourlyChimeEnabled;
}
