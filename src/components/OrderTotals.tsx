import type { Order } from '@/api/client';
import { formatMoney } from '@/lib/money';
import styles from './OrderTotals.module.css';

export function OrderTotals({
  order,
}: {
  order: Pick<Order, 'subtotal' | 'discount' | 'total' | 'promo_code'>;
}) {
  return (
    <dl className={styles.totals}>
      <div>
        <dt>Товары</dt>
        <dd>{formatMoney(order.subtotal)}</dd>
      </div>
      {order.discount > 0 && (
        <div className={styles.discount}>
          <dt>Скидка по промокоду {order.promo_code}</dt>
          <dd data-testid="discount">−{formatMoney(order.discount)}</dd>
        </div>
      )}
      <div className={styles.total}>
        <dt>Итого</dt>
        <dd data-testid="order-total">{formatMoney(order.total)}</dd>
      </div>
    </dl>
  );
}
