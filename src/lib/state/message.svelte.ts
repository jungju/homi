import type { TimerHandle } from '../runtime';

export interface Message {
  text: string;
  type: 'ok' | 'error';
}

let _message = $state<Message | null>(null);
let _timer: TimerHandle | null = null;

export function getMessage(): Message | null {
  return _message;
}

export function setMessage(text: string, type: Message['type'], clock?: { setTimeout: (cb: () => void, ms: number) => TimerHandle; clearTimeout: (h: TimerHandle) => void }) {
  _message = { text, type };
  if (clock) {
    if (_timer !== null) {
      clock.clearTimeout(_timer);
    }
    _timer = clock.setTimeout(() => {
      _message = null;
      _timer = null;
    }, 3500);
  }
}

export function clearMessage() {
  _message = null;
}
