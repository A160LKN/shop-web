import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderPage } from '@/test/render';
import { API, server } from '@/test/server';
import { RequireAdmin, RequireAuth } from './guards';

it('гостя отправляет на вход и запоминает, куда он шёл', () => {
  renderPage(<RequireAuth>секрет</RequireAuth>, { route: '/orders/5?x=1', path: '/orders/:id' });
  expect(screen.queryByText('секрет')).not.toBeInTheDocument();
  expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Forders%2F5%3Fx%3D1');
});

it('вошедшему показывает страницу', async () => {
  renderPage(<RequireAuth>секрет</RequireAuth>, { loggedIn: true, path: '/' });
  expect(await screen.findByText('секрет')).toBeInTheDocument();
});

it('покупателю админку не показывает', async () => {
  renderPage(<RequireAdmin>админка</RequireAdmin>, { loggedIn: true, path: '/' });
  expect(await screen.findByText('Нет доступа')).toBeInTheDocument();
  expect(screen.queryByText('админка')).not.toBeInTheDocument();
});

it('администратору показывает', async () => {
  server.use(
    http.get(`${API}/auth/me`, () => HttpResponse.json({ id: 1, email: 'a@shop.kz', role: 'admin' })),
  );
  renderPage(<RequireAdmin>админка</RequireAdmin>, { loggedIn: true, path: '/' });
  expect(await screen.findByText('админка')).toBeInTheDocument();
});

it('истёкший токен — выход и переход на вход, а не «полувошедший» интерфейс', async () => {
  server.use(
    http.get(`${API}/auth/me`, () =>
      HttpResponse.json(
        { error: { code: 'token_expired', message: 'Срок действия токена истёк' } },
        { status: 401 },
      ),
    ),
  );
  renderPage(<RequireAuth>секрет</RequireAuth>, { loggedIn: true, route: '/orders', path: '/orders' });
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Forders'));
  expect(localStorage.getItem('duken.token')).toBeNull();
});
