import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildScheduleSpeechPayload } from '../../src/lib/engines/schedule-core';
import { parseBundleText } from '../../src/lib/homi';
import { createMemoryStorage, playSpeechOrAudio } from '../../src/lib/runtime';

function makeSpeechAdapter(supported: boolean) {
  const spoken: Array<{ text: string; lang?: string }> = [];
  return {
    adapter: {
      isSupported() { return supported; },
      isBusy() { return false; },
      speak(request: { text: string; lang?: string }) {
        spoken.push(request);
        return supported;
      },
      cancel() {},
    },
    spoken,
  };
}

describe('runtime effects', () => {
  it('falls back to speech when audio playback fails', async () => {
    const parsed = parseBundleText(readFileSync(resolve('tests/fixtures/bundle.audio-fallback.v1.json'), 'utf8'));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const scheduleDataset = parsed.datasets[0]!;
    const payload = buildScheduleSpeechPayload(
      scheduleDataset.title,
      scheduleDataset.items[0] as Record<string, unknown>,
    );
    const { adapter: speech, spoken } = makeSpeechAdapter(true);

    const mode = await playSpeechOrAudio(
      {
        audio: { async play() { return false; } },
        speech,
      },
      { text: payload.title, audioUrl: payload.audioUrl, lang: 'ko-KR' },
    );

    expect(mode).toBe('speech');
    expect(spoken).toEqual([{ text: '오디오 파일 알림', lang: 'ko-KR' }]);
  });

  it('returns audio when audio playback succeeds', async () => {
    const mode = await playSpeechOrAudio(
      {
        audio: { async play() { return true; } },
        speech: makeSpeechAdapter(true).adapter,
      },
      { text: 'hello', audioUrl: 'https://example.com/a.mp3', lang: 'ko-KR' },
    );
    expect(mode).toBe('audio');
  });

  it('returns unavailable when audio fails and speech is unsupported', async () => {
    const mode = await playSpeechOrAudio(
      {
        audio: { async play() { return false; } },
        speech: makeSpeechAdapter(false).adapter,
      },
      { text: 'hello', audioUrl: 'https://example.com/a.mp3' },
    );
    expect(mode).toBe('unavailable');
  });

  it('skips audio and goes to speech when no audioUrl is provided', async () => {
    const { adapter: speech, spoken } = makeSpeechAdapter(true);
    const mode = await playSpeechOrAudio(
      {
        audio: { async play() { return true; } },
        speech,
      },
      { text: 'direct speech', lang: 'en-US' },
    );
    expect(mode).toBe('speech');
    expect(spoken).toEqual([{ text: 'direct speech', lang: 'en-US' }]);
  });
});

describe('createMemoryStorage', () => {
  it('supports getItem, setItem, removeItem, clear, and snapshot', () => {
    const storage = createMemoryStorage({ key1: 'val1' });

    expect(storage.getItem('key1')).toBe('val1');
    expect(storage.getItem('missing')).toBeNull();

    storage.setItem('key2', 'val2');
    expect(storage.getItem('key2')).toBe('val2');
    expect(storage.snapshot()).toEqual({ key1: 'val1', key2: 'val2' });

    storage.removeItem!('key1');
    expect(storage.getItem('key1')).toBeNull();

    storage.clear!();
    expect(storage.snapshot()).toEqual({});
  });
});
