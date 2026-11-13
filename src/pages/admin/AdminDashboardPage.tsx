import { Link } from 'react-router';
import type { Stats } from '@/api/client';
import { useStats } from '@/api/queries';
import { ErrorState, Spinner } from '@/components/States';
import { formatMoney } from '@/lib/money';
import { STATUS_LABELS } from '@/lib/orders';
import { plural } from '@/lib/plural';
import styles from './Dashboard.module.css';

const dayLabel = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric' });
const fullDay = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
// дата из API без времени: разбираем как местную, иначе в западных часовых поясах уедет на день
const parseDay = (iso: string) => new Date(`${iso}T00:00:00`);

/** Выручка за неделю: одна величина во времени — столбцы одного цвета, подписаны только сегодня и максимум. */
function RevenueChart({ days }: { days: Stats['revenue_by_day'] }) {
  const max = Math.max(...days.map((d) => d.revenue), 1);
  const best = days.reduce((a, b) => (b.revenue > a.revenue ? b : a), days[0] ?? { revenue: 0, day: '' });
  const total = days.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <figure className={styles.chart}>
      <figcaption className={styles.chartTitle}>
        Выручка за 7 дней <span className={styles.muted}>{formatMoney(total)}</span>
      </figcaption>
      <div className={styles.bars} role="list" aria-label="Выручка по дням">
        {days.map((day, index) => {
          const isToday = index === days.length - 1;
          const labelled = day.revenue > 0 && (isToday || day.day === best.day);
          return (
            <div
              key={day.day}
              className={styles.barSlot}
              role="listitem"
              tabIndex={0}
              aria-label={`${fullDay.format(parseDay(day.day))}: ${formatMoney(day.revenue)}, ${day.orders} ${plural(day.orders, ['заказ', 'заказа', 'заказов'])}`}
              data-testid="revenue-bar"
            >
              {labelled && <span className={styles.barValue}>{formatMoney(day.revenue)}</span>}
              <div
                className={styles.bar}
                style={{ height: `${Math.max((day.revenue / max) * 100, day.revenue > 0 ? 3 : 0)}%` }}
              />
              <span className={styles.tooltip} aria-hidden="true">
                <strong>{formatMoney(day.revenue)}</strong>
                {day.orders} {plural(day.orders, ['заказ', 'заказа', 'заказов'])}
              </span>
              <span className={`${styles.barLabel} ${isToday ? styles.today : ''}`}>
                {isToday ? 'сегодня' : dayLabel.format(parseDay(day.day))}
              </span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

/** Заказы по статусам: сравнение величин — горизонтальные полосы, число рядом с каждой. */
function StatusBars({ statuses }: { statuses: Stats['orders_by_status'] }) {
  const max = Math.max(...statuses.map((s) => s.count), 1);
  return (
    <section className={styles.panel} aria-labelledby="status-title">
      <h2 id="status-title" className={styles.chartTitle}>
        Заказы по статусам
      </h2>
      <ul className={styles.statusList}>
        {statuses.map((s) => (
          <li key={s.status}>
            <Link to={`/admin/orders?status=${s.status}`} className={styles.statusName}>
              {STATUS_LABELS[s.status]}
            </Link>
            <div className={styles.track}>
              <div className={styles.fill} style={{ width: `${(s.count / max) * 100}%` }} />
            </div>
            <span className={styles.count}>{s.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AdminDashboardPage() {
  const stats = useStats();
  if (stats.isPending) return <Spinner />;
  if (stats.isError) return <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />;
  const data = stats.data;

  return (
    <div className={styles.dashboard}>
      <dl className={styles.kpis}>
        <div className={styles.kpi}>
          <dt>Выручка</dt>
          <dd data-testid="kpi-revenue">{formatMoney(data.revenue)}</dd>
        </div>
        <div className={styles.kpi}>
          <dt>Оплаченных заказов</dt>
          <dd>{data.paid_orders}</dd>
        </div>
        <div className={styles.kpi}>
          <dt>Средний чек</dt>
          <dd>{formatMoney(data.average_check)}</dd>
        </div>
      </dl>

      <div className={styles.row}>
        <section className={`${styles.panel} ${styles.wide}`}>
          <RevenueChart days={data.revenue_by_day} />
        </section>
        <StatusBars statuses={data.orders_by_status} />
      </div>

      <div className={styles.row}>
        <section className={styles.panel} aria-labelledby="top-title">
          <h2 id="top-title" className={styles.chartTitle}>
            Популярные товары
          </h2>
          {data.top_products.length === 0 ? (
            <p className={styles.muted}>Продаж пока нет.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Товар</th>
                  <th className={styles.num}>Продано</th>
                  <th className={styles.num}>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {data.top_products.map((p) => (
                  <tr key={p.product_id}>
                    <td>
                      <Link to={`/products/${p.product_id}`}>{p.name}</Link>
                    </td>
                    <td className={styles.num}>{p.quantity} шт.</td>
                    <td className={styles.num}>{formatMoney(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="low-title">
          <h2 id="low-title" className={styles.chartTitle}>
            Заканчиваются
          </h2>
          {data.low_stock.length === 0 ? (
            <p className={styles.muted}>Всех товаров больше 5 шт.</p>
          ) : (
            <ul className={styles.lowList}>
              {data.low_stock.map((p) => (
                <li key={p.id} data-testid="low-stock">
                  <span>{p.name}</span>
                  <span className={p.stock === 0 ? styles.out : styles.low}>
                    {p.stock === 0 ? 'нет' : `${p.stock} шт.`}
                  </span>
                  <Link to={`/admin/products/${p.id}/edit`}>Пополнить</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
