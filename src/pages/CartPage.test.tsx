import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderPage } from '@/test/render';
import { API, appError, product, server } from '@/test/server';
import { CartPage } from './CartPage';

const putInCart = (items: { id: number; name: string; price: number; quantity: number; stock?: number }[]) =>
  localStorage.setItem(
    'duken.cart',
    JSON.stringify(
      items.map((i) => ({
        productId: i.id,
        name: i.name,
        category: 'home',
        price: i.price,
        stock: i.stock ?? 50,
        quantity: i.quantity,
      })),
    ),
  );

it('пустая корзина ведёт в каталог', () => {
  renderPage(<CartPage />);
  expect(screen.getByText('Корзина пуста')).toBeInTheDocument();
});

it('сумма и количество', () => {
  putInCart([
    { id: 1, name: 'Чайник', price: 12_490_00, quantity: 2 },
    { id: 2, name: 'Курт', price: 2_490_00, quantity: 1 },
  ]);
  server.use(
    http.get(`${API}/products/:id`, ({ params }) =>
      HttpResponse.json(
        Number(params.id) === 1 ? product({ id: 1, price: 12_490_00 }) : product({ id: 2, price: 2_490_00 }),
      ),
    ),
  );
  renderPage(<CartPage />);
  expect(screen.getByText('3 товара')).toBeInTheDocument();
  expect(screen.getByTestId('cart-subtotal').textContent.replace(/\s/g, ' ')).toBe('27 470 ₸');
});

it('цена изменилась, пока товар лежал в корзине, — предупреждаем и пересчитываем', async () => {
  putInCart([{ id: 1, name: 'Чайник', price: 10_000_00, quantity: 1 }]);
  server.use(http.get(`${API}/products/1`, () => HttpResponse.json(product({ price: 12_000_00 }))));
  renderPage(<CartPage />);
  expect(await screen.findByText(/Цена изменилась: была 10\s000\s₸/)).toBeInTheDocument();
  expect(screen.getByTestId('cart-subtotal').textContent.replace(/\s/g, ' ')).toBe('12 000 ₸');
  expect(screen.getByRole('button', { name: 'Войти и оформить' })).toBeEnabled();
});

it('товар сняли с продажи — оформить нельзя, пока его не убрать', async () => {
  putInCart([{ id: 9, name: 'Старый товар', price: 1_000_00, quantity: 1 }]);
  server.use(http.get(`${API}/products/9`, () => appError(404, 'not_found', 'Товар не найден')));
  const { user } = renderPage(<CartPage />);
  expect(await screen.findByText('Товар сняли с продажи')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Войти и оформить' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: /Убрать/ }));
  expect(screen.getByText('Корзина пуста')).toBeInTheDocument();
});

it('товара стало меньше — количество не меняем молча, а предупреждаем', async () => {
  putInCart([{ id: 1, name: 'Чайник', price: 12_490_00, quantity: 5 }]);
  server.use(http.get(`${API}/products/1`, () => HttpResponse.json(product({ stock: 2 }))));
  renderPage(<CartPage />);
  expect(await screen.findByText('В наличии только 2 шт.')).toBeInTheDocument();
  expect(screen.getByTestId('quantity')).toHaveTextContent('5');
  expect(screen.getByRole('button', { name: 'Войти и оформить' })).toBeDisabled();
});

it('гостя «Войти и оформить» отправляет на вход с возвратом к оформлению', async () => {
  putInCart([{ id: 1, name: 'Чайник', price: 12_490_00, quantity: 1 }]);
  const { user } = renderPage(<CartPage />);
  await user.click(screen.getByRole('button', { name: 'Войти и оформить' }));
  expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fcheckout');
});
