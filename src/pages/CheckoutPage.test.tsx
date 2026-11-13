import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderPage } from '@/test/render';
import { API, appError, order, server } from '@/test/server';
import { CheckoutPage } from './CheckoutPage';

const cartWith = (quantity: number) =>
  localStorage.setItem(
    'duken.cart',
    JSON.stringify([
      { productId: 1, name: 'Чайник', category: 'home', price: 12_490_00, stock: 40, quantity },
    ]),
  );

it('пустая корзина — обратно в корзину', () => {
  renderPage(<CheckoutPage />, { route: '/checkout', path: '/checkout', loggedIn: true });
  expect(screen.getByTestId('location')).toHaveTextContent('/cart');
});

const quoteOk = (discount = 0, promo: string | null = null) =>
  http.post(`${API}/orders/quote`, async ({ request }) => {
    const body = (await request.json()) as { promo_code: string | null };
    const applied = body.promo_code ? promo : null;
    const d = applied ? discount : 0;
    return HttpResponse.json({ subtotal: 24_980_00, discount: d, total: 24_980_00 - d, promo_code: applied });
  });

it('сразу показывает итог, посчитанный сервером', async () => {
  cartWith(2);
  server.use(quoteOk());
  renderPage(<CheckoutPage />, { route: '/checkout', path: '/checkout', loggedIn: true });
  expect(await screen.findByRole('button', { name: /Подтвердить заказ на 24\s980\s₸/ })).toBeInTheDocument();
});

it('«Применить» показывает скидку до создания заказа, заказ уходит с этим промокодом', async () => {
  cartWith(2);
  let orderBody: unknown;
  server.use(
    quoteOk(2_498_00, 'WELCOME10'),
    http.post(`${API}/orders`, async ({ request }) => {
      orderBody = await request.json();
      return HttpResponse.json(order({ discount: 2_498_00, total: 22_482_00, promo_code: 'WELCOME10' }), {
        status: 201,
      });
    }),
  );
  const { user } = renderPage(<CheckoutPage />, { route: '/checkout', path: '/checkout', loggedIn: true });
  await user.type(screen.getByLabelText('Промокод'), 'welcome10');
  await user.click(screen.getByRole('button', { name: 'Применить' }));

  expect(await screen.findByText('Промокод WELCOME10 применён')).toBeInTheDocument();
  expect(screen.getByTestId('discount').textContent).toMatch(/2\s498/);
  expect(orderBody).toBeUndefined(); // заказ ещё не создан

  await user.click(screen.getByRole('button', { name: /Подтвердить заказ на 22\s482\s₸/ }));
  expect(await screen.findByRole('heading', { name: 'Заказ №7 создан' })).toBeInTheDocument();
  expect(orderBody).toEqual({ items: [{ product_id: 1, quantity: 2 }], promo_code: 'WELCOME10' });
  expect(JSON.parse(localStorage.getItem('duken.cart') ?? '[]')).toEqual([]);
});

it('Enter в поле промокода применяет его, а не создаёт заказ', async () => {
  cartWith(1);
  let ordered = false;
  server.use(
    quoteOk(1_000_00, 'SALE'),
    http.post(`${API}/orders`, () => {
      ordered = true;
      return HttpResponse.json(order(), { status: 201 });
    }),
  );
  const { user } = renderPage(<CheckoutPage />, { route: '/checkout', path: '/checkout', loggedIn: true });
  await user.type(screen.getByLabelText('Промокод'), 'sale{Enter}');
  expect(await screen.findByText('Промокод SALE применён')).toBeInTheDocument();
  expect(ordered).toBe(false);
});

it('промокод не подошёл — ошибка у поля, скидки нет', async () => {
  cartWith(1);
  server.use(
    http.post(`${API}/orders/quote`, async ({ request }) => {
      const body = (await request.json()) as { promo_code: string | null };
      return body.promo_code
        ? appError(422, 'promo_invalid', 'Срок действия промокода истёк')
        : HttpResponse.json({ subtotal: 12_490_00, discount: 0, total: 12_490_00, promo_code: null });
    }),
  );
  const { user } = renderPage(<CheckoutPage />, { route: '/checkout', path: '/checkout', loggedIn: true });
  await user.type(screen.getByLabelText('Промокод'), 'OLD');
  await user.click(screen.getByRole('button', { name: 'Применить' }));
  expect(await screen.findByText('Срок действия промокода истёк')).toBeInTheDocument();
  expect(screen.getByLabelText('Промокод')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.queryByTestId('discount')).not.toBeInTheDocument();
});

it('после изменения промокода прежняя скидка снимается', async () => {
  cartWith(2);
  server.use(quoteOk(2_498_00, 'WELCOME10'));
  const { user } = renderPage(<CheckoutPage />, { route: '/checkout', path: '/checkout', loggedIn: true });
  await user.type(screen.getByLabelText('Промокод'), 'welcome10');
  await user.click(screen.getByRole('button', { name: 'Применить' }));
  await screen.findByTestId('discount');
  await user.type(screen.getByLabelText('Промокод'), 'x');
  expect(screen.queryByTestId('discount')).not.toBeInTheDocument();
});

it('товара не хватает — сразу, ещё до подтверждения; подтвердить нельзя', async () => {
  cartWith(5);
  server.use(
    http.post(`${API}/orders/quote`, () =>
      appError(409, 'out_of_stock', 'Недостаточно товара «Чайник»: в наличии 3, в заказе 5'),
    ),
  );
  renderPage(<CheckoutPage />, { route: '/checkout', path: '/checkout', loggedIn: true });
  expect(await screen.findByRole('alert')).toHaveTextContent('в наличии 3, в заказе 5');
  expect(screen.getByRole('button', { name: /Подтвердить заказ/ })).toBeDisabled();
  expect(screen.getByRole('link', { name: 'Изменить корзину' })).toHaveAttribute('href', '/cart');
});
