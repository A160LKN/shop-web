import createClient, { type Middleware } from 'openapi-fetch';
import { tokenStore } from '@/auth/token';
import { ApiError, networkError, toApiError } from './errors';
import type { components, paths } from './schema';

export type Schemas = components['schemas'];
export type Product = Schemas['ProductOut'];
export type ProductPage = Schemas['ProductPage'];
export type Category = Schemas['CategoryOut'];
export type Order = Schemas['OrderOut'];
export type OrderStatus = Order['status'];
export type User = Schemas['UserOut'];
export type Promo = Schemas['PromoOut'];
export type ProductSort = Schemas['ProductSort'];
export type Quote = Schemas['QuoteOut'];
export type Stats = Schemas['StatsOut'];

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const auth: Middleware = {
  onRequest({ request }) {
    const token = tokenStore.get();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    return request;
  },
  onResponse({ response, request }) {
    // Токен истёк или стал недействительным — выходим, чтобы интерфейс не застрял «полувошедшим»
    if (response.status === 401 && request.headers.has('Authorization')) tokenStore.set(null);
    return response;
  },
};

// fetch берётся в момент запроса, а не при загрузке модуля: так его могут подменить моки в тестах
export const client = createClient<paths>({
  baseUrl: API_URL,
  fetch: (request) => globalThis.fetch(request),
});
client.use(auth);

interface FetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

/** Ответ openapi-fetch → данные или ApiError. Сетевой сбой — тоже ApiError, с понятным текстом. */
export async function call<T>(request: Promise<FetchResult<T>>): Promise<T> {
  let result: FetchResult<T>;
  try {
    result = await request;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw networkError();
  }
  if (!result.response.ok) throw toApiError(result.response.status, result.error);
  return result.data as T;
}
