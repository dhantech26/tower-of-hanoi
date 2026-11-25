import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
});

test('Auto-run persists, pauses, changes speed live, and completes', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const run = page.getByTestId('auto-run');
  await run.click();
  await expect(run).toHaveText('Pause');
  await page.waitForTimeout(1600);
  await expect(run).toHaveText('Pause');
  await expect(page.getByTestId('elapsed-time')).not.toHaveText('00:00');
  const runningStep = await page.getByTestId('step-count').textContent();
  expect(parseInt(runningStep)).toBeGreaterThan(1);
  await run.click();
  const pausedStep = await page.getByTestId('step-count').textContent();
  const pausedTime = await page.getByTestId('elapsed-time').textContent();
  await page.waitForTimeout(1200);
  await expect(page.getByTestId('step-count')).toHaveText(pausedStep);
  await expect(page.getByTestId('elapsed-time')).toHaveText(pausedTime);
  await run.click();
  await page.getByRole('slider', { name: 'Playback speed' }).focus();
  await page.keyboard.press('End');
  await expect(page.getByTestId('speed-value')).toHaveText('4×');
  await expect(run).toHaveText('Pause');
  await expect(page.getByTestId('run-status')).toHaveText('Complete', { timeout: 20000 });
  await expect(page.getByTestId('move-count')).toHaveText('7 / 7');
  await expect(page.getByTestId('call-count')).toHaveText('7');
  await expect(page.getByTestId('stack-depth')).toHaveText('0 / 3');
  await expect(page.getByTestId('disk-3')).toHaveAttribute('data-rod', 'C');
  expect(errors).toEqual([]);
  await run.click();
  await expect(run).toHaveText('Pause');
  await page.getByRole('button', { name: 'Reset simulation' }).click();
  await expect(page.getByTestId('elapsed-time')).toHaveText('00:00');
  await expect(page.getByTestId('move-count')).toHaveText('0 / 7');
});

test('Manual play validates moves, undoes them, and recognizes an optimal solution', async ({ page }) => {
  await page.getByRole('tab', { name: 'Play yourself' }).click();
  const rod = (name) => page.getByRole('button', { name: new RegExp(`^Rod ${name},`) });
  await rod('A').click(); await rod('C').click();
  await expect(page.getByTestId('move-count')).toHaveText('1 / 7');
  await rod('A').click(); await rod('C').click();
  await expect(page.getByRole('alert')).toContainText('cannot sit on smaller disk');
  await expect(page.getByTestId('move-count')).toHaveText('1 / 7');
  await page.getByRole('button', { name: 'Undo move' }).click();
  await expect(page.getByTestId('move-count')).toHaveText('0 / 7');
  for (const [from, to] of [['A', 'C'], ['A', 'B'], ['C', 'B'], ['A', 'C'], ['B', 'A'], ['B', 'C'], ['A', 'C']]) { await rod(from).click(); await rod(to).click(); }
  await expect(page.getByTestId('run-status')).toHaveText('Complete');
  await expect(page.getByText('An optimal solution.')).toBeVisible();
  await page.getByRole('button', { name: 'Undo move' }).click();
  await expect(page.getByTestId('move-count')).toHaveText('6 / 7');
  await page.getByRole('button', { name: 'Start again' }).click();
  await expect(page.getByTestId('move-count')).toHaveText('0 / 7');
});

test('Top disks can be dragged between rods', async ({ page }) => {
  await page.getByRole('tab', { name: 'Play yourself' }).click();
  const start = await page.getByTestId('disk-1').boundingBox();
  const destination = await page.getByRole('button', { name: /^Rod C,/ }).boundingBox();
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(destination.x + destination.width / 2, destination.y + destination.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByTestId('move-count')).toHaveText('1 / 7');
  await expect(page.getByTestId('disk-1')).toHaveAttribute('data-rod', 'C');
});

test('Disk count, keyboard stepping, timeline, and narrow layouts work', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Number of disks' }).selectOption('7');
  await expect(page.getByTestId('move-count')).toHaveText('0 / 127');
  await page.locator('h1').click();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('call-count')).toHaveText('1');
  const timeline = page.getByRole('slider', { name: 'Execution timeline' });
  await timeline.focus(); await page.keyboard.press('End');
  await expect(page.getByTestId('move-count')).toHaveText('127 / 127');
  await expect(page.getByTestId('run-status')).toHaveText('Complete');
  await page.getByRole('combobox', { name: 'Number of disks' }).selectOption('3');
  await page.getByRole('button', { name: 'Next step' }).click();
  await page.getByRole('button', { name: 'Next step' }).click();
  await page.getByRole('button', { name: 'Next step' }).click();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByTestId('auto-run')).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Playback speed' })).toBeVisible();
  }
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});
