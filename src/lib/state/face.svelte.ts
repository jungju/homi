import type { TimerHandle, HomiRuntime } from '../runtime';

export type HomeMood = 'smile' | 'curious' | 'proud' | 'calm' | 'concern' | 'wink';

let _runtime: HomiRuntime = null!;
let _blink = $state(false);
let _blinkResetTimeout: TimerHandle | null = null;
let _homeAlertText = $state('');
let _homeAlertTimeout: TimerHandle | null = null;

const HOME_ALERT_VISIBILITY_MS = 8_000;

export function initFaceState(runtime: HomiRuntime) {
  _runtime = runtime;
}

export function getBlink(): boolean {
  return _blink;
}

export function getHomeAlertText(): string {
  return _homeAlertText;
}

export function triggerHomeWink() {
  _blink = true;
  if (_blinkResetTimeout !== null) {
    _runtime.clock.clearTimeout(_blinkResetTimeout);
  }
  _blinkResetTimeout = _runtime.clock.setTimeout(() => {
    _blink = false;
    _blinkResetTimeout = null;
  }, 450);
}

export function showHomeAlert(text: string) {
  _homeAlertText = text;
  if (_homeAlertTimeout !== null) {
    _runtime.clock.clearTimeout(_homeAlertTimeout);
  }
  _homeAlertTimeout = _runtime.clock.setTimeout(() => {
    _homeAlertText = '';
    _homeAlertTimeout = null;
  }, HOME_ALERT_VISIBILITY_MS);
}

export function cleanupFace() {
  if (_blinkResetTimeout !== null) {
    _runtime.clock.clearTimeout(_blinkResetTimeout);
    _blinkResetTimeout = null;
  }
  if (_homeAlertTimeout !== null) {
    _runtime.clock.clearTimeout(_homeAlertTimeout);
    _homeAlertTimeout = null;
  }
}
