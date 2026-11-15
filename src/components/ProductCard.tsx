import { Link } from 'react-router';
import type { Product } from '@/api/client';
import { MAX_QUANTITY, useCart } from '@/cart/CartProvider';
import { categoryInfo } from '@/lib/categories';
import { Button } from './Button';
import { PriceTag } from './PriceTag';
import { ProductArt } from './ProductArt';
import { QuantityStepper } from './QuantityStepper';
import { StockNote } from './StockNote';
import { useToast } from './Toaster';
import styles from './ProductCard.module.css';

export function ProductCard({ product }: { product: Product }) {
  const cart = useCart();
  const toast = useToast();
  const inCart = cart.quantityOf(product.id);
  const max = Math.min(product.stock, MAX_QUANTITY);

  const add = () => {
    cart.add(product);
    toast({ text: `«${product.name}» в корзине`, action: { label: 'Открыть', to: '/cart' } });
  };

  return (
    <article className={styles.card} data-testid="product-card">
      <Link to={`/products/${product.id}`} className={styles.link}>
        <ProductArt category={product.category} name={product.name} />
        <span className={styles.category}>{categoryInfo(product.category).label}</span>
        <h3 className={styles.name}>{product.name}</h3>
      </Link>
      <div className={styles.bottom}>
        <PriceTag amount={product.price} />
        <StockNote stock={product.stock} />
      </div>
      {inCart > 0 ? (
        // Товар уже в корзине — меняем количество прямо здесь, не уходя из каталога
        <QuantityStepper
          value={inCart}
          min={0}
          max={max}
          onChange={(value) => cart.setQuantity(product.id, value)}
          label={`Количество «${product.name}» в корзине`}
          wide
        />
      ) : (
        <Button
          variant="secondary"
          disabled={product.stock === 0}
          onClick={add}
          // Видимый текст — начало имени кнопки: голосовое управление «нажми В корзину» сработает
          aria-label={`${product.stock === 0 ? 'Нет в наличии' : 'В корзину'}: ${product.name}`}
        >
          {product.stock === 0 ? 'Нет в наличии' : 'В корзину'}
        </Button>
      )}
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className={`${styles.card} ${styles.skeleton}`} aria-hidden="true">
      <div className={styles.block} style={{ aspectRatio: '4 / 3' }} />
      <div className={styles.block} style={{ height: 14, width: '40%' }} />
      <div className={styles.block} style={{ height: 20, width: '85%' }} />
      <div className={styles.block} style={{ height: 32, width: '50%' }} />
    </div>
  );
}
