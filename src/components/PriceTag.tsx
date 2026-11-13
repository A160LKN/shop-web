import { formatMoney } from '@/lib/money';
import styles from './PriceTag.module.css';

interface Props {
  amount: number;
  size?: 'md' | 'lg';
  /** Старая цена — показывается зачёркнутой, когда действует скидка */
  was?: number;
}

/** Жёлтый ценник с дыркой для верёвочки — главный визуальный элемент витрины. */
export function PriceTag({ amount, size = 'md', was }: Props) {
  return (
    <span className={`${styles.tag} ${styles[size]}`} data-testid="price">
      <span className={styles.hole} aria-hidden="true" />
      {was !== undefined && was !== amount && <s className={styles.was}>{formatMoney(was)}</s>}
      <span className={styles.amount}>{formatMoney(amount)}</span>
    </span>
  );
}
