import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, type Page } from '@playwright/test';

import { captureUIArtifacts } from './capture-ui-artifacts';

export async function resetLocalData(page: Page) {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

export async function selectBackupTab(
  page: Page,
  label: 'URL 가져오기' | '텍스트로 가져오기' | '파일로 가져오기' | '샘플 가져오기',
) {
  const tab = page.getByRole('tab', { name: label });
  await expect(tab).toBeVisible();
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

export async function openBackupAndImportSample(page: Page) {
  await page.goto('/brain');
  await selectBackupTab(page, '샘플 가져오기');
  await page.getByRole('button', { name: '기본 샘플 뇌 가져오기' }).click();
  await expect(page.getByRole('button', { name: '가져오기 확정' })).toBeVisible({ timeout: 8_000 });
  await page.getByRole('button', { name: '가져오기 확정' }).click();
  await expect(page.getByText(/기존 자료를 교체하고 총/)).toBeVisible();
}

export async function openBackupAndPreviewText(page: Page, bundleText: string) {
  await page.goto('/brain');
  await selectBackupTab(page, '텍스트로 가져오기');
  await page.getByTestId('backup-json-textarea').fill(bundleText);
  await page.getByTestId('backup-text-preview-btn').click();
  await expect(page.getByTestId('backup-preview')).toBeVisible({ timeout: 8_000 });
}

export async function openBackupAndPreviewFixture(page: Page, fixturePath: string) {
  const bundleText = readFileSync(resolve(fixturePath), 'utf8');
  await openBackupAndPreviewText(page, bundleText);
}

export function buildSharedImportPath(bundleText: string) {
  const encoded = Buffer.from(bundleText, 'utf8').toString('base64url');
  return `/brain?import=${encoded}`;
}

export function buildBundleText(datasets: unknown[], bundleId = 'bundle_sync') {
  return JSON.stringify(
    {
      format: 'homi',
      version: 1,
      bundleType: 'import',
      bundleId,
      datasets,
    },
    null,
    2,
  );
}

export async function openBackupAndImportFixture(page: Page, fixturePath: string) {
  await openBackupAndPreviewFixture(page, fixturePath);
  await page.getByTestId('backup-confirm').click();
  await expect(page.getByText(/기존 자료를 교체하고 총/)).toBeVisible();
}

export async function installSpeechSynthesisMock(page: Page) {
  await page.addInitScript(() => {
    const synth =
      window.speechSynthesis ??
      ({
        speaking: false,
        pending: false,
        cancel() {},
        getVoices() {
          return [];
        },
      } as SpeechSynthesis & { pending: boolean });

    let speakCount = 0;
    let lastText = '';
    synth.speak = (utter: SpeechSynthesisUtterance) => {
      speakCount += 1;
      lastText = utter.text;
    };
    synth.speaking = false;

    Object.defineProperty(window, '__homiSpeechCount', {
      configurable: true,
      get() {
        return speakCount;
      },
    });
    Object.defineProperty(window, '__homiLastSpeechText', {
      configurable: true,
      get() {
        return lastText;
      },
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: synth,
    });
  });
}

export async function installAudioPlayMock(page: Page) {
  await page.addInitScript(() => {
    let playCount = 0;
    let chimeCount = 0;
    let lastSrc = '';

    Object.defineProperty(window, '__homiAudioPlayCount', {
      configurable: true,
      get() {
        return playCount;
      },
    });
    Object.defineProperty(window, '__homiChimePlayCount', {
      configurable: true,
      get() {
        return chimeCount;
      },
    });
    Object.defineProperty(window, '__homiLastAudioSrc', {
      configurable: true,
      get() {
        return lastSrc;
      },
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: function play() {
        playCount += 1;
        lastSrc = this.currentSrc || this.getAttribute('src') || this.src || '';
        if (lastSrc.includes('/sounds/chime.mp3')) {
          chimeCount += 1;
        }
        return Promise.resolve();
      },
    });
  });
}

export async function installMockClock(page: Page, initialIso: string) {
  await page.addInitScript((seedIso) => {
    const RealDate = Date;
    let currentTime = RealDate.parse(seedIso);

    class MockDate extends RealDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        if (args.length === 0) {
          super(currentTime);
          return;
        }
        super(...args);
      }

      static now() {
        return currentTime;
      }
    }

    Object.defineProperty(window, 'Date', {
      configurable: true,
      writable: true,
      value: MockDate,
    });

    Object.defineProperty(window, '__setHomiMockNow', {
      configurable: true,
      value: (nextIso: string) => {
        currentTime = RealDate.parse(nextIso);
      },
    });
  }, initialIso);
}

export async function setMockClock(page: Page, nextIso: string) {
  await page.evaluate((iso) => {
    (window as Window & { __setHomiMockNow?: (value: string) => void }).__setHomiMockNow?.(iso);
  }, nextIso);
}

export async function captureState(
  page: Page,
  screenId: string,
  state: string,
  deterministicAssertions: string[] = [],
) {
  await captureUIArtifacts(page, {
    screenId,
    state,
    route: page.url(),
    outputDir: 'test-results/ai-artifacts',
    deterministicAssertions,
  });
}
