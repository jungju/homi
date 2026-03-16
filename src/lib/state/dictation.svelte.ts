import {
  advanceDictationSession,
  createIdleDictationSession,
  ensureDictationSession,
  selectDictationDataset as selectDictationDatasetState,
  startDictationSession as startDictationSessionState,
  stopDictationSession as stopDictationSessionState,
  type DictationSessionState,
  type DictationTransition,
  type DictationWriteMode,
} from '../engines/dictation-core';
import { getDatasetsByEngine, type DataSetV1 } from '../homi';
import type { TimerHandle, HomiRuntime } from '../runtime';
import { getStore } from './app.svelte';
import { triggerHomeWink } from './face.svelte';
import { setMessage } from './message.svelte';
import { getRoute, navigate } from './route.svelte';

const DICTATION_INTERVAL_MS = 10_000;

let _runtime: HomiRuntime = null!;
let _dictationSession = $state<DictationSessionState>(createIdleDictationSession());
let _dictationMode = $state<DictationWriteMode>('korean');
let _dictationIntervalTimer: TimerHandle | null = null;

export function initDictationState(runtime: HomiRuntime) {
  _runtime = runtime;
}

export function getDictationSession(): DictationSessionState {
  return _dictationSession;
}

export function setDictationSession(session: DictationSessionState) {
  _dictationSession = session;
}

export function getDictationMode(): DictationWriteMode {
  return _dictationMode;
}

export function setDictationMode(mode: DictationWriteMode) {
  _dictationMode = mode;
}

export function getSelectedDictationDataset(): DataSetV1 | null {
  const store = getStore();
  return _dictationSession.datasetId
    ? getDatasetsByEngine(store, 'dictation').find((d) => d.id === _dictationSession.datasetId) ?? null
    : null;
}

function startDictationAutoTimer() {
  if (_dictationIntervalTimer !== null) {
    _runtime.clock.clearInterval(_dictationIntervalTimer);
  }
  _dictationIntervalTimer = _runtime.clock.setInterval(() => {
    if (!_dictationSession.running) return;
    applyDictationTransition(
      advanceDictationSession(_dictationSession, getSelectedDictationDataset(), _dictationMode, { auto: true }),
    );
  }, DICTATION_INTERVAL_MS);
}

export function applyDictationTransition(transition: DictationTransition) {
  if (_dictationIntervalTimer !== null && (transition.stopTimer || transition.restartTimer || !transition.nextState.running)) {
    _runtime.clock.clearInterval(_dictationIntervalTimer);
    _dictationIntervalTimer = null;
  }
  if (!transition.nextState.running || transition.speakPayload) {
    _runtime.speech.cancel();
  }
  _dictationSession = transition.nextState;
  if (transition.navigateHome && getRoute().kind !== 'home') {
    navigate('/');
  }
  if (transition.speakPayload) {
    triggerHomeWink();
    _runtime.speech.speak(transition.speakPayload);
  }
  if (transition.restartTimer) {
    startDictationAutoTimer();
  }
  if (transition.message) {
    setMessage(transition.message.text, transition.message.type, _runtime.clock);
  }
}

export function selectDictationDataset(dataset: DataSetV1) {
  applyDictationTransition(selectDictationDatasetState(_dictationSession, dataset));
  if (getRoute().kind === 'engine') {
    setMessage(`"${dataset.title}"를 받아쓰기 대상으로 선택했습니다.`, 'ok', _runtime.clock);
  }
}

export function stopDictation() {
  applyDictationTransition(stopDictationSessionState(_dictationSession));
}

export function startDictation() {
  applyDictationTransition(
    startDictationSessionState(_dictationSession, getSelectedDictationDataset(), _dictationMode),
  );
}

export function onNextDictationItem() {
  if (!_dictationSession.running) {
    setMessage('시작한 뒤 Next를 눌러주세요.', 'error', _runtime.clock);
    return;
  }
  applyDictationTransition(
    advanceDictationSession(_dictationSession, getSelectedDictationDataset(), _dictationMode, { auto: false }),
  );
}

export function ensureDictationUiStopsIfNeeded() {
  applyDictationTransition(ensureDictationSession(_dictationSession, getSelectedDictationDataset()));
}
