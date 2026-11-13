import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderPage } from '@/test/render';
import { API, order, server } from '@/test/server';
import { AdminOrdersPage } from './AdminOrdersPage';

const many = (count: number, from = 100) =>
  Array.from({ length: count }, (_, i) => order({ id: from - i, status: 'paid' }));

it('статус и страница из адреса уходят в API', async () => {
  let url: URL | undefined;
  server.use(
    http.get(`${API}/orders`, ({ request }) => {
      url = new URL(request.url);
      return HttpResponse.json(many(3));
    }),
  );
  renderPage(<AdminOrdersPage />, { route: '/admin/orders?status=paid&page=2', loggedIn: true });
  await screen.findAllByTestId('admin-order-row');
  expect(url?.searchParams.get('status')).toBe('paid');
  expect(url?.searchParams.get('offset')).toBe('20');
  expect(url?.searchParams.get('limit')).toBe('21');
});

it('есть следующая страница, только если сервер вернул лишний заказ', async () => {
  server.use(http.get(`${API}/orders`, () => HttpResponse.json(many(21))));
  const { user } = renderPage(<AdminOrdersPage />, { route: '/admin/orders', loggedIn: true });
  expect(await screen.findAllByTestId('admin-order-row')).toHaveLength(20);
  expect(screen.getByRole('button', { name: 'Новее' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Старше' }));
  expect(screen.getByTestId('location')).toHaveTextContent('page=2');
});

it('отправка заказа — уведомление с номером', async () => {
  server.use(
    http.get(`${API}/orders`, () => HttpResponse.json([order({ id: 5, status: 'paid' })])),
    http.post(`${API}/orders/5/ship`, () => HttpResponse.json(order({ id: 5, status: 'shipped' }))),
  );
  const { user } = renderPage(<AdminOrdersPage />, { route: '/admin/orders', loggedIn: true });
  await user.click(await screen.findByRole('button', { name: 'Отправить' }));
  expect(await screen.findByTestId('toast')).toHaveTextContent('Заказ №5 отправлен');
});

it('смена статуса в фильтре сбрасывает страницу', async () => {
  server.use(http.get(`${API}/orders`, () => HttpResponse.json(many(2))));
  const { user } = renderPage(<AdminOrdersPage />, { route: '/admin/orders?page=3', loggedIn: true });
  await user.selectOptions(await screen.findByRole('combobox', { name: 'Статус' }), 'cancelled');
  expect(screen.getByTestId('location')).toHaveTextContent('/admin/orders?status=cancelled');
});
