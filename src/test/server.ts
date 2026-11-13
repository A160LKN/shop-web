// Мок Shop API для компонентных тестов: тот же контракт, что у настоящего сервера, без сети.
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { Category, Order, Product, ProductPage } from '@/api/client';

export const API = 'http://localhost:8000';

export const product = (overrides: Partial<Product> = {}): Product => ({
  id: 1,
  name: 'Чайник Xiaomi Mi Kettle',
  category: 'home',
  price: 12_490_00,
  stock: 40,
  ...overrides,
});

export const order = (overrides: Partial<Order> = {}): Order => ({
  id: 7,
  status: 'created',
  items: [{ product_id: 1, name: 'Чайник Xiaomi Mi Kettle', quantity: 2, price: 12_490_00 }],
  subtotal: 24_980_00,
  discount: 0,
  total: 24_980_00,
  promo_code: null,
  created_at: '2026-11-13T08:00:00Z',
  ...overrides,
});

export const page = (items: Product[], total = items.length): ProductPage => ({
  items,
  total,
  limit: 12,
  offset: 0,
});

const categories: Category[] = [
  { name: 'home', count: 5 },
  { name: 'electronics', count: 6 },
];

export const appError = (status: number, code: string, message: string) =>
  HttpResponse.json({ error: { code, message } }, { status });

export const server = setupServer(
  http.get(`${API}/products`, () => HttpResponse.json(page([product()]))),
  http.get(`${API}/products/categories`, () => HttpResponse.json(categories)),
  http.get(`${API}/products/:id`, ({ params }) => HttpResponse.json(product({ id: Number(params.id) }))),
  http.get(`${API}/auth/me`, () => HttpResponse.json({ id: 1, email: 'aibol@mail.kz', role: 'customer' })),
);
