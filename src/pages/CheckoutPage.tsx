import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import type { Order, Quote } from '@/api/client';
import { ApiError, errorMessage } from '@/api/errors';
import { useCreateOrder, useQuote } from '@/api/queries';
import { useCart } from '@/cart/CartProvider';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { OrderTotals } from '@/components/OrderTotals';
import { PaymentPanel } from '@/components/PaymentPanel';
import { Notice } from '@/components/States';
import { formatMoney } from '@/lib/money';
import styles from './CheckoutPage.module.css';

/**
 * Оформление в два шага, как в настоящих магазинах:
 * 1) расчёт — сервер проверяет остатки и промокод и считает итог, ничего не резервируя;
 *    покупатель видит скидку до того, как подтвердит заказ;
 * 2) заказ создаётся — товар резервируется; оплата — отдельным действием, её можно повторить.
 */
export function CheckoutPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const createOrder = useCreateOrder();
  const quote = useQuote();
  const [promo, setPromo] = useState('');
  const [applied, setApplied] = useState<Quote | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const requested = useRef(false);

  const items = cart.items.map((item) => ({ product_id: item.productId, quantity: item.quantity }));

  useEffect(() => {
    document.title = 'Оформление заказа — Дүкен';
  }, []);

  // Сразу сверяем корзину с сервером: итог на экране — тот, который посчитает сервер
  useEffect(() => {
    if (requested.current || items.length === 0) return;
    requested.current = true;
    quote.mutate({ items, promo_code: null }, { onSuccess: setApplied });
  }, [items, quote]);

  if (!order && cart.items.length === 0) return <Navigate to="/cart" replace />;

  const quoteError = quote.error instanceof ApiError ? quote.error : null;
  const createError = createOrder.error instanceof ApiError ? createOrder.error : null;
  const promoError =
    (quoteError?.code === 'promo_invalid' ? quoteError.message : undefined) ??
    (createError?.code === 'promo_invalid' ? createError.message : undefined);
  const stockError = [quoteError, createError].find(
    (e) => e?.code === 'out_of_stock' || e?.code === 'product_not_found',
  );

  // Скидка снимается, если промокод не подошёл или его начали менять: на экране — только то, что посчитал сервер
  const dropDiscount = () =>
    setApplied((current) =>
      current?.promo_code ? { ...current, discount: 0, total: current.subtotal, promo_code: null } : current,
    );

  const applyPromo = () => {
    quote.mutate(
      { items, promo_code: promo.trim() || null },
      { onSuccess: setApplied, onError: dropDiscount },
    );
  };

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    createOrder.mutate(
      { items, promo_code: applied?.promo_code ?? (promo.trim() || null) },
      {
        onSuccess: (created) => {
          setOrder(created);
          cart.clear(); // товар уже зарезервирован за заказом — в корзине он больше не нужен
        },
      },
    );
  };

  return (
    <div className={styles.page}>
      <h1>{order ? `Заказ №${order.id} создан` : 'Оформление заказа'}</h1>

      {!order ? (
        <form className={styles.grid} onSubmit={submit}>
          <section className={styles.panel} aria-labelledby="items-title">
            <h2 id="items-title">Товары</h2>
            <ul className={styles.items}>
              {cart.items.map((item) => (
                <li key={item.productId}>
                  <span>
                    {item.name} <span className={styles.qty}>× {item.quantity}</span>
                  </span>
                  <span>{formatMoney(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className={styles.panel}>
            <div className={styles.promo}>
              <Field
                label="Промокод"
                placeholder="Например, WELCOME10"
                value={promo}
                onChange={(e) => {
                  setPromo(e.target.value);
                  quote.reset();
                  dropDiscount();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault(); // Enter в поле промокода применяет его, а не создаёт заказ
                    applyPromo();
                  }
                }}
                error={promoError}
                maxLength={32}
                autoComplete="off"
              />
              <Button
                variant="secondary"
                onClick={applyPromo}
                loading={quote.isPending}
                disabled={!promo.trim()}
              >
                Применить
              </Button>
            </div>
            {applied?.promo_code && applied.discount > 0 && !promoError && (
              <Notice tone="success">Промокод {applied.promo_code} применён</Notice>
            )}

            {applied ? (
              <OrderTotals order={applied} />
            ) : (
              <p className={styles.sum}>
                <span>Сумма</span>
                <span>{formatMoney(cart.subtotal)}</span>
              </p>
            )}

            {stockError && (
              <Notice tone="error">
                {stockError.message}. <Link to="/cart">Изменить корзину</Link>
              </Notice>
            )}
            {createOrder.isError && !createError && (
              <Notice tone="error">{errorMessage(createOrder.error)}</Notice>
            )}
            {createError && !promoError && !stockError && <Notice tone="error">{createError.message}</Notice>}

            <Button type="submit" size="lg" loading={createOrder.isPending} disabled={Boolean(stockError)}>
              Подтвердить заказ{applied ? ` на ${formatMoney(applied.total)}` : ''}
            </Button>
          </section>
        </form>
      ) : (
        <div className={styles.grid}>
          <section className={styles.panel}>
            <Notice tone="success">Товар зарезервирован за вами. Осталось оплатить.</Notice>
            <OrderTotals order={order} />
          </section>
          <section className={styles.panel}>
            <PaymentPanel
              order={order}
              onPaid={(paid) => void navigate(`/orders/${paid.id}?paid=1`, { replace: true })}
            />
          </section>
        </div>
      )}
    </div>
  );
}
