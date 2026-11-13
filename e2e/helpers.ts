import { expect, type Page } from '@playwright/test';

export const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? 'admin@shop.kz',
  password: process.env.ADMIN_PASSWORD ?? 'admin12345',
};
export const PASSWORD = 'e2e-password-123';

/** Уникальный email: тесты идут параллельно против общей базы и не мешают друг другу */
export const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@test.kz`;

/** Цены форматируются с неразрывными пробелами — для сравнения заменяем их обычными */
export const plain = (text: string | null) => (text ?? '').replace(/[\u00a0\u202f]/g, ' ');

export async function register(page: Page, email = uniqueEmail()) {
  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(PASSWORD);
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible();
  return email;
}

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible();
}

/** Добавляет в корзину первый товар в наличии из поиска */
export async function addToCart(page: Page, search: string) {
  await page.goto(`/?q=${encodeURIComponent(search)}`);
  const card = page.getByTestId('product-card').first();
  await card.getByRole('button', { name: /в корзину/i }).click();
}
