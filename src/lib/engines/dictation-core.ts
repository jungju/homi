import type { DataSetV1 } from '../homi';

export type DictationWriteMode = 'korean' | 'english';

export interface DictationSpeechPayload {
  text: string;
  lang: string;
}

export interface DictationMessage {
  text: string;
  type: 'ok' | 'error';
}

export interface DictationSessionState {
  datasetId: string | null;
  currentIndex: number;
  running: boolean;
  gameMode: boolean;
}

export interface DictationTransition {
  nextState: DictationSessionState;
  navigateHome?: boolean;
  restartTimer?: boolean;
  stopTimer?: boolean;
  speakPayload?: DictationSpeechPayload;
  message?: DictationMessage;
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

export function createIdleDictationSession(): DictationSessionState {
  return {
    datasetId: null,
    currentIndex: 0,
    running: false,
    gameMode: false,
  };
}

export function getSelectedDictationDataset(
  datasets: DataSetV1[],
  session: DictationSessionState,
): DataSetV1 | null {
  if (!session.datasetId) {
    return null;
  }
  return datasets.find((dataset) => dataset.id === session.datasetId) ?? null;
}

export function getDictationSpeechPayload(
  item: Record<string, unknown>,
  dictationMode: DictationWriteMode,
): DictationSpeechPayload | null {
  if (dictationMode === 'korean') {
    const englishWord = asString(item.word);
    return englishWord
      ? {
          text: englishWord,
          lang: 'en-US',
        }
      : null;
  }

  const koreanText = asString(item.meaning);
  if (koreanText) {
    return {
      text: koreanText,
      lang: 'ko-KR',
    };
  }

  const fallbackWord = asString(item.word);
  return fallbackWord
    ? {
        text: fallbackWord,
        lang: 'ko-KR',
      }
    : null;
}

export function getDictationDisplayText(
  item: Record<string, unknown>,
  dictationMode: DictationWriteMode,
) {
  const word = asString(item.word) ?? '';
  const meaning = asString(item.meaning) ?? '';
  return dictationMode === 'korean' ? word : meaning || word;
}

export function getCurrentDictationItem(
  dataset: DataSetV1 | null,
  session: DictationSessionState,
): Record<string, unknown> | null {
  if (!dataset) {
    return null;
  }
  const item = dataset.items[session.currentIndex];
  return isPlainRecord(item) ? item : null;
}

function getStopState(session: DictationSessionState): DictationSessionState {
  return {
    ...session,
    running: false,
    gameMode: false,
  };
}

function getFinishTransition(session: DictationSessionState): DictationTransition {
  return {
    nextState: getStopState(session),
    stopTimer: true,
    message: {
      text: '마지막 항목까지 진행했습니다.',
      type: 'ok',
    },
  };
}

function getPlayableTransition(
  session: DictationSessionState,
  dataset: DataSetV1,
  dictationMode: DictationWriteMode,
  auto: boolean,
): DictationTransition {
  if (dataset.items.length === 0 || session.currentIndex >= dataset.items.length) {
    return getFinishTransition(session);
  }

  let currentIndex = session.currentIndex;
  while (currentIndex < dataset.items.length) {
    const raw = dataset.items[currentIndex];
    if (!isPlainRecord(raw)) {
      if (!auto) {
        return {
          nextState: {
            ...session,
            currentIndex,
            datasetId: dataset.id,
          },
          message: {
            text: '현재 항목 형식이 유효하지 않습니다.',
            type: 'error',
          },
        };
      }
      currentIndex += 1;
      continue;
    }

    const payload = getDictationSpeechPayload(raw, dictationMode);
    if (!payload) {
      if (!auto) {
        return {
          nextState: {
            ...session,
            currentIndex,
            datasetId: dataset.id,
          },
          message: {
            text: '현재 항목에 발화할 텍스트가 없습니다.',
            type: 'error',
          },
        };
      }
      currentIndex += 1;
      continue;
    }

    return {
      nextState: {
        datasetId: dataset.id,
        currentIndex,
        running: true,
        gameMode: true,
      },
      speakPayload: payload,
    };
  }

  return getFinishTransition(session);
}

export function selectDictationDataset(
  session: DictationSessionState,
  dataset: DataSetV1,
): DictationTransition {
  if (dataset.engineId !== 'dictation') {
    return { nextState: session };
  }

  return {
    nextState: {
      datasetId: dataset.id,
      currentIndex: 0,
      running: false,
      gameMode: false,
    },
    stopTimer: session.running,
  };
}

export function stopDictationSession(session: DictationSessionState): DictationTransition {
  return {
    nextState: getStopState(session),
    stopTimer: true,
  };
}

export function startDictationSession(
  session: DictationSessionState,
  dataset: DataSetV1 | null,
  dictationMode: DictationWriteMode,
): DictationTransition {
  if (!dataset) {
    return {
      nextState: getStopState(session),
      stopTimer: true,
      message: {
        text: '받아쓰기 데이터를 먼저 선택해주세요.',
        type: 'error',
      },
    };
  }

  if (dataset.items.length === 0) {
    return {
      nextState: {
        ...getStopState(session),
        datasetId: dataset.id,
      },
      stopTimer: true,
      message: {
        text: '선택한 데이터셋이 비어 있습니다.',
        type: 'error',
      },
    };
  }

  const transition = getPlayableTransition(
    {
      datasetId: dataset.id,
      currentIndex: 0,
      running: true,
      gameMode: true,
    },
    dataset,
    dictationMode,
    false,
  );

  if (!transition.speakPayload) {
    return {
      ...transition,
      stopTimer: true,
    };
  }

  return {
    ...transition,
    navigateHome: true,
    restartTimer: true,
    message: {
      text: `"${dataset.title}" 받아쓰기 시작`,
      type: 'ok',
    },
  };
}

export function advanceDictationSession(
  session: DictationSessionState,
  dataset: DataSetV1 | null,
  dictationMode: DictationWriteMode,
  options: { auto: boolean },
): DictationTransition {
  if (!dataset) {
    return {
      nextState: getStopState(session),
      stopTimer: true,
    };
  }

  if (session.currentIndex + 1 >= dataset.items.length) {
    return getFinishTransition(session);
  }

  const transition = getPlayableTransition(
    {
      ...session,
      currentIndex: session.currentIndex + 1,
      datasetId: dataset.id,
      running: true,
      gameMode: true,
    },
    dataset,
    dictationMode,
    options.auto,
  );

  if (!options.auto && transition.speakPayload) {
    transition.restartTimer = true;
  }
  if (!transition.nextState.running) {
    transition.stopTimer = true;
  }
  return transition;
}

export function ensureDictationSession(
  session: DictationSessionState,
  dataset: DataSetV1 | null,
): DictationTransition {
  if (!dataset) {
    return {
      nextState: getStopState({
        ...session,
        datasetId: null,
        currentIndex: 0,
      }),
      stopTimer: true,
    };
  }

  if (session.currentIndex >= dataset.items.length) {
    return {
      nextState: getStopState({
        ...session,
        datasetId: dataset.id,
        currentIndex: Math.max(0, dataset.items.length - 1),
      }),
      stopTimer: true,
    };
  }

  return {
    nextState: {
      ...session,
      datasetId: dataset.id,
    },
  };
}
