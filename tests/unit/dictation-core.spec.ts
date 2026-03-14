import { describe, expect, it } from 'vitest';

import {
  advanceDictationSession,
  createIdleDictationSession,
  ensureDictationSession,
  getCurrentDictationItem,
  getDictationDisplayText,
  getDictationSpeechPayload,
  selectDictationDataset,
  startDictationSession,
  stopDictationSession,
  type DictationSessionState,
} from '../../src/lib/engines/dictation-core';
import { type DataSetV1 } from '../../src/lib/homi';

function makeDataset(items: Array<Record<string, unknown>>): DataSetV1 {
  return {
    id: 'dictation_unit_1',
    engineId: 'dictation',
    engineSchemaVersion: 1,
    title: '단위 테스트 받아쓰기',
    items,
    createdAt: '2026-03-14T00:00:00.000Z',
    updatedAt: '2026-03-14T00:00:00.000Z',
  };
}

describe('dictation core', () => {
  it('starts, advances, and finishes a dictation session deterministically', () => {
    const dataset = makeDataset([
      { word: 'apple', meaning: '사과' },
      { word: 'book', meaning: '책' },
    ]);
    const idle = createIdleDictationSession();
    const selected = selectDictationDataset(idle, dataset).nextState;

    const started = startDictationSession(selected, dataset, 'korean');
    expect(started.nextState.running).toBe(true);
    expect(started.navigateHome).toBe(true);
    expect(started.restartTimer).toBe(true);
    expect(started.speakPayload?.text).toBe('apple');

    const next = advanceDictationSession(started.nextState, dataset, 'korean', { auto: false });
    expect(next.nextState.currentIndex).toBe(1);
    expect(next.restartTimer).toBe(true);
    expect(next.speakPayload?.text).toBe('book');

    const finished = advanceDictationSession(next.nextState, dataset, 'korean', { auto: true });
    expect(finished.nextState.running).toBe(false);
    expect(finished.message?.text).toBe('마지막 항목까지 진행했습니다.');
  });

  it('skips invalid middle items during auto-advance', () => {
    const dataset = makeDataset([
      { word: 'apple', meaning: '사과' },
      { meaning: '누락된 영단어' },
      { word: 'book', meaning: '책' },
    ]);
    const session: DictationSessionState = {
      datasetId: dataset.id,
      currentIndex: 0,
      running: true,
      gameMode: true,
    };

    const next = advanceDictationSession(session, dataset, 'korean', { auto: true });
    expect(next.nextState.currentIndex).toBe(2);
    expect(next.speakPayload?.text).toBe('book');
  });

  it('derives current display text from the current item and write mode', () => {
    const dataset = makeDataset([{ word: 'apple', meaning: '사과' }]);
    const current = getCurrentDictationItem(dataset, {
      datasetId: dataset.id,
      currentIndex: 0,
      running: true,
      gameMode: true,
    });

    expect(current).not.toBeNull();
    expect(getDictationDisplayText(current!, 'korean')).toBe('apple');
    expect(getDictationDisplayText(current!, 'english')).toBe('사과');
  });
});

