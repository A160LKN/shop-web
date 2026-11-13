import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderPage } from '@/test/render';
import { API, appError, order, server } from '@/test/server';
import { OrderPage } from './OrderPage';

const asAdmin = () =>
  server.use(
    http.get(`${API}/auth/me`, () => HttpResponse.json({ id: 1, email: 'a@shop.kz', role: 'admin' })),
  );

it('показывает состав, суммы и шкалу статуса', async () => {
  server.use(http.get(`${API}/orders/7`, () => HttpResponse.json(order({ status: 'paid' }))));
  renderPage(<OrderPage />, { route: '/orders/7', path: '/orders/:id', loggedIn: true });
  expect(await screen.findByRole('heading', { name: 'Заказ №7' })).toBeInTheDocument();
  expect(screen.getByText('Чайник Xiaomi Mi Kettle')).toBeInTheDocument();
  expect(screen.getByTestId('order-status')).toHaveTextContent('Оплачен');
  expect(screen.getByRole('list', { name: 'Путь заказа' })).toBeInTheDocument();
});

it('отмена — только после подтверждения, с суммой возврата', async () => {
  let cancelled = false;
  server.use(
    http.get(`${API}/orders/7`, () => HttpResponse.json(order({ status: 'paid' }))),
    http.post(`${API}/orders/7/cancel`, () => {
      cancelled = true;
      return HttpResponse.json(order({ status: 'cancelled' }));
    }),
  );
  const { user } = renderPage(<OrderPage />, { route: '/orders/7', path: '/orders/:id', loggedIn: true });
  await user.click(await screen.findByRole('button', { name: 'Отменить заказ' }));
  expect(cancelled).toBe(false);
  expect(screen.getByText(/24\s980\s₸ вернутся на карту/)).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Не отменять' }));
  expect(screen.queryByText(/вернутся на карту/)).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Отменить заказ' }));
  await user.click(screen.getByRole('button', { name: 'Да, отменить' }));
  expect(await screen.findByTestId('order-status')).toHaveTextContent('Отменён');
  expect(cancelled).toBe(true);
});

it('ошибка отмены видна пользователю', async () => {
  server.use(
    http.get(`${API}/orders/7`, () => HttpResponse.json(order({ status: 'paid' }))),
    http.post(`${API}/orders/7/cancel`, () =>
      appError(
        502,
        'refund_unavailable',
        'Не удалось вернуть деньги: платёжный сервис не отвечает. Заказ не отменён',
      ),
    ),
  );
  const { user } = renderPage(<OrderPage />, { route: '/orders/7', path: '/orders/:id', loggedIn: true });
  await user.click(await screen.findByRole('button', { name: 'Отменить заказ' }));
  await user.click(screen.getByRole('button', { name: 'Да, отменить' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Заказ не отменён');
});

it('администратор видит следующее действие по заказу, покупатель — нет', async () => {
  server.use(http.get(`${API}/orders/7`, () => HttpResponse.json(order({ status: 'paid' }))));
  const view = renderPage(<OrderPage />, { route: '/orders/7', path: '/orders/:id', loggedIn: true });
  await screen.findByRole('heading', { name: 'Заказ №7' });
  expect(screen.queryByRole('button', { name: 'Отметить отправленным' })).not.toBeInTheDocument();
  view.unmount();

  asAdmin();
  renderPage(<OrderPage />, { route: '/orders/7', path: '/orders/:id', loggedIn: true });
  expect(await screen.findByRole('button', { name: 'Отметить отправленным' })).toBeInTheDocument();
});

it('чужой или несуществующий заказ — «не найден»', async () => {
  server.use(http.get(`${API}/orders/99`, () => appError(404, 'not_found', 'Заказ не найден')));
  renderPage(<OrderPage />, { route: '/orders/99', path: '/orders/:id', loggedIn: true });
  expect(await screen.findByText('Заказ не найден')).toBeInTheDocument();
});
