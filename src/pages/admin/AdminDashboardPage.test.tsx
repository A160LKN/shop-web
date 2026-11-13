import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { Stats } from '@/api/client';
import { renderPage } from '@/test/render';
import { API, appError, server } from '@/test/server';
import { AdminDashboardPage } from './AdminDashboardPage';

const days = [
  '2026-11-07',
  '2026-11-08',
  '2026-11-09',
  '2026-11-10',
  '2026-11-11',
  '2026-11-12',
  '2026-11-13',
];
const stats: Stats = {
  revenue: 300_000_00,
  paid_orders: 4,
  average_check: 75_000_00,
  orders_by_status: [
    { status: 'created', count: 2 },
    { status: 'paid', count: 3 },
    { status: 'shipped', count: 1 },
    { status: 'delivered', count: 0 },
    { status: 'cancelled', count: 1 },
  ],
  revenue_by_day: days.map((day, i) => ({
    day,
    revenue: i === 2 ? 200_000_00 : i === 6 ? 100_000_00 : 0,
    orders: i === 2 ? 3 : i === 6 ? 1 : 0,
  })),
  top_products: [{ product_id: 8, name: 'Пылесос Dreame T20', quantity: 3, revenue: 389_970_00 }],
  low_stock: [
    { id: 6, name: 'Powerbank Anker', stock: 0 },
    { id: 9, name: 'Кофеварка', stock: 3 },
  ],
};

const plain = (s: string | null) => (s ?? '').replace(/[\u00a0\u202f]/g, ' ');

it('показывает выручку, заказы и средний чек', async () => {
  server.use(http.get(`${API}/stats`, () => HttpResponse.json(stats)));
  renderPage(<AdminDashboardPage />, { loggedIn: true });
  expect(plain((await screen.findByTestId('kpi-revenue')).textContent)).toBe('300 000 ₸');
  expect(screen.getByText('Средний чек').nextSibling).toHaveTextContent(/75\s000/);
});

it('график выручки: 7 дней, у каждого столбца понятная подпись для диктора, подписаны только сегодня и лучший день', async () => {
  server.use(http.get(`${API}/stats`, () => HttpResponse.json(stats)));
  renderPage(<AdminDashboardPage />, { loggedIn: true });
  const bars = await screen.findAllByTestId('revenue-bar');
  expect(bars).toHaveLength(7);
  expect(plain(bars[2]?.getAttribute('aria-label') ?? '')).toMatch(/200 000 ₸, 3 заказа/);
  expect(within(bars[6] as HTMLElement).getByText('сегодня')).toBeInTheDocument();
  const valueLabels = bars.filter((bar) => bar.querySelector('[class*="barValue"]'));
  expect(valueLabels).toHaveLength(2);
});

it('статусы ведут в список заказов с фильтром', async () => {
  server.use(http.get(`${API}/stats`, () => HttpResponse.json(stats)));
  renderPage(<AdminDashboardPage />, { loggedIn: true });
  expect(await screen.findByRole('link', { name: 'Оплачен' })).toHaveAttribute(
    'href',
    '/admin/orders?status=paid',
  );
});

it('заканчивающиеся товары — со ссылкой на пополнение', async () => {
  server.use(http.get(`${API}/stats`, () => HttpResponse.json(stats)));
  renderPage(<AdminDashboardPage />, { loggedIn: true });
  const rows = await screen.findAllByTestId('low-stock');
  expect(rows[0]).toHaveTextContent('Powerbank Ankerнет');
  expect(within(rows[1] as HTMLElement).getByRole('link', { name: 'Пополнить' })).toHaveAttribute(
    'href',
    '/admin/products/9/edit',
  );
});

it('пустой магазин — без деления на ноль и пустых таблиц', async () => {
  server.use(
    http.get(`${API}/stats`, () =>
      HttpResponse.json({
        ...stats,
        revenue: 0,
        paid_orders: 0,
        average_check: 0,
        revenue_by_day: days.map((day) => ({ day, revenue: 0, orders: 0 })),
        top_products: [],
        low_stock: [],
      }),
    ),
  );
  renderPage(<AdminDashboardPage />, { loggedIn: true });
  expect(await screen.findByText('Продаж пока нет.')).toBeInTheDocument();
  expect(screen.getByText('Всех товаров больше 5 шт.')).toBeInTheDocument();
});

it('ошибка загрузки — с повтором', async () => {
  server.use(http.get(`${API}/stats`, () => appError(503, 'overloaded', 'Сервис перегружен')));
  renderPage(<AdminDashboardPage />, { loggedIn: true });
  expect(await screen.findByText('Сервис перегружен')).toBeInTheDocument();
});
