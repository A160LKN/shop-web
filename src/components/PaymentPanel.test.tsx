import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderPage } from '@/test/render';
import { API, appError, order, server } from '@/test/server';
import { PaymentPanel } from './PaymentPanel';

it('отправляет выбранную тестовую карту и сообщает об успехе', async () => {
  let body: unknown;
  server.use(
    http.post(`${API}/orders/7/pay`, async ({ request }) => {
      body = await request.json();
      return HttpResponse.json(order({ status: 'paid' }));
    }),
  );
  const onPaid = vi.fn();
  const { user } = renderPage(<PaymentPanel order={order()} onPaid={onPaid} />, { loggedIn: true });
  await user.click(screen.getByLabelText(/Mastercard/));
  await user.click(screen.getByRole('button', { name: /Оплатить 24\s980\s₸/ }));
  await vi.waitFor(() => expect(onPaid).toHaveBeenCalledWith(expect.objectContaining({ status: 'paid' })));
  expect(body).toEqual({ card_token: 'tok_declined' });
});

it('отказ банка — понятно, что деньги не списаны и что делать', async () => {
  server.use(
    http.post(`${API}/orders/7/pay`, () =>
      appError(402, 'payment_declined', 'Оплата отклонена: недостаточно средств'),
    ),
  );
  const { user } = renderPage(<PaymentPanel order={order()} onPaid={vi.fn()} />, { loggedIn: true });
  await user.click(screen.getByRole('button', { name: /Оплатить/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Оплата отклонена: недостаточно средств. Деньги не списаны — выберите другую карту.',
  );
});

it('шлюз не ответил — предупреждение, кнопка снова доступна для повтора', async () => {
  server.use(
    http.post(`${API}/orders/7/pay`, () =>
      appError(
        502,
        'payment_unavailable',
        'Платёжный сервис не отвечает. Деньги не списаны — попробуйте ещё раз позже',
      ),
    ),
  );
  const { user } = renderPage(<PaymentPanel order={order()} onPaid={vi.fn()} />, { loggedIn: true });
  await user.click(screen.getByRole('button', { name: /Оплатить/ }));
  expect(await screen.findByText(/Деньги не списаны — попробуйте ещё раз позже/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Оплатить/ })).toBeEnabled();
});

it('пока идёт оплата, кнопка занята — двойной клик не отправит два запроса', async () => {
  let calls = 0;
  server.use(
    http.post(`${API}/orders/7/pay`, async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return HttpResponse.json(order({ status: 'paid' }));
    }),
  );
  const { user } = renderPage(<PaymentPanel order={order()} onPaid={vi.fn()} />, { loggedIn: true });
  const button = screen.getByRole('button', { name: /Оплатить/ });
  await user.dblClick(button);
  expect(await screen.findByRole('button', { name: /Связываемся с банком/ })).toBeDisabled();
  await vi.waitFor(() => expect(calls).toBe(1));
});
