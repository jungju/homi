import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { type Page } from '@playwright/test';

export type CaptureUIArtifactInputs = {
  screenId: string;
  route?: string;
  state?: string;
  outputDir?: string;
  expectedImage?: string;
  notes?: string;
  deterministicAssertions?: string[];
};

export type CaptureUIArtifactResult = {
  screenId: string;
  outputDir: string;
  artifacts: {
    screenshot: string;
    testIds: string;
    visibleText: string;
    ariaSnapshot: string;
    meta: string;
  };
};

function sanitizeScreenId(screenId: string): string {
  return screenId
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

async function innerCapture(page: Page, options: CaptureUIArtifactInputs): Promise<CaptureUIArtifactResult> {
  const outputDir = options.outputDir ?? 'test-results/ai-artifacts';
  await mkdir(outputDir, { recursive: true });

  const screenId = sanitizeScreenId(options.screenId);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const stem = `${screenId}.${ts}`;

  const screenshot = path.join(outputDir, `${stem}.png`);
  const testIdsPath = path.join(outputDir, `${stem}.dom-testids.json`);
  const visibleTextPath = path.join(outputDir, `${stem}.visible-text.txt`);
  const ariaSnapshotPath = path.join(outputDir, `${stem}.aria-snapshot.json`);
  const metaPath = path.join(outputDir, `${stem}.meta.json`);

  await page.screenshot({ path: screenshot, fullPage: true });

  const testIds = await page
    .locator('[data-testid]')
    .evaluateAll< {id: string; text?: string}[]>((els) =>
      els.map((el) => {
        const id = el.getAttribute('data-testid');
        if (!id) return null;
        return {
          id,
          text: (el as HTMLElement).innerText?.trim() || undefined,
        };
      }).filter((item): item is {id: string; text?: string} => item !== null),
    );

  const visibleText = await page.locator('body').innerText();
  const aria = page.accessibility?.snapshot
    ? await page.accessibility.snapshot({ interestingOnly: false })
    : {};
  const route = options.route ?? page.url();
  const meta = {
    screenId,
    state: options.state,
    route,
    expectedImage: options.expectedImage,
    notes: options.notes,
    deterministicAssertions: options.deterministicAssertions ?? [],
    capturedAt: new Date().toISOString(),
    viewport: page.viewportSize(),
  };

  await Promise.all([
    writeFile(testIdsPath, JSON.stringify({ screenId, items: testIds }, null, 2), 'utf8'),
    writeFile(visibleTextPath, visibleText || '', 'utf8'),
    writeFile(ariaSnapshotPath, JSON.stringify(aria ?? {}, null, 2), 'utf8'),
    writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8'),
  ]);

  return {
    screenId,
    outputDir,
    artifacts: {
      screenshot: screenshot,
      testIds: testIdsPath,
      visibleText: visibleTextPath,
      ariaSnapshot: ariaSnapshotPath,
      meta: metaPath,
    },
  };
}

export async function captureUIArtifacts(
  page: Page,
  options: CaptureUIArtifactInputs,
): Promise<CaptureUIArtifactResult> {
  const fallbackRoute = () => page.url() || 'unknown';

  // Keep deterministic helper path explicit for tests.
  const defaulted = {
    ...options,
    route: options.route ?? fallbackRoute(),
  };

  const result = await innerCapture(page, defaulted);
  return result;
}

export async function getAppModeText(page: Page): Promise<string | null> {
  const el = page.locator('[data-testid="home-mode-text"]');
  if (await el.count() === 0) return null;
  const value = await el.textContent();
  return value?.trim() ?? null;
}

export async function existsTestId(page: Page, testId: string): Promise<boolean> {
  return (await page.locator(`[data-testid="${testId}"]`).count()) > 0;
}
