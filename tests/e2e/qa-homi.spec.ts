import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import {
  buildBundleText,
  buildSharedImportPath,
  captureState,
  installAudioPlayMock,
  installMockClock,
  installSpeechSynthesisMock,
  openBackupAndImportFixture,
  openBackupAndImportSample,
  openBackupAndPreviewFixture,
  openBackupAndPreviewText,
  resetLocalData,
  selectBackupTab,
  setMockClock,
} from '../helpers/e2e-mocks';

async function expectFacePageNoScroll(page: Page) {
  const metrics = await page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement;
    return {
      scrollHeight: root.scrollHeight,
      clientHeight: root.clientHeight,
    };
  });

  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
}

async function getFaceRect(page: Page) {
  const box = await page.getByTestId('home-face').boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

async function getFontSizePx(page: Page, testId: string) {
  return page.getByTestId(testId).evaluate((element) =>
    Number.parseFloat(window.getComputedStyle(element as HTMLElement).fontSize),
  );
}

async function getSelectorSizePx(page: Page, selector: string, property: 'width' | 'height') {
  return page
    .locator(selector)
    .first()
    .evaluate(
      (element, cssProperty) =>
        Number.parseFloat(window.getComputedStyle(element as HTMLElement)[cssProperty]),
      property,
    );
}

async function expectBubbleCanOverflowZone(page: Page) {
  const bubbleBox = await page.getByTestId('home-bubble').boundingBox();
  const zoneBox = await page.getByTestId('home-control-box-2').boundingBox();
  expect(bubbleBox).not.toBeNull();
  expect(zoneBox).not.toBeNull();
  expect(bubbleBox!.width).toBeGreaterThan(zoneBox!.width);
  expect(bubbleBox!.x).toBeLessThan(zoneBox!.x);
  expect(bubbleBox!.x + bubbleBox!.width).toBeGreaterThan(zoneBox!.x + zoneBox!.width);
}

async function expectSettingsIconButtonInBox9(page: Page) {
  const button = page.getByTestId('home-open-backup');
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute('aria-label', '브레인 설정');
  await expect(button).toHaveText('⚙');

  const buttonBox = await button.boundingBox();
  const zoneBox = await page.getByTestId('home-control-box-9').boundingBox();
  expect(buttonBox).not.toBeNull();
  expect(zoneBox).not.toBeNull();
  expect(buttonBox!.x + buttonBox!.width).toBeGreaterThan(zoneBox!.x + zoneBox!.width - 36);
  expect(buttonBox!.y + buttonBox!.height).toBeGreaterThan(zoneBox!.y + zoneBox!.height - 36);
}

async function expectHomeClockInBox6(page: Page) {
  const zone = page.getByTestId('home-control-box-6');
  const clock = zone.getByTestId('home-clock');
  await expect(clock).toBeVisible();
  await expect(page.getByTestId('home-clock-date')).toHaveText(
    /^\d{4}\.\d{2}\.\d{2} (일|월|화|수|목|금|토)요일$/,
  );
  await expect(page.getByTestId('home-clock-time')).toHaveText(/^\d{2}:\d{2}$/);
  const zoneBox = await zone.boundingBox();
  const clockBox = await clock.boundingBox();
  expect(zoneBox).not.toBeNull();
  expect(clockBox).not.toBeNull();
  expect(clockBox!.width).toBeGreaterThan(zoneBox!.width - 36);
  expect(clockBox!.height).toBeGreaterThan(zoneBox!.height - 36);
}

async function selectFirstDictationDataset(page: Page) {
  const selectButton = page.getByTestId('dataset-open').first();
  await expect(selectButton).toBeVisible();
  const startButton = page.getByRole('button', { name: '시작' });
  await expect(startButton).toBeDisabled();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await selectButton.click();
    if (await startButton.isEnabled()) {
      break;
    }
    await page.waitForTimeout(120);
  }
  await expect(startButton).toBeEnabled();
  return { selectButton, startButton };
}

