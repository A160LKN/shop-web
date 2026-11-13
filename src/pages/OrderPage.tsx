import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import type { Order } from '@/api/client';
import { ApiError, errorMessage } from '@/api/errors';
import { useOrder, useOrderAction } from '@/api/queries';
import { useAuth } from '@/auth/AuthProvider';
import { Button, ButtonLink } from '@/components/Button';
import { OrderTotals } from '@/components/OrderTotals';
import { PaymentPanel } from '@/components/PaymentPanel';
import { EmptyState, ErrorState, Notice, Spinner } from '@/components/States';
import { StatusBadge } from '@/components/StatusBadge';
import { formatMoney } from '@/lib/money';
import { useToast } from '@/components/Toaster';
import { formatDate, STATUS_LABELS, STATUS_STEPS } from '@/lib/orders';
import styles from './OrderPage.module.css';

function Timeline({ order }: { order: Order }) {
  if (order.status === 'cancelled') {
    return (
      <Notice tone="info">
        Заказ отменён. Товар вернулся на склад, а если заказ был оплачен — деньги вернулись на карту.
      </Notice>
    );
  }
  const reached = STATUS_STEPS.indexOf(order.status);
  return (
    <ol className={styles.timeline} aria-label="Путь заказа">
      {STATUS_STEPS.map((step, index) => (
        <li key={step} data-done={index <= reached} aria-current={index === reached ? 'step' : undefined}>
          {STATUS_LABELS[step]}
        </li>
      ))}
    </ol>
  );
}

function Actions({ order }: { order: Order }) {
  const { user } = useAuth();
  const action = useOrderAction();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const toast = useToast();
  const isAdmin = user?.role === 'admin';
  const canCancel = order.status === 'created' || order.status === 'paid';

  return (
    <div className={styles.actions}>
      {action.isError && <Notice tone="error">{errorMessage(action.error)}</Notice>}
      {isAdmin && order.status === 'paid' && (
        <Button
          loading={action.isPending}
          onClick={() => action.mutate({ orderId: order.id, action: 'ship' })}
        >
          Отметить отправленным
        </Button>
      )}
      {isAdmin && order.status === 'shipped' && (
        <Button
          loading={action.isPending}
          onClick={() => action.mutate({ orderId: order.id, action: 'deliver' })}
        >
          Отметить доставленным
        </Button>
      )}
      {canCancel &&
        (confirmCancel ? (
          <div className={styles.confirm} role="group" aria-label="Подтверждение отмены">
            <p>
              {order.status === 'paid'
                ? `Отменить заказ? ${formatMoney(order.total)} вернутся на карту.`
                : 'Отменить заказ? Товар вернётся на склад.'}
            </p>
            <Button
              variant="danger"
              loading={action.isPending}
              onClick={() =>
                action.mutate(
                  { orderId: order.id, action: 'cancel' },
                  {
                    onSuccess: () => toast({ text: `Заказ №${order.id} отменён`, tone: 'info' }),
                    onSettled: () => setConfirmCancel(false),
                  },
                )
              }
            >
              Да, отменить
            </Button>
            <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
              Не отменять
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setConfirmCancel(true)}>
            Отменить заказ
          </Button>
        ))}
    </div>
  );
}

export function OrderPage() {
  const id = Number(useParams().id);
  const [params] = useSearchParams();
  const order = useOrder(id);
  const { user } = useAuth();

  useEffect(() => {
    document.title = `Заказ №${id} — Дүкен`;
  }, [id]);

  if (!Number.isInteger(id) || id <= 0 || (order.error instanceof ApiError && order.error.status === 404)) {
    return (
      <EmptyState
        title="Заказ не найден"
        text="Проверьте номер заказа."
        action={<ButtonLink to="/orders">Мои заказы</ButtonLink>}
      />
    );
  }
  if (order.isPending) return <Spinner />;
  if (order.isError) return <ErrorState error={order.error} onRetry={() => void order.refetch()} />;

  const data = order.data;
  const isOwner = user !== null && user.role !== 'admin';

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Заказ №{data.id}</h1>
          <p className={styles.date}>от {formatDate(data.created_at)}</p>
        </div>
        <StatusBadge status={data.status} />
      </header>

      {params.get('paid') && data.status === 'paid' && (
        <Notice tone="success">Оплата прошла. Спасибо за заказ!</Notice>
      )}

      <Timeline order={data} />

      <div className={styles.grid}>
        <section className={styles.panel} aria-labelledby="order-items">
          <h2 id="order-items">Состав заказа</h2>
          <ul className={styles.items}>
            {data.items.map((item) => (
              <li key={item.product_id}>
                <Link to={`/products/${item.product_id}`}>{item.name}</Link>
                <span className={styles.qty}>
                  {item.quantity} × {formatMoney(item.price)}
                </span>
                <span className={styles.sum}>{formatMoney(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <OrderTotals order={data} />
        </section>

        <section className={styles.panel}>
          {data.status === 'created' && isOwner ? (
            <PaymentPanel order={data} onPaid={() => undefined} />
          ) : (
            <p className={styles.muted}>
              {data.status === 'paid' && 'Заказ оплачен и готовится к отправке.'}
              {data.status === 'shipped' && 'Заказ в пути.'}
              {data.status === 'delivered' && 'Заказ доставлен. Приятных покупок!'}
              {data.status === 'cancelled' && 'Этот заказ отменён.'}
              {data.status === 'created' && 'Заказ ждёт оплаты покупателем.'}
            </p>
          )}
          <Actions order={data} />
        </section>
      </div>
    </article>
  );
}
