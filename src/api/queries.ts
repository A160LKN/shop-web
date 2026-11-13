// Все запросы к API — здесь: ключи кеша, загрузка и изменения данных в одном месте.
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { call, client, type Order, type OrderStatus, type Product, type ProductSort } from './client';
import type { Schemas } from './client';

export const PAGE_SIZE = 12;

export interface CatalogParams {
  q?: string;
  category?: string;
  sort?: ProductSort;
  inStock?: boolean;
  /** Границы цены в тиынах */
  minPrice?: number;
  maxPrice?: number;
  page: number;
  pageSize?: number;
}

export const keys = {
  products: (params: CatalogParams) => ['products', params] as const,
  product: (id: number) => ['product', id] as const,
  categories: ['categories'] as const,
  me: ['me'] as const,
  orders: ['orders'] as const,
  ordersPage: (page: number, status?: OrderStatus) => ['orders', 'page', page, status ?? 'all'] as const,
  stats: ['stats'] as const,
  order: (id: number) => ['order', id] as const,
  promos: ['promos'] as const,
};

// ---------- Каталог ----------

export function useProducts(params: CatalogParams) {
  return useQuery({
    queryKey: keys.products(params),
    queryFn: () =>
      call(
        client.GET('/products', {
          params: {
            query: {
              q: params.q || undefined,
              category: params.category || undefined,
              sort: params.sort,
              in_stock: params.inStock || undefined,
              min_price: params.minPrice,
              max_price: params.maxPrice,
              limit: params.pageSize ?? PAGE_SIZE,
              offset: (params.page - 1) * (params.pageSize ?? PAGE_SIZE),
            },
          },
        }),
      ),
    placeholderData: keepPreviousData, // при смене страницы старый список не исчезает, пока грузится новый
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: keys.product(id),
    queryFn: () => call(client.GET('/products/{product_id}', { params: { path: { product_id: id } } })),
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: keys.categories,
    queryFn: () => call(client.GET('/products/categories')),
    staleTime: 5 * 60_000,
  });
}

// ---------- Заказы ----------

export function useOrders(enabled = true) {
  return useQuery({
    queryKey: keys.orders,
    queryFn: () => call(client.GET('/orders', { params: { query: { limit: 200 } } })),
    enabled,
  });
}

export const ADMIN_ORDERS_PAGE = 20;

/** Заказы постранично — для админки, где их могут быть тысячи */
export function useOrdersPage(page: number, status?: OrderStatus) {
  return useQuery({
    queryKey: keys.ordersPage(page, status),
    queryFn: () =>
      call(
        client.GET('/orders', {
          params: { query: { limit: ADMIN_ORDERS_PAGE + 1, offset: (page - 1) * ADMIN_ORDERS_PAGE, status } },
        }),
      ),
    // Просим на один заказ больше: если он пришёл — есть следующая страница
    select: (orders) => ({
      orders: orders.slice(0, ADMIN_ORDERS_PAGE),
      hasNext: orders.length > ADMIN_ORDERS_PAGE,
    }),
    placeholderData: keepPreviousData,
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: keys.order(id),
    queryFn: () => call(client.GET('/orders/{order_id}', { params: { path: { order_id: id } } })),
    enabled: Number.isInteger(id) && id > 0,
  });
}

/** После изменения заказа обновляем его в кеше и помечаем устаревшими список и остатки товаров. */
function useOrderUpdated() {
  const queryClient = useQueryClient();
  return (order: Order) => {
    queryClient.setQueryData(keys.order(order.id), order);
    void queryClient.invalidateQueries({ queryKey: keys.orders });
    void queryClient.invalidateQueries({ queryKey: ['products'] });
    void queryClient.invalidateQueries({ queryKey: ['product'] });
    void queryClient.invalidateQueries({ queryKey: keys.stats });
  };
}

/** Сколько будет стоить заказ: сервер проверяет остатки и промокод, но ничего не резервирует */
export function useQuote() {
  return useMutation({
    mutationFn: (body: Schemas['OrderIn']) => call(client.POST('/orders/quote', { body })),
  });
}

export function useCreateOrder() {
  const updated = useOrderUpdated();
  return useMutation({
    mutationFn: (body: Schemas['OrderIn']) => call(client.POST('/orders', { body })),
    onSuccess: updated,
  });
}

export function usePayOrder() {
  const updated = useOrderUpdated();
  return useMutation({
    mutationFn: ({ orderId, cardToken }: { orderId: number; cardToken: string }) =>
      call(
        client.POST('/orders/{order_id}/pay', {
          params: { path: { order_id: orderId } },
          body: { card_token: cardToken },
        }),
      ),
    onSuccess: updated,
  });
}

type OrderAction = 'cancel' | 'ship' | 'deliver';
const ACTION_PATHS = {
  cancel: '/orders/{order_id}/cancel',
  ship: '/orders/{order_id}/ship',
  deliver: '/orders/{order_id}/deliver',
} as const;

export function useOrderAction() {
  const updated = useOrderUpdated();
  return useMutation({
    mutationFn: ({ orderId, action }: { orderId: number; action: OrderAction }) =>
      call(client.POST(ACTION_PATHS[action], { params: { path: { order_id: orderId } } })),
    onSuccess: updated,
  });
}

// ---------- Администрирование ----------

function useCatalogChanged() {
  const queryClient = useQueryClient();
  return (product?: Product) => {
    if (product) queryClient.setQueryData(keys.product(product.id), product);
    void queryClient.invalidateQueries({ queryKey: ['products'] });
    void queryClient.invalidateQueries({ queryKey: keys.categories });
  };
}

export function useCreateProduct() {
  const changed = useCatalogChanged();
  return useMutation({
    mutationFn: (body: Schemas['ProductIn']) => call(client.POST('/products', { body })),
    onSuccess: changed,
  });
}

export function useUpdateProduct() {
  const changed = useCatalogChanged();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Schemas['ProductPatch'] }) =>
      call(client.PATCH('/products/{product_id}', { params: { path: { product_id: id } }, body })),
    onSuccess: changed,
  });
}

export function useDeleteProduct() {
  const changed = useCatalogChanged();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      call(client.DELETE('/products/{product_id}', { params: { path: { product_id: id } } })),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: keys.product(id) });
      changed();
    },
  });
}

export function useStats() {
  return useQuery({ queryKey: keys.stats, queryFn: () => call(client.GET('/stats')) });
}

export function usePromos() {
  return useQuery({ queryKey: keys.promos, queryFn: () => call(client.GET('/promo-codes')) });
}

export function useCreatePromo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas['PromoIn']) => call(client.POST('/promo-codes', { body })),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.promos }),
  });
}
