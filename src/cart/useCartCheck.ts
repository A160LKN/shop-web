import { useQueries } from '@tanstack/react-query';
import { call, client, type Product } from '@/api/client';
import { ApiError } from '@/api/errors';
import { keys } from '@/api/queries';
import type { CartItem } from './CartProvider';

export type CartProblem =
  | { kind: 'gone' }
  | { kind: 'out' }
  | { kind: 'short'; stock: number }
  | { kind: 'price'; was: number; now: number };

/**
 * Корзина хранит снимок товаров — пока покупатель думал, цена или остаток могли измениться.
 * Сверяем каждую позицию с сервером и сообщаем о расхождениях до оформления, а не после ошибки.
 */
export function useCartCheck(items: CartItem[]) {
  const results = useQueries({
    queries: items.map((item) => ({
      queryKey: keys.product(item.productId),
      queryFn: () =>
        call(client.GET('/products/{product_id}', { params: { path: { product_id: item.productId } } })),
      retry: (count: number, error: unknown) =>
        !(error instanceof ApiError && error.status === 404) && count < 2,
    })),
  });

  const problems = new Map<number, CartProblem>();
  const fresh = new Map<number, Product>();
  items.forEach((item, index) => {
    const result = results[index];
    if (!result) return;
    if (result.error instanceof ApiError && result.error.status === 404) {
      problems.set(item.productId, { kind: 'gone' });
      return;
    }
    const product = result.data;
    if (!product) return;
    fresh.set(item.productId, product);
    if (product.stock === 0) problems.set(item.productId, { kind: 'out' });
    else if (product.stock < item.quantity)
      problems.set(item.productId, { kind: 'short', stock: product.stock });
    else if (item.priceWas !== undefined && item.priceWas !== product.price)
      problems.set(item.productId, { kind: 'price', was: item.priceWas, now: product.price });
  });

  return { problems, fresh, checking: results.some((r) => r.isPending) };
}
