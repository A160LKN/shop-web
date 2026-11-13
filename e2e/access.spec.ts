import { expect, test } from '@playwright/test';
import { ADMIN, addToCart, login, register } from './helpers';

test.describe('Доступ и админка', () => {
  test('гостя с закрытой страницы отправляют на вход и возвращают обратно', async ({ page }) => {
    await page.goto('/orders');
    await expect(page).toHaveURL(/\/login\?next=%2Forders/);
    await page.getByRole('link', { name: 'Зарегистрироваться' }).click();
    await register(page);
    await page.goto('/orders');
    await expect(page.getByText('Заказов пока нет')).toBeVisible();
  });

  test('после входа не уводит на чужой сайт по ?next=', async ({ page }) => {
    await page.goto('/login?next=//evil.example');
    await page.getByRole('link', { name: 'Зарегистрироваться' }).click();
    await register(page);
    await expect(page).toHaveURL(/localhost/);
  });

  test('покупатель не видит админку', async ({ page }) => {
    await register(page);
    await expect(page.getByRole('link', { name: 'Админка' })).toHaveCount(0);
    await page.goto('/admin/products');
    await expect(page.getByText('Нет доступа')).toBeVisible();
  });

  test('ошибки формы входа — понятным языком', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Войти', exact: true }).click();
    await expect(page.getByText('Введите email')).toBeVisible();
    await page.getByLabel('Email').fill('admin@shop.kz');
    await page.getByLabel('Пароль').fill('wrong-password');
    await page.getByRole('button', { name: 'Войти', exact: true }).click();
    await expect(page.getByText('Неверный email или пароль')).toBeVisible();
  });

  test('админ добавляет товар — он появляется в каталоге', async ({ page }) => {
    const name = `Тестовый товар ${Date.now()}`;
    await login(page, ADMIN.email, ADMIN.password);
    await page.getByRole('link', { name: 'Админка' }).click();
    await page.getByRole('link', { name: 'Товары' }).click();
    await page.getByRole('link', { name: 'Добавить товар' }).click();

    await page.getByLabel('Название').fill(name);
    await page.getByLabel('Категория').fill('home');
    await page.getByLabel('Цена, ₸').fill('abc');
    await page.getByLabel('Остаток, шт.').fill('7');
    await page.getByRole('button', { name: 'Добавить товар' }).click();
    await expect(page.getByText('Цена — число, например 12490 или 12490,50')).toBeVisible();

    await page.getByLabel('Цена, ₸').fill('4 990,50');
    await page.getByRole('button', { name: 'Добавить товар' }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);

    await page.goto(`/?q=${encodeURIComponent(name)}`);
    await expect(page.getByTestId('product-card')).toContainText(name);
    await expect(page.getByTestId('price')).toContainText(/4\s990,5/);
  });

  test('админ отправляет и доставляет оплаченный заказ', async ({ page, browser }) => {
    // покупатель в отдельном контексте браузера оформляет и оплачивает заказ
    const customer = await browser.newPage();
    await register(customer);
    await addToCart(customer, 'зонт');
    await customer.goto('/checkout');
    await customer.getByRole('button', { name: 'Подтвердить заказ' }).click();
    await customer.getByRole('button', { name: /Оплатить/ }).click();
    await expect(customer.getByTestId('order-status')).toHaveText('Оплачен');
    const orderUrl = customer.url();
    const orderId = /orders\/(\d+)/.exec(orderUrl)?.[1];
    await customer.close();

    await login(page, ADMIN.email, ADMIN.password);
    await page.goto(`/orders/${orderId}`);
    await page.getByRole('button', { name: 'Отметить отправленным' }).click();
    await expect(page.getByTestId('order-status')).toHaveText('Отправлен');
    await page.getByRole('button', { name: 'Отметить доставленным' }).click();
    await expect(page.getByTestId('order-status')).toHaveText('Доставлен');
  });

  test('админ видит сводку: выручку и график за неделю', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.getByRole('link', { name: 'Админка' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByTestId('kpi-revenue')).toBeVisible();
    await expect(page.getByTestId('revenue-bar')).toHaveCount(7);
    await page.getByRole('link', { name: 'Оплачен' }).click();
    await expect(page).toHaveURL(/\/admin\/orders\?status=paid/);
  });

  test('корзина гостя сохраняется после входа', async ({ page }) => {
    await addToCart(page, 'зонт');
    await register(page);
    await expect(page.getByTestId('cart-count')).toHaveText('1');
  });
});
