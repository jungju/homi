import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { captureUIArtifacts, type CaptureUIArtifactResult } from '../helpers/capture-ui-artifacts';

type CapturedScreen = {
  screenId: string;
  state: string;
  route: string;
  artifacts: CaptureUIArtifactResult['artifacts'];
};

const outputDir = process.env.HOMI_UI_HISTORY_DIR ?? path.resolve('artifacts', 'ui-history', 'manual');
const capturedScreens: CapturedScreen[] = [];

async function resetLocalData(page: Page) {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

async function selectBackupTab(
  page: Page,
  label: 'URL 가져오기' | '텍스트로 가져오기' | '파일로 가져오기' | '샘플 가져오기',
) {
  const tab = page.getByRole('tab', { name: label });
  await expect(tab).toBeVisible();
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

async function openBackupAndPreviewFixture(page: Page, fixturePath: string) {
  const bundleText = readFileSync(resolve(fixturePath), 'utf8');
  await page.goto('/brain');
  await selectBackupTab(page, '텍스트로 가져오기');
  await page.getByTestId('backup-json-textarea').fill(bundleText);
  await page.getByTestId('backup-text-preview-btn').click();
  await expect(page.getByTestId('backup-preview')).toBeVisible({ timeout: 8_000 });
}

async function openBackupAndImportFixture(page: Page, fixturePath: string) {
  await openBackupAndPreviewFixture(page, fixturePath);
  await page.getByTestId('backup-confirm').click();
  await expect(page.getByText(/기존 자료를 교체하고 총/)).toBeVisible();
}

async function selectFirstDictationDataset(page: Page) {
  const selectButton = page.getByTestId('dataset-open').first();
  await expect(selectButton).toBeVisible();
  const startButton = page.getByTestId('dictation-start');
  await expect(startButton).toBeDisabled();
  await selectButton.click();
  await expect(startButton).toBeEnabled();
}

async function captureScreen(page: Page, screenId: string, state: string) {
  const result = await captureUIArtifacts(page, {
    screenId,
    state,
    route: page.url(),
    outputDir,
  });

  capturedScreens.push({
    screenId,
    state,
    route: page.url(),
    artifacts: result.artifacts,
  });
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  mkdirSync(outputDir, { recursive: true });
});

test.afterAll(() => {
  writeFileSync(
    path.join(outputDir, 'session.json'),
    JSON.stringify(
      {
        version: process.env.HOMI_UI_HISTORY_VERSION ?? 'v1',
        createdAt: process.env.HOMI_UI_HISTORY_CREATED_AT ?? new Date().toISOString(),
        commit: process.env.HOMI_UI_HISTORY_COMMIT ?? 'unknown',
        screenCount: capturedScreens.length,
        screens: capturedScreens,
      },
      null,
      2,
    ),
    'utf8',
  );
});

test('captures all major v1 UI states into a versioned history folder', async ({ page }) => {
  await page.addInitScript(() => {
    const NotificationMock = class NotificationMock {
      static permission = 'granted';
    };

    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: NotificationMock,
    });
  });

  await resetLocalData(page);

  await page.goto('/');
  await expect(page.getByTestId('home-root')).toBeVisible();
  await captureScreen(page, 'home.idle.empty', '기본 홈 빈 상태');

  await page.goto('/brain');
  await expect(page.getByTestId('overlay-root')).toHaveAttribute('data-overlay-kind', 'backup');
  await captureScreen(page, 'backup.tab.url', '브레인 설정 URL 탭');

  await selectBackupTab(page, '텍스트로 가져오기');
  await captureScreen(page, 'backup.tab.text', '브레인 설정 텍스트 탭');

  await selectBackupTab(page, '파일로 가져오기');
  await captureScreen(page, 'backup.tab.file', '브레인 설정 파일 탭');

  await selectBackupTab(page, '샘플 가져오기');
  await captureScreen(page, 'backup.tab.sample', '브레인 설정 샘플 탭');

  await page.getByTestId('backup-sample-load-btn').click();
  await expect(page.getByTestId('backup-preview')).toBeVisible({ timeout: 8_000 });
  await captureScreen(page, 'backup.preview.sample', '브레인 설정 샘플 미리보기');

  await page.getByTestId('backup-confirm').click();
  await expect(page.getByText(/기존 자료를 교체하고 총/)).toBeVisible();
  await captureScreen(page, 'backup.confirmed.replace', '브레인 설정 가져오기 확정');

  await page.goto('/');
  await expect(page.getByTestId('home-root')).toBeVisible();
  await captureScreen(page, 'home.idle.populated', '기본 홈 데이터 있음');

  await page.goto('/engines/schedule');
  await expect(page.getByTestId('overlay-root')).toHaveAttribute('data-engine-id', 'schedule');
  await expect(page.getByTestId('schedule-enabled-toggle').first()).toBeVisible();
  await captureScreen(page, 'engine.schedule.overlay', '스케줄 오버레이');

  await page.goto('/engines/dictation');
  await expect(page.getByTestId('overlay-root')).toHaveAttribute('data-engine-id', 'dictation');
  await selectFirstDictationDataset(page);
  await captureScreen(page, 'engine.dictation.overlay', '받아쓰기 오버레이');

  await page.getByTestId('dictation-start').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('dictation-root')).toBeVisible();
  await captureScreen(page, 'home.dictation.running', '받아쓰기 실행 화면');

  await resetLocalData(page);
  await openBackupAndImportFixture(page, 'tests/fixtures/bundle.min.v1.json');
  await page.goto('/');
  await expect(page.getByTestId('home-status-text')).toHaveText('Ping', { timeout: 10_000 });
  await captureScreen(page, 'home.alert.schedule', '기본 홈 알림 표시');
});
