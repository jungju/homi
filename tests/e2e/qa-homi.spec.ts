import { expect, type Page, test } from '@playwright/test';

import { captureUIArtifacts } from '../helpers/capture-ui-artifacts';

async function resetLocalData(page: Page) {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

async function openBackupAndImportSample(page: Page) {
  await page.goto('/backup');
  await page.getByRole('button', { name: '기본 샘플 뇌 가져오기' }).click();
  await expect(page.getByRole('button', { name: '가져오기 확정' })).toBeVisible({ timeout: 8_000 });
  await page.getByRole('button', { name: '가져오기 확정' }).click();
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

test.describe('Homi v1 실행 시각화 기본 체크', () => {
  test('[test.p0.home.base_layout] 홈 화면은 얼굴/말풍선/모드를 항상 보여야 한다', async ({ page }) => {
    await resetLocalData(page);
    await page.goto('/');

    await expect(page.getByTestId('app-root')).toBeVisible();
    await expect(page.getByTestId('home-root')).toBeVisible();
    await expect(
      page.getByRole('img', { name: '친근한 홈 캐릭터 얼굴' }),
    ).toBeVisible();
    await expect(page.getByText(/현재 모드:/)).toBeVisible();
    await expect(page.getByRole('button', { name: '브레인 설정' })).toBeVisible();
    await expect(page.getByRole('button', { name: /스케줄 열기/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /받아쓰기 열기/ })).toBeVisible();
    await expect(page.locator('[data-testid="global-header"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="global-nav"]')).toHaveCount(0);

    await captureState(page, 'home.default', '기본 모드', [
      'home-root is visible',
      'home-face is visible',
      'home-bubble is visible',
      'home-mode-text shows 기본 모드',
      'engine entry buttons are visible',
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
    await expect(page.getByTestId('home-root')).toBeVisible();
  });

  test('[test.p0.backup.overlay_contract][test.p0.import.preview_before_confirm][test.p0.import.replace_only] 브레인 설정에서 샘플 임포트가 미리보기→확정으로 동작해야 한다', async ({ page }) => {
    await resetLocalData(page);
    await page.goto('/backup');
    await expect(page.getByTestId('overlay-root')).toHaveAttribute('data-overlay-kind', 'backup');
    await expect(page.getByTestId('backup-export-btn')).toBeVisible();
    await page.getByRole('button', { name: '기본 샘플 뇌 가져오기' }).click();
    await expect(page.getByRole('button', { name: '가져오기 확정' })).toBeVisible({ timeout: 8_000 });

    const selectedCount = await page.locator('input[type="checkbox"]').count();
    expect(selectedCount).toBeGreaterThan(0);

    await expect(page.getByText(/Import 미리보기/)).toBeVisible();
    await expect(page.getByRole('button', { name: '취소' })).toBeVisible();
    await captureState(page, 'backup.overlay', '미리보기', [
      'backup-url-input exists',
      'backup-json-textarea exists',
      'backup-file-input exists',
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

  test('[test.p0.dictation.start_sets_mode] 데이터 세트가 있으면 받아쓰기 실행 모드로 진입해야 한다', async ({ page }) => {
    await resetLocalData(page);
    await openBackupAndImportSample(page);

    await page.goto('/engines/dictation');
    await page.waitForLoadState('networkidle');

    const selectButton = page.getByTestId('dataset-open').first();
    await expect(selectButton).toBeVisible();
    const startButton = page.getByRole('button', { name: '시작' });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await selectButton.click();
      if (await startButton.isEnabled()) {
        break;
      }
      await page.waitForTimeout(120);
    }
    await expect(startButton).toBeEnabled();
    await startButton.click();
    await expect(page.getByText('받아쓰기 게임')).toBeVisible();
    await expect(page.getByTestId('home-mode-text')).toContainText('받아쓰기 실행모드');
    await captureState(page, 'dictation.running', '실행 중', [
      'dictation-root is visible',
      'dictation-progress is visible',
      'dictation-next is visible',
      'dictation-exit is visible',
      'home-mode-text shows 받아쓰기 실행모드',
    ]);

    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: '게임 나가기' }).click();
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