describe('dictation core extended', () => {
  it('startDictationSession returns error when dataset is null', () => {
    const idle = createIdleDictationSession();
    const result = startDictationSession(idle, null, 'korean');
    expect(result.nextState.running).toBe(false);
    expect(result.stopTimer).toBe(true);
    expect(result.message?.type).toBe('error');
    expect(result.message?.text).toContain('선택');
  });

  it('startDictationSession returns error when dataset has no items', () => {
    const dataset = makeDataset([]);
    const idle = createIdleDictationSession();
    const result = startDictationSession(idle, dataset, 'korean');
    expect(result.nextState.running).toBe(false);
    expect(result.stopTimer).toBe(true);
    expect(result.message?.type).toBe('error');
    expect(result.message?.text).toContain('비어');
  });

  it('stopDictationSession clears running and sets stopTimer', () => {
    const running: DictationSessionState = {
      datasetId: 'ds1',
      currentIndex: 1,
      running: true,
      gameMode: true,
    };
    const result = stopDictationSession(running);
    expect(result.nextState.running).toBe(false);
    expect(result.nextState.gameMode).toBe(false);
    expect(result.stopTimer).toBe(true);
  });

  it('selectDictationDataset ignores non-dictation engine', () => {
    const idle = createIdleDictationSession();
    const scheduleDataset: DataSetV1 = {
      id: 'sched_1',
      engineId: 'schedule',
      engineSchemaVersion: 1,
      title: 'schedule ds',
      items: [{ title: 'test', repeat: 'daily', timeStart: '09:00' }],
      createdAt: '2026-03-14T00:00:00.000Z',
      updatedAt: '2026-03-14T00:00:00.000Z',
    };
    const result = selectDictationDataset(idle, scheduleDataset);
    expect(result.nextState).toBe(idle);
  });

  it('getDictationSpeechPayload in english mode prefers meaning, falls back to word', () => {
    expect(getDictationSpeechPayload({ word: 'apple', meaning: '사과' }, 'english')).toEqual({
      text: '사과',
      lang: 'ko-KR',
    });
    expect(getDictationSpeechPayload({ word: 'apple' }, 'english')).toEqual({
      text: 'apple',
      lang: 'ko-KR',
    });
  });

  it('getDictationSpeechPayload returns null for empty item', () => {
    expect(getDictationSpeechPayload({}, 'korean')).toBeNull();
    expect(getDictationSpeechPayload({}, 'english')).toBeNull();
  });

  it('advanceDictationSession auto=false stops on invalid item with error', () => {
    const dataset = makeDataset([
      { word: 'apple', meaning: '사과' },
      { meaning: '누락된 영단어' },
    ]);
    const session: DictationSessionState = {
      datasetId: dataset.id,
      currentIndex: 0,
      running: true,
      gameMode: true,
    };
    const next = advanceDictationSession(session, dataset, 'korean', { auto: false });
    expect(next.nextState.currentIndex).toBe(1);
    expect(next.message?.type).toBe('error');
    expect(next.speakPayload).toBeUndefined();
  });

  it('advanceDictationSession returns finish when dataset is null', () => {
    const session: DictationSessionState = {
      datasetId: 'ds1',
      currentIndex: 0,
      running: true,
      gameMode: true,
    };
    const result = advanceDictationSession(session, null, 'korean', { auto: false });
    expect(result.nextState.running).toBe(false);
    expect(result.stopTimer).toBe(true);
  });

  it('ensureDictationSession resets when dataset is null', () => {
    const session: DictationSessionState = {
      datasetId: 'ds1',
      currentIndex: 2,
      running: true,
      gameMode: true,
    };
    const result = ensureDictationSession(session, null);
    expect(result.nextState.datasetId).toBeNull();
    expect(result.nextState.currentIndex).toBe(0);
    expect(result.nextState.running).toBe(false);
  });

  it('ensureDictationSession clamps index when beyond dataset length', () => {
    const dataset = makeDataset([{ word: 'apple', meaning: '사과' }]);
    const session: DictationSessionState = {
      datasetId: dataset.id,
      currentIndex: 99,
      running: true,
      gameMode: true,
    };
    const result = ensureDictationSession(session, dataset);
    expect(result.nextState.currentIndex).toBe(0);
    expect(result.nextState.running).toBe(false);
  });

  it('getCurrentDictationItem returns null for null dataset or non-record item', () => {
    expect(getCurrentDictationItem(null, createIdleDictationSession())).toBeNull();

    const dataset = makeDataset(['not-an-object' as unknown as Record<string, unknown>]);
    const session: DictationSessionState = {
      datasetId: dataset.id,
      currentIndex: 0,
      running: true,
      gameMode: true,
    };
    expect(getCurrentDictationItem(dataset, session)).toBeNull();
  });
});
