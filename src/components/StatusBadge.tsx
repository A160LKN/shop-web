import type { OrderStatus } from '@/api/client';
import { STATUS_LABELS } from '@/lib/orders';
import styles from './StatusBadge.module.css';

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`${styles.badge} ${styles[status]}`} data-testid="order-status" data-status={status}>
      {STATUS_LABELS[status]}
    </span>
  );
}
