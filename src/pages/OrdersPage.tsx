import { useEffect } from 'react';
import { Link } from 'react-router';
import { useOrders } from '@/api/queries';
import { ButtonLink } from '@/components/Button';
import { EmptyState, ErrorState, Spinner } from '@/components/States';
import { StatusBadge } from '@/components/StatusBadge';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/lib/orders';
import { plural } from '@/lib/plural';
import styles from './OrdersPage.module.css';

export function OrdersPage() {
  const orders = useOrders();

  useEffect(() => {
    document.title = 'Мои заказы — Дүкен';
  }, []);

  if (orders.isPending) return <Spinner />;
  if (orders.isError) return <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />;
  if (orders.data.length === 0) {
    return (
      <EmptyState
        title="Заказов пока нет"
        text="Здесь появятся ваши заказы и их статусы."
        action={<ButtonLink to="/">В каталог</ButtonLink>}
      />
    );
  }

  return (
    <section className={styles.page}>
      <h1>Мои заказы</h1>
      <ul className={styles.list}>
        {orders.data.map((order) => {
          const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
          return (
            <li key={order.id}>
              <Link to={`/orders/${order.id}`} className={styles.row} data-testid="order-row">
                <span className={styles.number}>№{order.id}</span>
                <span className={styles.meta}>
                  {formatDate(order.created_at)}, {count} {plural(count, ['товар', 'товара', 'товаров'])}
                </span>
                <StatusBadge status={order.status} />
                <span className={styles.total}>{formatMoney(order.total)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
