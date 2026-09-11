import { expect, test, type Page } from '@playwright/test';
import { evidencePng, isDarkRgb, probe, waitReady } from './helpers';

test.describe('Clay Earth', () => {
  test.describe.configure({ mode: 'serial' });

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status === testInfo.expectedStatus) return;
    await page.screenshot({ path: testInfo.outputPath('failure.png'), fullPage: true });
  });

  test('boot', async () => {
    await page.goto('/', { waitUntil: 'load', timeout: 60_000 });
    await waitReady(page, 60_000);
    await expect(page.getByText('web lab')).toBeVisible({ timeout: 60_000 });

    const state = await probe(page);
    expect(state?.playable).toBe('clay-earth');
    expect(state?.physics).toBe(false);

    await page.screenshot({ path: evidencePng('pw-space.png'), fullPage: true });

    await expect(page.locator('#game')).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(1);

    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(isDarkRgb(background), `body background should be dark, got ${background}`).toBe(true);

    await expect(page.getByText('WASD')).toHaveCount(0);
  });

  test('origin Warsaw', async () => {
    const input = page.locator('#hud-origin-query');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'город, страна');
    await input.fill('Warsaw');
    await page.locator('.hud-origin-submit').click();

    await page.waitForFunction(() => Boolean(window.__CS_WEB__?.originId), undefined, { timeout: 60_000 });

    await expect(page.getByText(/Варшава|Warsaw/).first()).toBeVisible();
    await page.screenshot({ path: evidencePng('pw-origin.png'), fullPage: true });
  });

  test('paint', async () => {
    const before = await probe(page);
    expect(before?.originId).toBeTruthy();
    expect(before?.selectedId).toBeTruthy();
    const paintBefore = before?.paint ?? 0;

    const boost = page.getByRole('button', { name: 'Ещё слой' });
    await expect(boost).toBeVisible();
    await boost.click();

    await page.waitForFunction(() => (window.__CS_WEB__?.progress ?? 0) > 0, undefined, { timeout: 15_000 });
    await page.screenshot({ path: evidencePng('pw-paint.png'), fullPage: true });

    await page.waitForFunction(() => window.__CS_WEB__?.progress === 1, undefined, { timeout: 25_000 });

    const after = await probe(page);
    const glaze = page.getByText('глазурь');
    const paintGrew = (after?.paint ?? 0) > paintBefore;
    const glazeVisible = await glaze.isVisible();
    expect(paintGrew || glazeVisible).toBe(true);

    await page.screenshot({ path: evidencePng('pw-done.png'), fullPage: true });

    const offer = page.getByText('Открыть');
    const province = page.getByText(/Мазовецк|провинция/);
    await expect(offer.or(province).first()).toBeVisible();
  });

  test('moscow', async () => {
    await page.reload({ waitUntil: 'load', timeout: 60_000 });
    await waitReady(page, 60_000);

    await page.evaluate(() => {
      window.__CS_WEB_CMD__ = { originQuery: 'Москва' };
    });
    await page.waitForFunction(() => Boolean(window.__CS_WEB__?.originId), undefined, { timeout: 60_000 });

    await page.screenshot({ path: evidencePng('pw-moscow.png'), fullPage: true });
  });
});
