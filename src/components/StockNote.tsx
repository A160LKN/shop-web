import styles from './StockNote.module.css';

/** Остаток на складе: «нет», «мало» или ничего — когда товара много, говорить незачем. */
export function StockNote({ stock }: { stock: number }) {
  if (stock === 0) return <span className={`${styles.note} ${styles.out}`}>Нет в наличии</span>;
  if (stock <= 5) return <span className={`${styles.note} ${styles.low}`}>Осталось {stock} шт.</span>;
  return null;
}
