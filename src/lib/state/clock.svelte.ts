import type { TimerHandle, HomiRuntime } from '../runtime';

const HOME_CLOCK_WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

let _runtime: HomiRuntime = null!;
let _homeClockNow = $state(0);
let _homeClockTimer: TimerHandle | null = null;

export function initClockState(runtime: HomiRuntime) {
  _runtime = runtime;
  _homeClockNow = runtime.clock.now();
}

export function getHomeClockDateText(): string {
  return formatHomeClockDate(_homeClockNow);
}

export function getHomeClockTimeText(): string {
  return formatHomeClockTime(_homeClockNow);
}

function formatHomeClockDate(timestamp: number) {
  const now = new Date(timestamp);
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(
    now.getDate(),
  ).padStart(2, '0')} ${HOME_CLOCK_WEEKDAYS[now.getDay()]}`;
}

function formatHomeClockTime(timestamp: number) {
  const now = new Date(timestamp);
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function refreshHomeClock() {
  _homeClockNow = _runtime.clock.now();
  const elapsedInMinute = _homeClockNow % 60_000;
  const remainingMs = elapsedInMinute === 0 ? 60_000 : 60_000 - elapsedInMinute;
  if (_homeClockTimer !== null) {
    _runtime.clock.clearTimeout(_homeClockTimer);
  }
  _homeClockTimer = _runtime.clock.setTimeout(() => {
    _homeClockTimer = null;
    refreshHomeClock();
  }, remainingMs);
}

export function startHomeClock() {
  refreshHomeClock();
}

export function stopHomeClock() {
  if (_homeClockTimer !== null) {
    _runtime.clock.clearTimeout(_homeClockTimer);
    _homeClockTimer = null;
  }
}
