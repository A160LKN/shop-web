import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';
import { MAX_QUANTITY, useCart, type CartItem } from '@/cart/CartProvider';
import { useCartCheck, type CartProblem } from '@/cart/useCartCheck';
import { Button, ButtonLink } from '@/components/Button';
import { ProductArt } from '@/components/ProductArt';
import { QuantityStepper } from '@/components/QuantityStepper';
import { EmptyState } from '@/components/States';
import { formatMoney } from '@/lib/money';
import { plural } from '@/lib/plural';
import styles from './CartPage.module.css';

function problemText(problem: CartProblem): string {
  switch (problem.kind) {
    case 'gone':
      return 'Товар сняли с продажи';
    case 'out':
      return 'Товар закончился';
    case 'short':
      return `В наличии только ${problem.stock} шт.`;
    case 'price':
      return `Цена изменилась: была ${formatMoney(problem.was)}`;
  }
}

function Line({ item, problem }: { item: CartItem; problem: CartProblem | undefined }) {
  const cart = useCart();
  const blocked = problem?.kind === 'gone' || problem?.kind === 'out';
  return (
    <li className={styles.line} data-testid="cart-line">
      <ProductArt category={item.category} name={item.name} size="sm" />
      <div className={styles.lineInfo}>
        <Link to={`/products/${item.productId}`} className={styles.lineName}>
          {item.name}
        </Link>
        <span className={styles.each}>{formatMoney(item.price)} за шт.</span>
        {problem && (
          <span className={styles.problem} role="status">
            {problemText(problem)}
          </span>
        )}
      </div>
      {!blocked && (
        <QuantityStepper
          value={item.quantity}
          max={Math.min(item.stock, MAX_QUANTITY)}
          onChange={(value) => cart.setQuantity(item.productId, value)}
          label={`Количество: ${item.name}`}
        />
      )}
      <span className={styles.lineTotal}>{formatMoney(item.price * item.quantity)}</span>
      <button
        type="button"
        className={styles.remove}
        onClick={() => cart.remove(item.productId)}
        aria-label={`Убрать «${item.name}» из корзины`}
      >
        Убрать
      </button>
    </li>
  );
}

export function CartPage() {
  const cart = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { problems, fresh } = useCartCheck(cart.items);

  useEffect(() => {
    document.title = 'Корзина — Дүкен';
  }, []);

  // Обновляем снимок в корзине свежими ценой и остатком — сумма на экране совпадёт с заказом.
  // Количество не меняем молча: если товара стало меньше, покупатель увидит предупреждение
  const { refresh } = cart;
  useEffect(() => {
    fresh.forEach((product) => refresh(product));
  }, [fresh, refresh]);

  if (cart.items.length === 0) {
    return (
      <EmptyState
        title="Корзина пуста"
        text="Загляните в каталог — там есть всё для дома и не только."
        action={<ButtonLink to="/">В каталог</ButtonLink>}
      />
    );
  }

  const blocking = [...problems.values()].some(
    (p) => p.kind === 'gone' || p.kind === 'out' || p.kind === 'short',
  );

  return (
    <div className={styles.page}>
      <section>
        <h1 className={styles.title}>Корзина</h1>
        <ul className={styles.lines}>
          {cart.items.map((item) => (
            <Line key={item.productId} item={item} problem={problems.get(item.productId)} />
          ))}
        </ul>
      </section>
      <aside className={styles.summary} aria-label="Итого">
        <p className={styles.summaryRow}>
          <span>
            {cart.count} {plural(cart.count, ['товар', 'товара', 'товаров'])}
          </span>
          <span className={styles.subtotal} data-testid="cart-subtotal">
            {formatMoney(cart.subtotal)}
          </span>
        </p>
        <p className={styles.hint}>Промокод можно ввести при оформлении.</p>
        {blocking && <p className={styles.problem}>Уберите недоступные товары или уменьшите количество.</p>}
        <Button
          size="lg"
          disabled={blocking}
          onClick={() => void navigate(user ? '/checkout' : `/login?next=${encodeURIComponent('/checkout')}`)}
        >
          {user ? 'Оформить заказ' : 'Войти и оформить'}
        </Button>
      </aside>
    </div>
  );
}
