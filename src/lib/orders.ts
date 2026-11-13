import type { OrderStatus } from '@/api/client';

export const STATUS_LABELS: Record<OrderStatus, string> = {
  created: 'Ждёт оплаты',
  paid: 'Оплачен',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
};

/** Путь заказа для шкалы на странице заказа. Отменённый заказ показывается отдельно. */
export const STATUS_STEPS: OrderStatus[] = ['created', 'paid', 'shipped', 'delivered'];

const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
