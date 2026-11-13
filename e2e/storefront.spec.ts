import { expect, test } from '@playwright/test';
import { addToCart, plain } from './helpers';

test.describe('Витрина', () => {
  test('каталог: поиск, категория и карточка товара', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Каталог' })).toBeVisible();
    await expect(page.getByTestId('product-card').first()).toBeVisible();

    await page.getByRole('searchbox', { name: 'Поиск товаров' }).fill('чайник');
    await page.getByRole('button', { name: 'Найти' }).click();
    await expect(page).toHaveURL(/q=%D1%87%D0%B0%D0%B9%D0%BD%D0%B8%D0%BA/);
    await expect(page.getByRole('heading', { name: 'Поиск: «чайник»' })).toBeVisible();
    await expect(page.getByTestId('product-card')).toContainText(['Чайник']);

    await page
      .getByRole('link', { name: /Для дома/ })
      .first()
      .click();
    await expect(page).toHaveURL(/category=home/);

    await page.getByTestId('product-card').first().getByRole('link').click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('article').first().getByTestId('price').first()).toBeVisible();
  });

  test('поиск без результатов показывает понятное пустое состояние', async ({ page }) => {
    await page.goto('/?q=такого-товара-точно-нет');
    await expect(page.getByText('Ничего не нашлось')).toBeVisible();
    await page.getByRole('link', { name: 'Смотреть все товары' }).click();
    await expect(page.getByTestId('product-card').first()).toBeVisible();
  });

  test('несуществующий товар и страница — 404 без падения', async ({ page }) => {
    await page.goto('/products/999999');
    await expect(page.getByText('Товар не найден')).toBeVisible();
    await page.goto('/no-such-page');
    await expect(page.getByText('Страница не найдена')).toBeVisible();
  });

  test('корзина: количество, сумма, удаление, сохранение после перезагрузки', async ({ page }) => {
    await addToCart(page, 'кофе в зёрнах');
    await addToCart(page, 'курт');
    await expect(page.getByTestId('cart-count')).toHaveText('2');

    await page.getByTestId('cart-link').click();
    const lines = page.getByTestId('cart-line');
    await expect(lines).toHaveCount(2);

    // 9 990 ₸ × 2 + 2 490 ₸ = 22 470 ₸
    await lines.filter({ hasText: 'Кофе' }).getByRole('button', { name: 'Больше' }).click();
    await expect(page.getByTestId('cart-subtotal')).toHaveText(/22\s470/);

    await page.reload();
    await expect(page.getByTestId('cart-count')).toHaveText('3');

    await lines
      .filter({ hasText: 'Курт' })
      .getByRole('button', { name: /Убрать/ })
      .click();
    expect(plain(await page.getByTestId('cart-subtotal').textContent())).toBe('19 980 ₸');
  });

  test('товар без остатка нельзя добавить в корзину', async ({ page }) => {
    await page.goto('/?q=powerbank');
    const card = page.getByTestId('product-card').first();
    await expect(card.getByText('Нет в наличии').first()).toBeVisible();
    await expect(card.getByRole('button')).toBeDisabled();
  });

  test('тёмная тема сохраняется после перезагрузки', async ({ page }) => {
    await page.goto('/');
    const before = await page.locator('html').getAttribute('data-theme');
    await page.getByRole('button', { name: /тема/ }).click();
    await page.reload();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', before ?? '');
  });
});

test.describe('Сортировка и фильтры', () => {
  test('сортировка по цене, «только в наличии» и диапазон цен', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Сортировка' }).selectOption('price_asc');
    await expect(page).toHaveURL(/sort=price_asc/);
    const prices = async () =>
      (await page.getByTestId('price').allTextContents()).map((t) =>
        Number(t.replace(/[^\d,]/g, '').replace(',', '.')),
      );
    await expect(page.getByTestId('product-card').first()).toBeVisible();
    const sorted = await prices();
    expect(sorted).toEqual([...sorted].sort((a, b) => a - b));

    // флажок управляется адресом страницы — ждём результат, а не мгновенное переключение
    await page.getByRole('checkbox', { name: 'Только в наличии' }).click();
    await expect(page).toHaveURL(/in_stock=1/);
    await expect(page.getByRole('checkbox', { name: 'Только в наличии' })).toBeChecked();
    await expect(page.getByTestId('product-card').filter({ hasText: 'Нет в наличии' })).toHaveCount(0);

    await page.getByLabel('Цена от, тенге').fill('10000');
    await page.getByLabel('Цена до, тенге').fill('20000');
    await page.getByRole('button', { name: 'Показать' }).click();
    await expect(page).toHaveURL(/min=10000&max=20000/);
    await page.waitForLoadState('networkidle'); // список под новые условия загружен
    for (const price of await prices()) {
      expect(price).toBeGreaterThanOrEqual(10000);
      expect(price).toBeLessThanOrEqual(20000);
    }
  });

  test('фильтры переживают перезагрузку и кнопку «Назад»', async ({ page }) => {
    await page.goto('/?sort=price_desc&in_stock=1');
    await expect(page.getByRole('combobox', { name: 'Сортировка' })).toHaveValue('price_desc');
    await page.getByTestId('product-card').first().getByRole('link').click();
    await page.goBack();
    await expect(page.getByRole('checkbox', { name: 'Только в наличии' })).toBeChecked();
  });

  test('на карточке после добавления — счётчик и уведомление', async ({ page }) => {
    await page.goto('/?q=курт');
    const card = page.getByTestId('product-card').first();
    await card.getByRole('button', { name: /в корзину/i }).click();
    await expect(page.getByTestId('toast')).toContainText('в корзине');
    await card.getByRole('button', { name: 'Больше' }).click();
    await expect(page.getByTestId('cart-count')).toHaveText('2');
  });

  test('страница товара: хлебные крошки и похожие товары', async ({ page }) => {
    await page.goto('/?q=чайник');
    await page.getByTestId('product-card').first().getByRole('link').click();
    await expect(page.getByRole('navigation', { name: 'Хлебные крошки' })).toContainText('Для дома');
    await expect(page.getByRole('heading', { name: 'Похожие товары' })).toBeVisible();
  });
});
