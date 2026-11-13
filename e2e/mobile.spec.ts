import { expect, test } from '@playwright/test';
import { addToCart } from './helpers';

test('на телефоне нет горизонтальной прокрутки, категории листаются лентой', async ({ page }) => {
  for (const path of ['/', '/products/1', '/cart', '/login']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `горизонтальная прокрутка на ${path}`).toBeLessThanOrEqual(0);
  }
});

test('на телефоне можно добавить товар и открыть корзину', async ({ page }) => {
  await addToCart(page, 'кофе в зёрнах');
  await page.getByTestId('cart-link').click();
  await expect(page.getByTestId('cart-line')).toHaveCount(1);
});
