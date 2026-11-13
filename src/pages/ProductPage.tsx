import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/api/errors';
import { useProduct, useProducts } from '@/api/queries';
import type { Product } from '@/api/client';
import { Icon, type IconName } from '@/components/Icon';
import { ProductCard } from '@/components/ProductCard';
import { useToast } from '@/components/Toaster';
import { Button, ButtonLink } from '@/components/Button';
import { PriceTag } from '@/components/PriceTag';
import { ProductArt } from '@/components/ProductArt';
import { QuantityStepper } from '@/components/QuantityStepper';
import { EmptyState, ErrorState, Spinner } from '@/components/States';
import { StockNote } from '@/components/StockNote';
import { MAX_QUANTITY, useCart } from '@/cart/CartProvider';
import { categoryInfo } from '@/lib/categories';
import styles from './ProductPage.module.css';

// Правила магазина на карточке товара — ровно то, что делает Shop API, без обещаний сверх этого
const PROMISES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'lock',
    title: 'Резерв при оформлении',
    text: 'Товар закрепляется за вами, как только вы подтверждаете заказ.',
  },
  {
    icon: 'card',
    title: 'Оплата картой онлайн',
    text: 'Деньги списываются только после подтверждения банком.',
  },
  {
    icon: 'undo',
    title: 'Передумали — отмените',
    text: 'До отправки заказ можно отменить, деньги вернутся на карту.',
  },
];

function Similar({ product }: { product: Product }) {
  const similar = useProducts({ category: product.category, page: 1, inStock: true, pageSize: 5 });
  const items = (similar.data?.items ?? []).filter((item) => item.id !== product.id).slice(0, 4);
  if (items.length === 0) return null;
  return (
    <section className={styles.similar} aria-labelledby="similar-title">
      <h2 id="similar-title">Похожие товары</h2>
      <div className={styles.similarGrid}>
        {items.map((item) => (
          <ProductCard key={item.id} product={item} />
        ))}
      </div>
    </section>
  );
}

export function ProductPage() {
  const id = Number(useParams().id);
  const product = useProduct(id);
  const cart = useCart();
  const toast = useToast();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (product.data) document.title = `${product.data.name} — Дүкен`;
  }, [product.data]);

  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    (product.error instanceof ApiError && product.error.status === 404)
  ) {
    return (
      <EmptyState
        title="Товар не найден"
        text="Возможно, его сняли с продажи."
        action={<ButtonLink to="/">В каталог</ButtonLink>}
      />
    );
  }
  if (product.isPending) return <Spinner />;
  if (product.isError) return <ErrorState error={product.error} onRetry={() => void product.refetch()} />;

  const item = product.data;
  const inCart = cart.quantityOf(item.id);
  const available = Math.max(0, Math.min(item.stock, MAX_QUANTITY) - inCart);
  const info = categoryInfo(item.category);

  return (
    <>
      <nav className={styles.crumbs} aria-label="Хлебные крошки">
        <ol>
          <li>
            <Link to="/">Каталог</Link>
          </li>
          <li>
            <Link to={`/?category=${encodeURIComponent(item.category)}`}>{info.label}</Link>
          </li>
          <li aria-current="page">{item.name}</li>
        </ol>
      </nav>
      <article className={styles.page}>
        <ProductArt category={item.category} name={item.name} size="lg" />
        <div className={styles.info}>
          <h1 className={styles.name}>{item.name}</h1>
          <div className={styles.price}>
            <PriceTag amount={item.price} size="lg" />
            <StockNote stock={item.stock} />
          </div>

          {item.stock > 0 ? (
            <div className={styles.buy}>
              {available > 0 && (
                <QuantityStepper
                  value={Math.min(quantity, available)}
                  max={available}
                  onChange={setQuantity}
                  label="Количество"
                />
              )}
              <Button
                size="lg"
                disabled={available === 0}
                onClick={() => {
                  const count = Math.min(quantity, available);
                  cart.add(item, count);
                  setQuantity(1);
                  setAdded(true);
                  toast({ text: `Добавлено: ${count} шт.`, action: { label: 'В корзину', to: '/cart' } });
                }}
              >
                {available === 0 ? 'Больше нет в наличии' : 'Добавить в корзину'}
              </Button>
            </div>
          ) : (
            <p className={styles.muted}>Товар закончился. Загляните позже.</p>
          )}

          {inCart > 0 && (
            <p className={styles.inCart} role="status">
              {added ? 'Добавлено. ' : ''}В корзине: {inCart} шт. <Link to="/cart">Перейти в корзину</Link>
            </p>
          )}

          <ul className={styles.promises}>
            {PROMISES.map((promise) => (
              <li key={promise.title}>
                <Icon name={promise.icon} />
                <div>
                  <p className={styles.promiseTitle}>{promise.title}</p>
                  <p className={styles.muted}>{promise.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </article>
      <Similar product={item} />
    </>
  );
}