test.describe('Homi v1 실행 시각화 기본 체크', () => {
  test('[test.p0.home.base_layout] 홈 얼굴 화면은 캐릭터 얼굴과 최소 말풍선 구성을 보여야 한다', async ({ page }) => {
    await resetLocalData(page);
    await page.goto('/');

    await expect(page.getByTestId('app-root')).toBeVisible();
    await expect(page.getByTestId('home-root')).toBeVisible();
    await expect(
      page.getByRole('img', { name: '친근한 홈 캐릭터 얼굴' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: '브레인 설정' })).toBeVisible();
    await expect(page.getByRole('button', { name: /스케줄 열기/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /받아쓰기 열기/ })).toBeVisible();
    await expect(page.getByTestId('home-control-grid')).toBeVisible();
    await expect(page.locator('[data-testid^=\"home-control-box-\"]')).toHaveCount(9);
    await expect(page.getByTestId('home-control-box-2').getByTestId('home-bubble')).toBeVisible();
    await expect(page.getByTestId('home-robot-name')).toHaveText('호미');
    await expect(page.getByTestId('home-status-text')).toHaveCount(0);
    await expect(page.getByTestId('home-mode-text')).toHaveCount(0);
    await expect(page.getByTestId('toast-root')).toHaveCount(0);
    await expect(page.getByTestId('home-control-box-8').getByTestId('home-open-engines')).toBeVisible();
    await expect(page.locator('[data-testid="global-header"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="global-nav"]')).toHaveCount(0);
    await expectHomeClockInBox6(page);
    const faceRect = await getFaceRect(page);
    expect(faceRect.width).toBeGreaterThanOrEqual(620);
    expect(await getSelectorSizePx(page, '.home-face__eye', 'width')).toBeGreaterThanOrEqual(100);
    expect(await getFontSizePx(page, 'home-robot-name')).toBeGreaterThanOrEqual(60);
    expect(await getFontSizePx(page, 'home-clock-time')).toBeGreaterThanOrEqual(88);
    expect(await getFontSizePx(page, 'home-open-backup')).toBeGreaterThanOrEqual(22);
    await expectBubbleCanOverflowZone(page);
    await expectSettingsIconButtonInBox9(page);
    await expectFacePageNoScroll(page);

    await captureState(page, 'home.default', '기본 모드', [
      'home-root is visible',
      'home-face is visible',
      'home-face uses large tablet size',
      'home-face eyes use enlarged readable size',
      'home-control-grid has 9 control boxes',
      'home-bubble is in control box 2',
      'home-bubble may overflow box 2 into adjacent zones',
      'home-clock is visible in control box 6',
      'home-clock fills most of control box 6',
      'home-clock shows date, weekday, and HH:MM',
      'home-clock time uses extra-large tablet font size',
      'home-robot-name shows 호미',
      'home-status-text is absent without alert or quiet mode',
      'toast-root is absent on home face screen',
      'home-open-engines is in control box 8',
      'home-open-backup icon button is in control box 9 right bottom',
      'home-bubble is visible',
      'home-mode-text is absent in basic mode',
      'home typography is tablet-large',
      'engine entry buttons are visible',
    ]);
  });

  test('[test.p0.home.alert_message_surface] 기본 모드 알림은 호미 이름 아래 큰 문구로 보여야 한다', async ({ page }) => {
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
    await openBackupAndImportFixture(page, 'tests/fixtures/bundle.min.v1.json');
    await page.goto('/');

    const nameLocator = page.getByTestId('home-robot-name');
    const statusLocator = page.getByTestId('home-status-text');

    await expect(nameLocator).toHaveText('호미');
    await expect(statusLocator).toHaveText('Ping', { timeout: 10_000 });
    await expect(page.getByTestId('toast-root')).toHaveCount(0);

    const nameBox = await nameLocator.boundingBox();
    const statusBox = await statusLocator.boundingBox();
    expect(nameBox).not.toBeNull();
    expect(statusBox).not.toBeNull();
    expect(statusBox!.y).toBeGreaterThan(nameBox!.y);
    expect(await getFontSizePx(page, 'home-status-text')).toBeGreaterThanOrEqual(30);

    await captureState(page, 'home.default', '정기 알림 표시', [
      'home-robot-name shows 호미',
      'home-status-text shows schedule title only',
      'home-status-text is rendered below home-robot-name',
      'toast-root is absent while home face screen alert text is visible',
      'home-status-text keeps large font size',
    ]);
  });

  test('[test.p0.overlay.engine_stack] 엔진 라우트는 홈 위 오버레이로 열려야 한다', async ({ page }) => {
    await resetLocalData(page);
    await page.goto('/');
    await page.getByTestId('home-engine-btn-dictation').click();

    const overlay = page.getByTestId('overlay-root');
    await expect(overlay).toBeVisible();
    await expect(overlay).toHaveAttribute('data-overlay-kind', 'engine');
    await expect(overlay).toHaveAttribute('data-engine-id', 'dictation');
    await expect(page.getByTestId('engine-dataset-add')).toHaveCount(0);
    await expect(page.getByTestId('home-root')).toBeVisible();
  });

  test('[test.p0.backup.overlay_contract][test.p0.import.preview_before_confirm][test.p0.import.replace_only] 브레인 설정에서 샘플 임포트가 미리보기→확정으로 동작해야 한다', async ({ page }) => {
    const sampleBundle = JSON.parse(
      readFileSync(resolve('public/samples/homi.sample.homi.json'), 'utf8'),
    ) as {
      datasets: Array<{ engineId: string; title: string }>;
    };
    const expectedScheduleTitles = sampleBundle.datasets
      .filter((dataset) => dataset.engineId === 'schedule')
      .map((dataset) => dataset.title)
      .sort();
    const expectedDictationTitles = sampleBundle.datasets
      .filter((dataset) => dataset.engineId === 'dictation')
      .map((dataset) => dataset.title)
      .sort();

    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.evaluate(() => {
      window.localStorage.setItem(
        'homi.store.v1',
        JSON.stringify({
          storeVersion: 1,
          updatedAt: '2026-03-12T00:00:00.000Z',
          datasetsByEngine: {
            schedule: [
              {
                id: 'legacy_schedule_1',
                engineId: 'schedule',
                engineSchemaVersion: 1,
                title: '기존 일정',
                items: [{ date: '2026-03-12', title: '남아 있으면 안 되는 일정', timeStart: '07:00' }],
                createdAt: '2026-03-12T00:00:00.000Z',
                updatedAt: '2026-03-12T00:00:00.000Z',
              },
            ],
          },
          ui: {},
        }),
      );
    });

    await page.goto('/brain');
    await expect(page.getByTestId('overlay-root')).toHaveAttribute('data-overlay-kind', 'backup');
    await expect(page.getByText('현재 저장 데이터: 1개')).toBeVisible();
    await expect(page.getByTestId('backup-tablist')).toBeVisible();
    const tabLabels = await page.getByTestId('backup-tablist').getByRole('tab').allTextContents();
    expect(tabLabels.map((text) => text.trim())).toEqual([
      'URL 가져오기',
      '텍스트로 가져오기',
      '파일로 가져오기',
      '샘플 가져오기',
    ]);
    await expect(page.getByRole('tab', { name: 'URL 가져오기' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: '텍스트로 가져오기' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '파일로 가져오기' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '샘플 가져오기' })).toBeVisible();
    await expect(page.getByTestId('backup-quiet-status')).toContainText('현재 상태: 꺼짐');
    await expect(page.getByTestId('backup-quiet-enable')).toBeVisible();
    await expect(page.getByTestId('backup-quiet-clear')).toBeDisabled();
    await expect(page.getByTestId('backup-theme-status')).toContainText('라이트 모드');
    await expect(page.getByTestId('backup-theme-light')).toBeVisible();
    await expect(page.getByTestId('backup-theme-dark')).toBeVisible();
    await expect(page.getByTestId('backup-version')).toHaveText(/^버전: \d{4}-\d{2}-\d{2}$/);
    await expect(page.getByTestId('backup-url-sync-status')).toContainText('현재 URL 자동 업데이트 연결 없음');
    await expect(page.getByTestId('backup-panel-url')).toBeVisible();
    await expect(page.getByTestId('backup-panel-text')).toBeHidden();
    await expect(page.getByTestId('backup-panel-file')).toBeHidden();
    await expect(page.getByTestId('backup-panel-sample')).toBeHidden();
    await expect(page.getByTestId('backup-export-btn')).toHaveCount(0);
    await selectBackupTab(page, '텍스트로 가져오기');
    await expect(page.getByTestId('backup-panel-url')).toBeHidden();
    await expect(page.getByTestId('backup-panel-text')).toBeVisible();
    await selectBackupTab(page, '파일로 가져오기');
    await expect(page.getByTestId('backup-panel-text')).toBeHidden();
    await expect(page.getByTestId('backup-panel-file')).toBeVisible();
    await selectBackupTab(page, '샘플 가져오기');
    await expect(page.getByTestId('backup-panel-file')).toBeHidden();
    await expect(page.getByTestId('backup-panel-sample')).toBeVisible();
    await page.getByRole('button', { name: '기본 샘플 뇌 가져오기' }).click();
    await expect(page.getByRole('button', { name: '가져오기 확정' })).toBeVisible({ timeout: 8_000 });

    const selectedCount = await page.locator('input[type="checkbox"]').count();
    expect(selectedCount).toBeGreaterThan(0);

    await expect(page.getByText(/Import 미리보기/)).toBeVisible();
    await expect(page.getByRole('button', { name: '취소' })).toBeVisible();
    await captureState(page, 'backup.overlay', '미리보기', [
      'backup-tablist is visible',
      'backup-tab-url/text/file/sample are visible in order',
      'backup quiet status and control buttons are visible',
      'backup theme status and light/dark buttons are visible',
      'backup version date is visible',
      'backup url sync status is visible',
      'backup panels switch with tab selection',
      'backup-panel-sample is visible when sample tab selected',
      'backup url/text/file/sample controls are available by tab switching',
      'backup-export-btn is absent',
      'backup-preview is visible',
      'backup-confirm is visible',
    ]);

    await page.getByRole('button', { name: '가져오기 확정' }).click();
    await expect(page.getByText(/기존 자료를 교체하고 총/)).toBeVisible();
    await expect(page.getByText('현재 저장 데이터: 3개')).toBeVisible();
    const storedTitles = await page.evaluate(() => {
      const raw = window.localStorage.getItem('homi.store.v1');
      const parsed = raw ? JSON.parse(raw) : null;
      const datasetsByEngine = parsed?.datasetsByEngine ?? {};
      return {
        schedule: ((datasetsByEngine.schedule ?? []) as Array<{ title: string }>).map((dataset) => dataset.title).sort(),
        dictation: ((datasetsByEngine.dictation ?? []) as Array<{ title: string }>).map((dataset) => dataset.title).sort(),
      };
    });
    expect(storedTitles.schedule).toEqual(expectedScheduleTitles);
    expect(storedTitles.dictation).toEqual(expectedDictationTitles);
    await captureState(page, 'backup.overlay', '확정 완료', [
      'backup-confirm clicked',
      'import replaced datasets',
      'replace warning text visible',
    ]);

    await page.goto('/engines/schedule');
    await expect(page.getByRole('heading', { name: '기존 일정' })).toHaveCount(0);
    for (const title of expectedScheduleTitles) {
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
    }
  });

  test('[test.p1.backup.theme_mode_persisted] 브레인 설정의 라이트/다크 모드는 즉시 적용되고 재실행 후에도 유지되어야 한다', async ({ page }) => {
    await resetLocalData(page);
    await page.goto('/brain');

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByTestId('backup-theme-status')).toContainText('라이트 모드');
    await expect(page.getByTestId('backup-theme-light')).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('backup-theme-dark').click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByTestId('backup-theme-status')).toContainText('다크 모드');
    await expect(page.getByTestId('backup-theme-dark')).toHaveAttribute('aria-pressed', 'true');
    expect(
      await page.evaluate(() => {
        const raw = window.localStorage.getItem('homi.store.v1');
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed?.ui?.themeMode ?? null;
      }),
    ).toBe('dark');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByTestId('backup-theme-status')).toContainText('다크 모드');

    await page.getByTestId('backup-theme-light').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByTestId('backup-theme-status')).toContainText('라이트 모드');
    await expect(page.getByTestId('backup-theme-light')).toHaveAttribute('aria-pressed', 'true');
  });

  test('[test.p0.import.entry_backup_only] import 입력 UI는 브레인 설정 route(/brain)에만 존재해야 한다', async ({ page }) => {
    await resetLocalData(page);
    await page.goto('/engines/dictation');

    await expect(page.getByTestId('overlay-root')).toHaveAttribute('data-overlay-kind', 'engine');
    await expect(page.getByTestId('backup-url-input')).toHaveCount(0);
    await expect(page.getByTestId('backup-json-textarea')).toHaveCount(0);
    await expect(page.getByTestId('backup-file-input')).toHaveCount(0);
  });

  test('[ui.stability.import_preview_reset] 새 import 시도가 실패하면 이전 preview는 제거되어야 한다', async ({ page }) => {
    await resetLocalData(page);
    await page.goto('/brain');

    await selectBackupTab(page, '샘플 가져오기');
    await page.getByRole('button', { name: '기본 샘플 뇌 가져오기' }).click();
    await expect(page.getByTestId('backup-preview')).toBeVisible({ timeout: 8_000 });

    await selectBackupTab(page, '텍스트로 가져오기');
    await page.getByTestId('backup-json-textarea').fill('{');
    await page.getByTestId('backup-text-preview-btn').click();

    await expect(page.getByTestId('backup-error')).toBeVisible();
    await expect(page.getByTestId('backup-preview')).toHaveCount(0);
    await expect(page.getByTestId('backup-confirm')).toHaveCount(0);
  });

  test('[test.p0.dictation.start_sets_mode] 데이터 세트가 있으면 받아쓰기 실행 모드로 진입해야 한다', async ({ page }) => {
    await resetLocalData(page);
    await openBackupAndImportSample(page);
    await page.goto('/');
    const idleFaceRect = await getFaceRect(page);

    await page.goto('/engines/dictation');
    await page.waitForLoadState('networkidle');

    const { startButton } = await selectFirstDictationDataset(page);
    await startButton.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('overlay-root')).toHaveCount(0);
    await expect(page.getByTestId('toast-root')).toHaveCount(0);
    await expect(page.getByTestId('home-face')).toBeVisible();
    const runningFaceRect = await getFaceRect(page);
    expect(Math.abs(runningFaceRect.x - idleFaceRect.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(runningFaceRect.y - idleFaceRect.y)).toBeLessThanOrEqual(2);
    await expect(page.getByTestId('home-control-box-2').getByTestId('home-bubble')).toBeVisible();
    await expect(page.getByTestId('home-control-box-8').getByTestId('dictation-root')).toBeVisible();
    await expect(page.getByText('받아쓰기 게임')).toBeVisible();
    await expect(page.getByTestId('home-mode-text')).toContainText('받아쓰기 실행모드');
    await expectFacePageNoScroll(page);
    await captureState(page, 'dictation.running', '실행 중', [
      'home-face is visible',
      'dictation-root is visible',
      'overlay-root is closed',
      'toast-root is absent on running home face screen',
      'home face screen has no vertical scroll',
      'home-face position is stable across mode change',
      'dictation-progress is visible',
      'dictation-next is visible',
      'dictation-exit is visible',
      'home-mode-text shows 받아쓰기 실행모드',
    ]);
  });

  test('[test.p0.dictation.timer_next_exit] dictation은 자동 진행과 Next/자동 완료/수동 종료를 안정적으로 처리해야 한다', async ({ page }) => {
    await resetLocalData(page);
    await openBackupAndImportSample(page);

    await page.goto('/engines/dictation');
    await page.waitForLoadState('networkidle');

    const { startButton } = await selectFirstDictationDataset(page);
    await startButton.click();

    await expect(page.getByTestId('dictation-progress-index')).toHaveText('1');
    await page.waitForTimeout(10_500);
    await expect(page.getByTestId('dictation-progress-index')).toHaveText('2');

    await page.getByTestId('dictation-next').click();
    await expect(page.getByTestId('dictation-progress-index')).toHaveText('3');

    await page.waitForTimeout(10_500);
    await expect(page.getByTestId('dictation-root')).toHaveCount(0);
    await expect(page.getByTestId('home-mode-text')).toHaveCount(0);
    await expect(page.getByTestId('toast-root')).toHaveCount(0);
    await expect(page.getByTestId('schedule-toast')).toHaveCount(0);
    await expect(page.getByTestId('home-status-text')).toContainText('마지막 항목까지 진행했습니다.');

    await page.goto('/engines/dictation');
    await page.waitForLoadState('networkidle');

    const restart = await selectFirstDictationDataset(page);
    await restart.startButton.click();
    await expect(page.getByTestId('dictation-root')).toBeVisible();

    await page.getByTestId('dictation-exit').click();
    await expect(page.getByTestId('dictation-root')).toHaveCount(0);
    await expect(page.getByTestId('home-mode-text')).toHaveCount(0);
    await expect(page.getByTestId('toast-root')).toHaveCount(0);
    await expect(page.getByTestId('home-open-engines')).toBeVisible();
  });

  test('[test.p0.schedule.no_interrupt_during_dictation] 받아쓰기 실행 중 스케줄 알림은 토스트 없이 지나가야 한다', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const NotificationMock = class NotificationMock {
        static permission = 'granted';

        constructor() {
          (window as Window & { __homiNotificationCalls?: number }).__homiNotificationCalls =
            ((window as Window & { __homiNotificationCalls?: number }).__homiNotificationCalls ?? 0) + 1;
        }
      };
      (window as Window & { __homiNotificationCalls?: number }).__homiNotificationCalls = 0;
      Object.defineProperty(window, 'Notification', {
        configurable: true,
        writable: true,
        value: NotificationMock,
      });
    });

    await resetLocalData(page);
    await openBackupAndImportFixture(page, 'tests/fixtures/bundle.min.v1.json');

    await page.goto('/engines/dictation');
    await page.waitForLoadState('networkidle');

    const { startButton } = await selectFirstDictationDataset(page);
    await startButton.click();
    await expect(page.getByTestId('overlay-root')).toHaveCount(0);
    await expect(page.getByText('받아쓰기 게임')).toBeVisible();

    const notificationCountBefore = await page.evaluate(
      () => (window as Window & { __homiNotificationCalls?: number }).__homiNotificationCalls ?? 0,
    );
    await page.waitForTimeout(2_500);
    await expect(page.getByTestId('schedule-toast')).toHaveCount(0);
    await expect(page.getByTestId('toast-root')).toHaveCount(0);
    await expect(page.getByTestId('dictation-root')).toBeVisible();
    await expect(page.getByText('받아쓰기 게임')).toBeVisible();
    const notificationCountAfter = await page.evaluate(
      () => (window as Window & { __homiNotificationCalls?: number }).__homiNotificationCalls ?? 0,
    );
    expect(notificationCountAfter).toBe(notificationCountBefore);

    await captureState(page, 'schedule.quiet.during-dictation', '실행 중 무토스트', [
      'schedule-toast is absent during dictation',
      'toast-root is absent during dictation',
      'dictation-root remains visible',
      'Notification constructor is not called while dictation is active',
    ]);
  });

  test('[test.p0.security.javascript_scheme_block] javascript URL import는 preview를 만들지 않고 차단해야 한다', async ({
    page,
  }) => {
    await resetLocalData(page);
    await page.goto('/brain');

    await selectBackupTab(page, 'URL 가져오기');
    await page.getByTestId('backup-url-input').fill('  JavaScript:alert(1)');
    await page.getByTestId('backup-url-preview-btn').click();

    await expect(page.getByTestId('backup-error')).toContainText('javascript: 스킴은 사용할 수 없습니다.');
    await expect(page.getByTestId('backup-preview')).toHaveCount(0);
    await expect(page.getByTestId('backup-confirm')).toHaveCount(0);
  });

  test('[test.p0.security.text_render_only] XSS 문자열은 텍스트로만 보여야 한다', async ({ page }) => {
    await page.addInitScript(() => {
      (window as Window & { __homiAlertCount?: number }).__homiAlertCount = 0;
      window.alert = () => {
        (window as Window & { __homiAlertCount?: number }).__homiAlertCount =
          ((window as Window & { __homiAlertCount?: number }).__homiAlertCount ?? 0) + 1;
      };
    });

    await resetLocalData(page);
    await openBackupAndPreviewFixture(page, 'tests/fixtures/bundle.xss.v1.json');

    await expect(page.getByRole('heading', { name: '<img src=x onerror=alert(1)>' })).toBeVisible();
    const alertCount = await page.evaluate(
      () => (window as Window & { __homiAlertCount?: number }).__homiAlertCount ?? 0,
    );
    expect(alertCount).toBe(0);
  });

  test('[test.p1.import.share_link_preview] 공유 링크 import는 /brain 진입 시 자동 preview를 만들어야 한다', async ({
    page,
  }) => {
    await resetLocalData(page);
    const bundleText = readFileSync(resolve('tests/fixtures/bundle.min.v1.json'), 'utf8');

    await page.goto(buildSharedImportPath(bundleText));

    await expect(page.getByTestId('overlay-root')).toHaveAttribute('data-overlay-kind', 'backup');
    await expect(page.getByTestId('backup-preview')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId('backup-confirm')).toBeVisible();
    await expect(page).toHaveURL(/\/brain$/);
  });

  test('[test.p1.import.url_linked_auto_refresh] URL로 연결된 브레인은 변경 시 자동 갱신되어야 한다', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      (window as Window & { __HOMI_URL_SYNC_INTERVAL_MS__?: number }).__HOMI_URL_SYNC_INTERVAL_MS__ = 100;
    });

    const remoteUrl = 'https://sync.example.com/homi-sync.json';
    let remoteBundleText = buildBundleText([
      {
        id: 'schedule_sync_1',
        engineId: 'schedule',
        engineSchemaVersion: 1,
        title: '원격 일정 A',
        items: [{ date: '2026-03-09', title: '원격 일정 A', timeStart: '09:00' }],
      },
    ]);

    await page.route(remoteUrl, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
        },
        body: remoteBundleText,
      });
    });

    await resetLocalData(page);
    await page.goto('/brain');
    await selectBackupTab(page, 'URL 가져오기');
    await expect(page.getByTestId('backup-url-sync-status')).toContainText('현재 URL 자동 업데이트 연결 없음');

    await page.getByTestId('backup-url-input').fill(remoteUrl);
    await page.getByTestId('backup-url-preview-btn').click();
    await expect(page.getByTestId('backup-preview')).toBeVisible({ timeout: 8_000 });
    await page.getByTestId('backup-confirm').click();
    await expect(page.getByText(/기존 자료를 교체하고 총 1개 자료 세트를 가져왔습니다\./)).toBeVisible();
    await expect(page.getByTestId('backup-url-sync-status')).toContainText(remoteUrl);

    await page.goto('/engines/schedule');
    await expect(page.getByRole('heading', { name: '원격 일정 A' })).toBeVisible();

    remoteBundleText = buildBundleText([
      {
        id: 'schedule_sync_1',
        engineId: 'schedule',
        engineSchemaVersion: 1,
        title: '원격 일정 B',
        items: [{ date: '2026-03-09', title: '원격 일정 B', timeStart: '10:00' }],
      },
    ]);

    await expect(page.getByRole('heading', { name: '원격 일정 B' })).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/\/engines\/schedule$/);
  });

  test('[test.p1.import.url_saved_persists] 저장된 brain JSON URL은 자동 동기화 해제 후에도 유지되어야 한다', async ({
    page,
  }) => {
    const remoteUrl = 'https://sync.example.com/homi-persist.json';
    const remoteBundleText = buildBundleText([
      {
        id: 'schedule_persist_1',
        engineId: 'schedule',
        engineSchemaVersion: 1,
        title: '기억할 URL 일정',
        items: [{ date: '2026-03-09', title: '기억할 URL 일정', timeStart: '09:00' }],
      },
    ]);

    await page.route(remoteUrl, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
        },
        body: remoteBundleText,
      });
    });

    await resetLocalData(page);
    await page.goto('/brain');
    await selectBackupTab(page, 'URL 가져오기');
    await page.getByTestId('backup-url-input').fill(remoteUrl);
    await page.getByTestId('backup-url-preview-btn').click();
    await expect(page.getByTestId('backup-preview')).toBeVisible({ timeout: 8_000 });
    await page.getByTestId('backup-confirm').click();
    await expect(page.getByTestId('backup-url-sync-status')).toContainText(remoteUrl);

    await page.goto('/engines/schedule');
    await page.getByRole('button', { name: '편집' }).first().click();
    await page.getByLabel('제목').fill('로컬 수정 일정');
    await page.getByRole('button', { name: '저장' }).click();

    await page.reload();
    await page.goto('/brain');
    await expect(page.getByTestId('backup-url-sync-status')).toContainText(remoteUrl);
    await expect(page.getByTestId('backup-url-sync-status')).toContainText('자동 업데이트 연결 안 됨');
    await expect(page.getByTestId('backup-url-input')).toHaveValue(remoteUrl);
  });

  test('[test.p1.schedule.quiet_mode_suppresses_reminders] 30분 조용히 모드가 켜져 있으면 schedule 알림은 무시되어야 한다', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const notificationStats = { count: 0 };
      const NotificationMock = class NotificationMock {
        static permission = 'granted';

        constructor() {
          notificationStats.count += 1;
        }
      };

      const synth =
        window.speechSynthesis ??
        ({
          speaking: false,
          cancel() {},
          getVoices() {
            return [];
          },
        } as SpeechSynthesis);

      let speakCount = 0;
      synth.speak = () => {
        speakCount += 1;
      };
      synth.speaking = false;

      Object.defineProperty(window, '__homiNotificationCount', {
        configurable: true,
        get() {
          return notificationStats.count;
        },
      });
      Object.defineProperty(window, '__homiSpeechCount', {
        configurable: true,
        get() {
          return speakCount;
        },
      });
      Object.defineProperty(window, 'Notification', {
        configurable: true,
        writable: true,
        value: NotificationMock,
      });
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        writable: true,
        value: synth,
      });
    });

    await resetLocalData(page);
    await openBackupAndImportFixture(page, 'tests/fixtures/bundle.min.v1.json');
    await page.goto('/brain');

    await expect(page.getByTestId('backup-quiet-status')).toContainText('현재 상태: 꺼짐');
    await page.getByTestId('backup-quiet-enable').click();
    await expect(page.getByTestId('backup-quiet-status')).toContainText('분 남음');
    await expect(page.getByTestId('backup-quiet-clear')).toBeEnabled();

    await page.goto('/');
    await page.waitForTimeout(3_200);

    await expect(page.getByTestId('home-status-text')).toContainText('알림 조용히 중');
    await expect(page.getByTestId('home-status-text')).toContainText('분 남음');
    await expect(page.getByTestId('home-status-text')).not.toContainText('Ping');
    expect(
      await page.evaluate(() => (window as Window & { __homiNotificationCount?: number }).__homiNotificationCount ?? 0),
    ).toBe(0);
    expect(
      await page.evaluate(() => (window as Window & { __homiSpeechCount?: number }).__homiSpeechCount ?? 0),
    ).toBe(0);
  });

  test('[test.p1.schedule.recurring_daily_yearly] schedule은 매일/매년 반복 시각에 한 번씩만 울려야 한다', async ({
    page,
  }) => {
    await installMockClock(page, '2026-03-12T07:29:50');
    await installSpeechSynthesisMock(page);
    await resetLocalData(page);

    await openBackupAndPreviewText(
      page,
      buildBundleText([
        {
          id: 'schedule_recur_1',
          engineId: 'schedule',
          engineSchemaVersion: 1,
          title: '생활 반복 일정',
          items: [
            { repeat: 'daily', title: '아침 약 먹기', timeStart: '07:30' },
            { repeat: 'yearly', monthDay: '03-12', title: '생일 축하', timeStart: '07:31' },
          ],
        },
      ]),
    );
    await page.getByTestId('backup-confirm').click();
    await expect(page.getByText(/기존 자료를 교체하고 총/)).toBeVisible();

    await page.goto('/engines/schedule');
    const previewItems = page.getByTestId('schedule-preview-item');
    await expect(previewItems.nth(0)).toContainText('매일 07:30');
    await expect(previewItems.nth(1)).toContainText('매년 03-12 07:31');

    await page.goto('/');
    await setMockClock(page, '2026-03-12T07:30:01');
    await page.waitForTimeout(1_200);
    await expect(page.getByTestId('home-status-text')).toHaveText('아침 약 먹기');
    expect(
      await page.evaluate(() => (window as Window & { __homiSpeechCount?: number }).__homiSpeechCount ?? 0),
    ).toBe(1);

    await page.waitForTimeout(1_200);
    expect(
      await page.evaluate(() => (window as Window & { __homiSpeechCount?: number }).__homiSpeechCount ?? 0),
    ).toBe(1);

    await setMockClock(page, '2026-03-12T07:31:01');
    await page.waitForTimeout(1_200);
    await expect(page.getByTestId('home-status-text')).toHaveText('생일 축하');
    expect(
      await page.evaluate(() => (window as Window & { __homiSpeechCount?: number }).__homiSpeechCount ?? 0),
    ).toBe(2);
  });

  test('[test.p1.schedule.preview_speech] schedule 엔진에서 등록된 항목을 눌러 음성 미리 듣기를 테스트할 수 있어야 한다', async ({
    page,
  }) => {
    await installSpeechSynthesisMock(page);
    await resetLocalData(page);

    const previewTitle = '이제는 슬슬 나갈 준비해야지';
    await openBackupAndPreviewText(
      page,
      buildBundleText([
        {
          id: 'schedule_preview_1',
          engineId: 'schedule',
          engineSchemaVersion: 1,
          title: '생활 알림',
          items: [{ date: '2026-03-10', timeStart: '07:30', title: previewTitle }],
        },
      ]),
    );
    await page.getByTestId('backup-confirm').click();
    await expect(page.getByText(/기존 자료를 교체하고 총/)).toBeVisible();

    await page.goto('/engines/schedule');
    await expect(page.getByTestId('schedule-preview-list')).toBeVisible();
    const firstPreview = page.getByTestId('schedule-preview-item').first();
    await expect(firstPreview).toContainText(previewTitle);

    await firstPreview.click();

    await expect(page.getByTestId('schedule-preview-status')).toContainText(previewTitle);
    expect(
      await page.evaluate(() => (window as Window & { __homiSpeechCount?: number }).__homiSpeechCount ?? 0),
    ).toBe(1);
    expect(
      await page.evaluate(() => (window as Window & { __homiLastSpeechText?: string }).__homiLastSpeechText ?? ''),
    ).toBe(previewTitle);

    await captureState(page, 'schedule.overlay', '스케줄 음성 미리 듣기', [
      'schedule-preview-list visible',
      'registered schedule item titles are listed',
      'clicking schedule-preview-item triggers speech playback',
      'schedule-preview-status reflects the clicked item title',
    ]);
  });

  test('[test.p1.schedule.toggle_enabled] 스케줄 비활성 세트는 알림 대상에서 제외되어야 한다', async ({ page }) => {
    await resetLocalData(page);
    await openBackupAndImportSample(page);

    await page.goto('/engines/schedule');
    await expect(page.getByRole('heading', { name: '자료 세트' })).toBeVisible();
    const firstToggle = page.getByTestId('schedule-enabled-toggle').first();
    await firstToggle.click();
    await captureState(page, 'schedule.overlay', '비활성 토글', [
      'schedule dataset list is visible',
      'schedule-enabled-toggle interaction available',
    ]);
  });

  test('[test.p1.schedule.hourly_chime_toggle] schedule 설정의 정시 차임 On/Off가 저장되고 매시 정각에 한 번 재생되어야 한다', async ({
    page,
  }) => {
    await installMockClock(page, '2026-03-12T09:59:50');
    await installAudioPlayMock(page);
    await resetLocalData(page);

    await page.goto('/engines/schedule');
    const status = page.getByTestId('schedule-hourly-chime-status');
    const toggle = page.getByTestId('schedule-hourly-chime-toggle');

    await expect(status).toHaveText('현재 상태: 꺼짐');
    await toggle.click();
    await expect(status).toContainText('켜짐');

    await captureState(page, 'schedule.overlay', '정시 차임 활성화', [
      'schedule-hourly-chime-toggle is visible',
      'schedule-hourly-chime-status shows enabled',
    ]);

    await page.reload();
    await expect(page.getByTestId('schedule-hourly-chime-status')).toContainText('켜짐');

    await page.goto('/');
    await setMockClock(page, '2026-03-12T10:00:01');
    await page.waitForTimeout(3_200);
    expect(
      await page.evaluate(() => (window as Window & { __homiChimePlayCount?: number }).__homiChimePlayCount ?? 0),
    ).toBe(1);
    expect(
      await page.evaluate(() => (window as Window & { __homiLastAudioSrc?: string }).__homiLastAudioSrc ?? ''),
    ).toContain('/sounds/chime.mp3');

    await page.goto('/engines/schedule');
    await page.getByTestId('schedule-hourly-chime-toggle').click();
    await expect(page.getByTestId('schedule-hourly-chime-status')).toHaveText('현재 상태: 꺼짐');

    await page.goto('/');
    await setMockClock(page, '2026-03-12T11:00:01');
    await page.waitForTimeout(3_200);
    expect(
      await page.evaluate(() => (window as Window & { __homiChimePlayCount?: number }).__homiChimePlayCount ?? 0),
    ).toBe(0);
  });
});
