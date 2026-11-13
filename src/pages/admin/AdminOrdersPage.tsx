import { Link, useSearchParams } from 'react-router';
import type { OrderStatus } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { useOrderAction, useOrdersPage } from '@/api/queries';
import { Button } from '@/components/Button';
import { EmptyState, ErrorState, Notice, Spinner } from '@/components/States';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/components/Toaster';
import { formatMoney } from '@/lib/money';
import { formatDate, STATUS_LABELS } from '@/lib/orders';
import styles from './Admin.module.css';

const NEXT_ACTION: Partial<Record<OrderStatus, { action: 'ship' | 'deliver'; label: string; done: string }>> =
  {
    paid: { action: 'ship', label: 'Отправить', done: 'отправлен' },
    shipped: { action: 'deliver', label: 'Доставлен', done: 'доставлен' },
  };

export function AdminOrdersPage() {
  const [params, setParams] = useSearchParams();
  const statusParam = params.get('status');
  const status = statusParam && statusParam in STATUS_LABELS ? (statusParam as OrderStatus) : undefined;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const orders = useOrdersPage(page, status);
  const action = useOrderAction();
  const toast = useToast();

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setParams(next);
  };

  if (orders.isPending) return <Spinner />;
  if (orders.isError) return <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />;

  const { orders: list, hasNext } = orders.data;

  return (
    <section className={styles.layout}>
      <div className={styles.toolbar}>
        <label>
          <span className="visually-hidden">Статус</span>
          <select
            className={styles.select}
            value={status ?? ''}
            onChange={(e) => update({ status: e.target.value || undefined, page: undefined })}
          >
            <option value="">Все статусы</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <p className={styles.muted}>Новые — сверху</p>
      </div>
      {action.isError && <Notice tone="error">{errorMessage(action.error)}</Notice>}
      {list.length === 0 ? (
        <EmptyState
          title="Заказов нет"
          text={status ? 'С таким статусом заказов нет.' : 'Покупатели ещё ничего не заказали.'}
        />
      ) : (
        <div className={styles.tableWrap} style={{ opacity: orders.isPlaceholderData ? 0.6 : 1 }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Заказ</th>
                <th>Дата</th>
                <th className={styles.num}>Сумма</th>
                <th>Статус</th>
                <th className={styles.num}>Действие</th>
              </tr>
            </thead>
            <tbody>
              {list.map((order) => {
                const next = NEXT_ACTION[order.status];
                return (
                  <tr key={order.id} data-testid="admin-order-row">
                    <td>
                      <Link to={`/orders/${order.id}`}>№{order.id}</Link>
                    </td>
                    <td>{formatDate(order.created_at)}</td>
                    <td className={styles.num}>{formatMoney(order.total)}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td className={styles.num}>
                      {next && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={action.isPending}
                          onClick={() =>
                            action.mutate(
                              { orderId: order.id, action: next.action },
                              { onSuccess: () => toast({ text: `Заказ №${order.id} ${next.done}` }) },
                            )
                          }
                        >
                          {next.label}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {(page > 1 || hasNext) && (
        <nav className={styles.pager} aria-label="Страницы заказов">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => update({ page: page > 2 ? String(page - 1) : undefined })}
          >
            Новее
          </Button>
          <span className={styles.muted}>Страница {page}</span>
          <Button variant="secondary" disabled={!hasNext} onClick={() => update({ page: String(page + 1) })}>
            Старше
          </Button>
        </nav>
      )}
    </section>
  );
}
