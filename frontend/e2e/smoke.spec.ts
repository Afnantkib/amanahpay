import { expect, test } from '@playwright/test';
test('marketing page and language switch render', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByRole('heading', { name: /sell more/i })).toBeVisible();
  await page.getByRole('button', { name: /language/i }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});
test('merchant workspace loads demo data', async ({ page }) => {
  await page.goto('/en/app');
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
});
