import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderPage } from '@/test/render';
import { API, product, server } from '@/test/server';
import { ProductFormPage } from './ProductFormPage';

const asAdmin = () =>
  server.use(
    http.get(`${API}/auth/me`, () => HttpResponse.json({ id: 1, email: 'a@shop.kz', role: 'admin' })),
  );

it('проверяет поля и показывает ошибки по-русски', async () => {
  asAdmin();
  const { user } = renderPage(<ProductFormPage />, {
    route: '/admin/products/new',
    path: '/admin/products/new',
    loggedIn: true,
  });
  await user.clear(screen.getByLabelText('Остаток, шт.'));
  await user.type(screen.getByLabelText('Категория'), 'Дом');
  await user.type(screen.getByLabelText('Цена, ₸'), '0');
  await user.type(screen.getByLabelText('Остаток, шт.'), '-1');
  await user.click(screen.getByRole('button', { name: 'Добавить товар' }));
  expect(await screen.findByText('Введите название')).toBeInTheDocument();
  expect(screen.getByText('Латиница в нижнем регистре, например home')).toBeInTheDocument();
  expect(screen.getByText('Цена должна быть больше нуля')).toBeInTheDocument();
  expect(screen.getByText('Остаток — целое число от 0')).toBeInTheDocument();
});

it('цену в тенге отправляет в API в тиынах', async () => {
  asAdmin();
  let body: unknown;
  server.use(
    http.post(`${API}/products`, async ({ request }) => {
      body = await request.json();
      return HttpResponse.json(product({ id: 50 }), { status: 201 });
    }),
  );
  const { user } = renderPage(<ProductFormPage />, {
    route: '/admin/products/new',
    path: '/admin/products/new',
    loggedIn: true,
  });
  await user.type(screen.getByLabelText('Название'), 'Утюг');
  await user.type(screen.getByLabelText('Категория'), 'home');
  await user.type(screen.getByLabelText('Цена, ₸'), '19 990,50');
  await user.clear(screen.getByLabelText('Остаток, шт.'));
  await user.type(screen.getByLabelText('Остаток, шт.'), '5');
  await user.click(screen.getByRole('button', { name: 'Добавить товар' }));
  expect(await screen.findByText('другая страница')).toBeInTheDocument();
  expect(body).toEqual({ name: 'Утюг', category: 'home', price: 1_999_050, stock: 5 });
});

it('редактирование: поля заполнены, цена в тенге', async () => {
  asAdmin();
  server.use(http.get(`${API}/products/3`, () => HttpResponse.json(product({ id: 3, price: 1_249_050 }))));
  renderPage(<ProductFormPage />, {
    route: '/admin/products/3/edit',
    path: '/admin/products/:id/edit',
    loggedIn: true,
  });
  expect(await screen.findByDisplayValue('12490,5')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Чайник Xiaomi Mi Kettle')).toBeInTheDocument();
});
