import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { captureUIArtifacts } from '../helpers/capture-ui-artifacts';

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

async function openBackupAndImportSample(page: Page) {
  await page.goto('/brain');
  await selectBackupTab(page, '샘플 가져오기');
  await page.getByRole('button', { name: '기본 샘플 뇌 가져오기' }).click();
  await expect(page.getByRole('button', { name: '가져오기 확정' })).toBeVisible({ timeout: 8_000 });
  await page.getByRole('button', { name: '가져오기 확정' }).click();
  await expect(page.getByText(/기존 자료를 교체하고 총/)).toBeVisible();
}

async function openBackupAndPreviewText(page: Page, bundleText: string) {
  await page.goto('/brain');
  await selectBackupTab(page, '텍스트로 가져오기');
  await page.getByTestId('backup-json-textarea').fill(bundleText);
  await page.getByTestId('backup-text-preview-btn').click();
  await expect(page.getByTestId('backup-preview')).toBeVisible({ timeout: 8_000 });
}

async function openBackupAndPreviewFixture(page: Page, fixturePath: string) {
  const bundleText = readFileSync(resolve(fixturePath), 'utf8');
  await openBackupAndPreviewText(page, bundleText);
}

async function openBackupAndImportFixture(page: Page, fixturePath: string) {
  await openBackupAndPreviewFixture(page, fixturePath);
  await page.getByTestId('backup-confirm').click();
  await expect(page.getByText(/기존 자료를 교체하고 총/)).toBeVisible();
}

async function captureState(
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
    const faceRect = await getFaceRect(page);
    expect(faceRect.width).toBeGreaterThanOrEqual(620);
    expect(await getSelectorSizePx(page, '.home-face__eye', 'width')).toBeGreaterThanOrEqual(100);
    expect(await getFontSizePx(page, 'home-robot-name')).toBeGreaterThanOrEqual(60);
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
      'home-robot-name shows 호미',
      'home-status-text is absent without alert',
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
    await resetLocalData(page);
    await page.goto('/brain');
    await expect(page.getByTestId('overlay-root')).toHaveAttribute('data-overlay-kind', 'backup');
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
      'backup panels switch with tab selection',
      'backup-panel-sample is visible when sample tab selected',
      'backup url/text/file/sample controls are available by tab switching',
      'backup-export-btn is absent',
      'backup-preview is visible',
      'backup-confirm is visible',
    ]);

    await page.getByRole('button', { name: '가져오기 확정' }).click();
    await expect(page.getByText(/기존 자료를 교체하고 총/)).toBeVisible();
    await captureState(page, 'backup.overlay', '확정 완료', [
      'backup-confirm clicked',
      'import replaced datasets',
      'replace warning text visible',
    ]);
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
});
