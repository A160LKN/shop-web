import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, login, register } from './helpers';

/** Доступность по WCAG 2.1 AA: контраст, подписи, роли, работа с клавиатуры. */
async function audit(page: Page, name: string) {
  await page.waitForTimeout(300); // ждём конца плавных переходов цвета
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const report = violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.length})\n  ${v.nodes[0]?.target.join(' ')}`,
  );
  expect(report, `${name}: нарушения доступности`).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`доступность — тема ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('витрина, корзина и заказы', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading').first()).toBeVisible();
      await audit(page, 'каталог');
      await page
        .getByRole('link')
        .filter({ has: page.getByRole('heading') })
        .first()
        .click();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await audit(page, 'карточка товара');
      await page.goto('/login');
      await audit(page, 'вход');
      await register(page);
      await page.goto('/cart');
      await audit(page, 'корзина');
      await page.goto('/orders');
      await audit(page, 'мои заказы');
    });

    test('админка', async ({ page }) => {
      await login(page, ADMIN.email, ADMIN.password);
      for (const path of ['/admin', '/admin/orders', '/admin/products', '/admin/products/new']) {
        await page.goto(path);
        await expect(page.getByRole('heading').first()).toBeVisible();
        await audit(page, path);
      }
    });
  });
}
