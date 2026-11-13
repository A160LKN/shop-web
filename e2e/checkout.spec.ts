import { expect, test } from '@playwright/test';
import { addToCart, login, plain, register, uniqueEmail, PASSWORD } from './helpers';

test.describe('Оформление и оплата', () => {
  test('гость → вход → заказ с промокодом → отказ банка → оплата другой картой', async ({ page }) => {
    await addToCart(page, 'кофе в зёрнах');
    await page.getByTestId('cart-link').click();
    await page.getByRole('button', { name: 'Войти и оформить' }).click();
    await expect(page).toHaveURL(/\/login\?next=%2Fcheckout/);

    // нового покупателя регистрируем со страницы входа — после регистрации возвращаемся к оформлению
    await page.getByRole('link', { name: 'Зарегистрироваться' }).click();
    await page.getByLabel('Email').fill(uniqueEmail());
    await page.getByLabel('Пароль').fill(PASSWORD);
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
    await expect(page.getByRole('heading', { name: 'Оформление заказа' })).toBeVisible();

    // скидка видна до создания заказа
    await page.getByLabel('Промокод').fill('welcome10');
    await page.getByRole('button', { name: 'Применить' }).click();
    await expect(page.getByText('Промокод WELCOME10 применён')).toBeVisible();
    await page.getByRole('button', { name: /Подтвердить заказ на 8\s991/ }).click();
    await expect(page.getByRole('heading', { name: /Заказ №\d+ создан/ })).toBeVisible();
    expect(plain(await page.getByTestId('discount').textContent())).toBe('−999 ₸');
    expect(plain(await page.getByTestId('order-total').textContent())).toBe('8 991 ₸');
    await expect(page.getByTestId('cart-count')).toHaveCount(0); // корзина очищена: товар уже за заказом

    await page.getByLabel(/Mastercard/).check();
    await page.getByRole('button', { name: /Оплатить/ }).click();
    await expect(page.getByText(/Оплата отклонена: недостаточно средств/)).toBeVisible();

    await page.getByLabel(/Visa •••• 4242/).check();
    await page.getByRole('button', { name: /Оплатить/ }).click();
    await expect(page.getByText('Оплата прошла. Спасибо за заказ!')).toBeVisible();
    await expect(page.getByTestId('order-status')).toHaveText('Оплачен');

    await page.getByRole('link', { name: 'Заказы' }).click();
    await expect(page.getByTestId('order-row').first()).toContainText('Оплачен');
  });

  test('неверный промокод — ошибка у поля, заказ не создаётся', async ({ page }) => {
    await register(page);
    await addToCart(page, 'курт');
    await page.goto('/checkout');
    await page.getByLabel('Промокод').fill('NOPE');
    await page.getByRole('button', { name: 'Применить' }).click();
    await expect(page.getByText('Промокод не найден')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Оформление заказа' })).toBeVisible();
  });

  test('шлюз не отвечает — честное сообщение, заказ ждёт оплаты', async ({ page }) => {
    test.setTimeout(30_000);
    await register(page);
    await addToCart(page, 'курт');
    await page.goto('/checkout');
    await page.getByRole('button', { name: 'Подтвердить заказ' }).click();
    await page.getByLabel(/Visa •••• 0119/).check();
    await page.getByRole('button', { name: /Оплатить/ }).click();
    await expect(page.getByRole('button', { name: /Связываемся с банком/ })).toBeVisible();
    await expect(page.getByText(/Деньги не списаны/)).toBeVisible({ timeout: 15_000 });
  });

  test('отмена оплаченного заказа возвращает деньги', async ({ page }) => {
    await register(page);
    await addToCart(page, 'чай');
    await page.goto('/checkout');
    await page.getByRole('button', { name: 'Подтвердить заказ' }).click();
    await page.getByRole('button', { name: /Оплатить/ }).click();
    await expect(page.getByTestId('order-status')).toHaveText('Оплачен');

    await page.getByRole('button', { name: 'Отменить заказ' }).click();
    await expect(page.getByText(/вернутся на карту/)).toBeVisible();
    await page.getByRole('button', { name: 'Да, отменить' }).click();
    await expect(page.getByTestId('order-status')).toHaveText('Отменён');
  });

  test('после выхода и входа заказы на месте', async ({ page }) => {
    const email = await register(page);
    await addToCart(page, 'мёд');
    await page.goto('/checkout');
    await page.getByRole('button', { name: 'Подтвердить заказ' }).click();
    await expect(page.getByRole('heading', { name: /создан/ })).toBeVisible();

    await page.getByRole('button', { name: 'Выйти' }).click();
    await login(page, email, PASSWORD);
    await page.goto('/orders');
    await expect(page.getByTestId('order-row')).toHaveCount(1);
  });
});
