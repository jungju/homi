export type TimerHandle = ReturnType<typeof setTimeout>;

export interface ClockAdapter {
  now(): number;
  parse(value: string): number;
  date(value?: number | string | Date): Date;
  toISOString(value?: number | string | Date): string;
  setTimeout(callback: () => void, delayMs: number): TimerHandle;
  clearTimeout(handle: TimerHandle): void;
  setInterval(callback: () => void, delayMs: number): TimerHandle;
  clearInterval(handle: TimerHandle): void;
}

export interface SpeechRequest {
  text: string;
  lang?: string;
}

export interface SpeechAdapter {
  isSupported(): boolean;
  isBusy(): boolean;
  speak(request: SpeechRequest): boolean;
  cancel(): void;
}

export interface AudioAdapter {
  play(url: string): Promise<boolean>;
}

export type NotificationPermissionState = NotificationPermission | 'unsupported';

export interface NotificationAdapter {
  permission(): NotificationPermissionState;
  notify(title: string, options?: NotificationOptions): boolean;
}

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
  clear?(): void;
}

export type FetchAdapter = typeof fetch;

export interface HomiRuntime {
  clock: ClockAdapter;
  speech: SpeechAdapter;
  audio: AudioAdapter;
  notifications: NotificationAdapter;
  storage: StorageAdapter;
  fetch: FetchAdapter;
}

function createNoopStorage(): StorageAdapter {
  return {
    getItem() {
      return null;
    },
    setItem() {},
    removeItem() {},
    clear() {},
  };
}

export function createMemoryStorage(
  initial: Record<string, string> = {},
): StorageAdapter & { snapshot(): Record<string, string> } {
  const state = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return state.get(key) ?? null;
    },
    setItem(key, value) {
      state.set(key, value);
    },
    removeItem(key) {
      state.delete(key);
    },
    clear() {
      state.clear();
    },
    snapshot() {
      return Object.fromEntries(state.entries());
    },
  };
}

export function createBrowserRuntime(): HomiRuntime {
  const storage =
    typeof localStorage === 'undefined'
      ? createNoopStorage()
      : {
          getItem(key: string) {
            return localStorage.getItem(key);
          },
          setItem(key: string, value: string) {
            localStorage.setItem(key, value);
          },
          removeItem(key: string) {
            localStorage.removeItem(key);
          },
          clear() {
            localStorage.clear();
          },
        };

  return {
    clock: {
      now() {
        return Date.now();
      },
      parse(value) {
        return Date.parse(value);
      },
      date(value) {
        return value === undefined ? new Date() : new Date(value);
      },
      toISOString(value) {
        return value === undefined ? new Date().toISOString() : new Date(value).toISOString();
      },
      setTimeout(callback, delayMs) {
        return globalThis.setTimeout(callback, delayMs);
      },
      clearTimeout(handle) {
        globalThis.clearTimeout(handle);
      },
      setInterval(callback, delayMs) {
        return globalThis.setInterval(callback, delayMs);
      },
      clearInterval(handle) {
        globalThis.clearInterval(handle);
      },
    },
    speech: {
      isSupported() {
        return (
          typeof window !== 'undefined' &&
          typeof SpeechSynthesisUtterance !== 'undefined' &&
          !!window.speechSynthesis
        );
      },
      isBusy() {
        return !!window.speechSynthesis && !!(window.speechSynthesis.speaking || window.speechSynthesis.pending);
      },
      speak(request) {
        if (
          typeof window === 'undefined' ||
          typeof SpeechSynthesisUtterance === 'undefined' ||
          !window.speechSynthesis
        ) {
          return false;
        }

        const utter = new SpeechSynthesisUtterance(request.text);
        utter.lang = request.lang ?? 'ko-KR';
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
        window.speechSynthesis.speak(utter);
        return true;
      },
      cancel() {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      },
    },
    audio: {
      async play(url) {
        if (typeof Audio === 'undefined') {
          return false;
        }
        try {
          const audio = new Audio(url);
          await audio.play();
          return true;
        } catch {
          return false;
        }
      },
    },
    notifications: {
      permission() {
        if (typeof Notification === 'undefined') {
          return 'unsupported';
        }
        return Notification.permission;
      },
      notify(title, options) {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
          return false;
        }
        new Notification(title, options);
        return true;
      },
    },
    storage,
    fetch: (...args) => fetch(...args),
  };
}

export async function playSpeechOrAudio(
  runtime: Pick<HomiRuntime, 'audio' | 'speech'>,
  payload: { text: string; audioUrl?: string; lang?: string },
): Promise<'audio' | 'speech' | 'unavailable'> {
  if (payload.audioUrl) {
    const played = await runtime.audio.play(payload.audioUrl);
    if (played) {
      return 'audio';
    }
  }

  return runtime.speech.speak({ text: payload.text, lang: payload.lang }) ? 'speech' : 'unavailable';
}
