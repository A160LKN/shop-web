import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderPage } from '@/test/render';
import { API, server } from '@/test/server';
import { Layout } from './Layout';

it('поиск переходит в каталог с запросом', async () => {
  const { user } = renderPage(<Layout />);
  await user.type(screen.getByRole('searchbox', { name: 'Поиск товаров' }), 'кофе');
  await user.click(screen.getByRole('button', { name: 'Найти' }));
  expect(screen.getByTestId('location')).toHaveTextContent('/?q=%D0%BA%D0%BE%D1%84%D0%B5');
});

it('гость видит «Войти», вошедший — «Заказы» и «Выйти», админ — ещё и админку', async () => {
  const guest = renderPage(<Layout />);
  expect(screen.getByRole('link', { name: 'Войти' })).toBeInTheDocument();
  guest.unmount();

  const customer = renderPage(<Layout />, { loggedIn: true });
  expect(await screen.findByRole('button', { name: 'Выйти' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Админка' })).not.toBeInTheDocument();
  customer.unmount();

  server.use(
    http.get(`${API}/auth/me`, () => HttpResponse.json({ id: 1, email: 'a@shop.kz', role: 'admin' })),
  );
  renderPage(<Layout />, { loggedIn: true });
  expect(await screen.findByRole('link', { name: 'Админка' })).toBeInTheDocument();
});

it('счётчик корзины показывает количество товаров', () => {
  localStorage.setItem(
    'duken.cart',
    JSON.stringify([{ productId: 1, name: 'Чайник', category: 'home', price: 100, stock: 9, quantity: 3 }]),
  );
  renderPage(<Layout />);
  expect(screen.getByTestId('cart-count')).toHaveTextContent('3');
});

it('выход сбрасывает вход и ведёт на главную', async () => {
  const { user } = renderPage(<Layout />, { loggedIn: true, route: '/orders' });
  await user.click(await screen.findByRole('button', { name: 'Выйти' }));
  expect(screen.getByRole('link', { name: 'Войти' })).toBeInTheDocument();
  expect(localStorage.getItem('duken.token')).toBeNull();
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
});

it('переключатель темы меняет тему страницы', async () => {
  const { user } = renderPage(<Layout />);
  const before = document.documentElement.dataset.theme;
  await user.click(screen.getByRole('button', { name: /тема/ }));
  expect(document.documentElement.dataset.theme).not.toBe(before);
});
