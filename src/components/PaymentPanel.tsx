import { useState } from 'react';
import type { Order } from '@/api/client';
import { ApiError, errorMessage } from '@/api/errors';
import { usePayOrder } from '@/api/queries';
import { formatMoney } from '@/lib/money';
import { Button } from './Button';
import { Notice } from './States';
import styles from './PaymentPanel.module.css';

// Тестовые карты платёжного шлюза: так можно проверить и успех, и отказ банка, и сбой связи
const CARDS = [
  { token: 'tok_visa', title: 'Visa •••• 4242', note: 'Оплата пройдёт' },
  { token: 'tok_declined', title: 'Mastercard •••• 0002', note: 'Банк откажет: недостаточно средств' },
  { token: 'tok_timeout', title: 'Visa •••• 0119', note: 'Банк не ответит — проверка таймаута' },
] as const;

export function PaymentPanel({ order, onPaid }: { order: Order; onPaid: (order: Order) => void }) {
  const [card, setCard] = useState<string>(CARDS[0].token);
  const pay = usePayOrder();

  const failure = pay.error instanceof ApiError ? pay.error : null;

  return (
    <section className={styles.panel} aria-labelledby="payment-title">
      <h2 id="payment-title">Оплата</h2>
      <fieldset className={styles.cards} disabled={pay.isPending}>
        <legend className="visually-hidden">Тестовая карта</legend>
        {CARDS.map((option) => (
          <label key={option.token} className={styles.card} data-checked={card === option.token}>
            <input
              type="radio"
              name="card"
              value={option.token}
              checked={card === option.token}
              onChange={() => setCard(option.token)}
            />
            <span className={styles.cardTitle}>{option.title}</span>
            <span className={styles.cardNote}>{option.note}</span>
          </label>
        ))}
      </fieldset>

      {failure?.code === 'payment_declined' && (
        <Notice tone="error">{failure.message}. Деньги не списаны — выберите другую карту.</Notice>
      )}
      {failure && failure.code !== 'payment_declined' && (
        <Notice tone="warning">{errorMessage(failure)}</Notice>
      )}
      {pay.isError && !failure && <Notice tone="error">{errorMessage(pay.error)}</Notice>}

      <Button
        size="lg"
        loading={pay.isPending}
        onClick={() =>
          pay.mutate({ orderId: order.id, cardToken: card }, { onSuccess: (paid) => onPaid(paid) })
        }
      >
        {pay.isPending ? 'Связываемся с банком…' : `Оплатить ${formatMoney(order.total)}`}
      </Button>
      <p className={styles.note}>Оплата учебная: настоящие деньги не списываются.</p>
    </section>
  );
}
