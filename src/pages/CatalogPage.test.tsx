import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderPage } from '@/test/render';
import { API, appError, page, product, server } from '@/test/server';
import { CatalogPage } from './CatalogPage';

it('показывает товары с ценой и количеством', async () => {
  server.use(
    http.get(`${API}/products`, () =>
      HttpResponse.json(page([product(), product({ id: 2, name: 'Наушники JBL', category: 'electronics' })])),
    ),
  );
  renderPage(<CatalogPage />);
  expect(await screen.findByText('Наушники JBL')).toBeInTheDocument();
  expect(screen.getAllByTestId('product-card')).toHaveLength(2);
  expect(screen.getByTestId('total')).toHaveTextContent('2 товара');
});

it('передаёт в API поиск, категорию и страницу из адреса', async () => {
  let url: URL | undefined;
  server.use(
    http.get(`${API}/products`, ({ request }) => {
      url = new URL(request.url);
      return HttpResponse.json(page([product()], 30));
    }),
  );
  renderPage(<CatalogPage />, { route: '/?q=чай&category=food&page=2' });
  expect(await screen.findByText('2 из 3')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Поиск: «чай»' })).toBeInTheDocument();
  expect(url?.searchParams.get('q')).toBe('чай');
  expect(url?.searchParams.get('category')).toBe('food');
  expect(url?.searchParams.get('offset')).toBe('12');
});

it('пустой результат — подсказка, а не пустой экран', async () => {
  server.use(http.get(`${API}/products`, () => HttpResponse.json(page([]))));
  renderPage(<CatalogPage />, { route: '/?q=нет' });
  expect(await screen.findByText('Ничего не нашлось')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Смотреть все товары' })).toHaveAttribute('href', '/');
});

it('ошибка сервера — сообщение и кнопка «Повторить», которая работает', async () => {
  let calls = 0;
  server.use(
    http.get(`${API}/products`, () => {
      calls += 1;
      return calls === 1
        ? appError(503, 'overloaded', 'Сервис перегружен')
        : HttpResponse.json(page([product()]));
    }),
  );
  const { user } = renderPage(<CatalogPage />);
  expect(await screen.findByText('Сервис перегружен')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Повторить' }));
  expect(await screen.findByTestId('product-card')).toBeInTheDocument();
});

it('категории — по алфавиту русских названий, с количеством', async () => {
  renderPage(<CatalogPage />);
  const nav = await screen.findByRole('navigation', { name: 'Категории' });
  await within(nav).findByText('Электроника');
  const labels = within(nav)
    .getAllByRole('link')
    .map((link) => link.firstChild?.textContent);
  expect(labels).toEqual(['Все товары', 'Для дома', 'Электроника']);
});

it('товар без остатка нельзя положить в корзину', async () => {
  server.use(http.get(`${API}/products`, () => HttpResponse.json(page([product({ stock: 0 })]))));
  renderPage(<CatalogPage />);
  const button = await screen.findByRole('button', { name: /в корзину/i });
  expect(button).toBeDisabled();
});

it('после добавления на карточке — счётчик: можно менять количество и убрать товар', async () => {
  const { user } = renderPage(<CatalogPage />);
  await user.click(await screen.findByRole('button', { name: /в корзину/i }));

  expect(screen.getByTestId('toast')).toHaveTextContent('«Чайник Xiaomi Mi Kettle» в корзине');
  const stepper = screen.getByRole('group', { name: /Количество «Чайник/ });
  expect(within(stepper).getByTestId('quantity')).toHaveTextContent('1');

  await user.click(within(stepper).getByRole('button', { name: 'Больше' }));
  expect(within(stepper).getByTestId('quantity')).toHaveTextContent('2');

  await user.click(within(stepper).getByRole('button', { name: 'Меньше' }));
  await user.click(within(stepper).getByRole('button', { name: 'Убрать из корзины' }));
  expect(screen.getByRole('button', { name: /в корзину/i })).toBeInTheDocument();
});

// ---------- Сортировка и фильтры ----------

it('фильтры из адреса уходят в API: цена — в тиынах', async () => {
  let url: URL | undefined;
  server.use(
    http.get(`${API}/products`, ({ request }) => {
      url = new URL(request.url);
      return HttpResponse.json(page([product()]));
    }),
  );
  renderPage(<CatalogPage />, { route: '/?sort=price_asc&in_stock=1&min=1000&max=50000' });
  await screen.findByTestId('product-card');
  expect(url?.searchParams.get('sort')).toBe('price_asc');
  expect(url?.searchParams.get('in_stock')).toBe('true');
  expect(url?.searchParams.get('min_price')).toBe('100000');
  expect(url?.searchParams.get('max_price')).toBe('5000000');
  expect(screen.getByRole('combobox', { name: 'Сортировка' })).toHaveValue('price_asc');
  expect(screen.getByRole('checkbox', { name: 'Только в наличии' })).toBeChecked();
});

it('выбор сортировки и «Только в наличии» меняют адрес и сбрасывают страницу', async () => {
  const { user } = renderPage(<CatalogPage />, { route: '/?page=3' });
  await screen.findByTestId('product-card');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Сортировка' }), 'price_desc');
  expect(screen.getByTestId('location')).toHaveTextContent('/?sort=price_desc');
  await user.click(screen.getByRole('checkbox', { name: 'Только в наличии' }));
  expect(screen.getByTestId('location')).toHaveTextContent('/?sort=price_desc&in_stock=1');
});

it('цена «от» больше «до» — подсказка, запрос не уходит', async () => {
  let calls = 0;
  server.use(
    http.get(`${API}/products`, () => {
      calls += 1;
      return HttpResponse.json(page([product()]));
    }),
  );
  const { user } = renderPage(<CatalogPage />);
  await screen.findByTestId('product-card');
  const before = calls;
  await user.type(screen.getByLabelText('Цена от, тенге'), '5000');
  await user.type(screen.getByLabelText('Цена до, тенге'), '100');
  await user.click(screen.getByRole('button', { name: 'Показать' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Цена «от» больше цены «до»');
  expect(calls).toBe(before);
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
});

it('ничего не нашлось из-за фильтров — предлагаем их сбросить', async () => {
  server.use(http.get(`${API}/products`, () => HttpResponse.json(page([]))));
  const { user } = renderPage(<CatalogPage />, { route: '/?in_stock=1&max=10' });
  expect(
    await screen.findByText('Под эти условия товаров нет — попробуйте их ослабить.'),
  ).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Сбросить фильтры' }));
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
});

it('промокод на главной — только без поиска и фильтров', async () => {
  const home = renderPage(<CatalogPage />);
  expect(await screen.findByRole('complementary', { name: 'Промокод' })).toBeInTheDocument();
  home.unmount();
  renderPage(<CatalogPage />, { route: '/?q=чай' });
  await screen.findByTestId('product-card');
  expect(screen.queryByRole('complementary', { name: 'Промокод' })).not.toBeInTheDocument();
});

it('клик по промокоду копирует его', async () => {
  const { user } = renderPage(<CatalogPage />);
  const writeText = vi.spyOn(navigator.clipboard, 'writeText');
  await user.click(await screen.findByRole('button', { name: 'WELCOME10' }));
  expect(writeText).toHaveBeenCalledWith('WELCOME10');
  expect(await screen.findByTestId('toast')).toHaveTextContent('скопирован');
});
