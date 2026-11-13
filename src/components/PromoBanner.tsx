import { useToast } from './Toaster';
import styles from './PromoBanner.module.css';

const CODE = import.meta.env.VITE_PROMO_CODE ?? 'WELCOME10';
const PERCENT = import.meta.env.VITE_PROMO_PERCENT ?? '10';

/** Промокод на главной — тот же ценник, только большой: это «вывеска» магазина. */
export function PromoBanner() {
  const toast = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CODE);
      toast({ text: `Промокод ${CODE} скопирован — введите его при оформлении` });
    } catch {
      toast({ text: `Промокод: ${CODE}`, tone: 'info' });
    }
  };

  return (
    <aside className={styles.banner} aria-label="Промокод">
      <div>
        <p className={styles.title}>Минус {PERCENT}% на заказ</p>
        <p className={styles.text}>Введите промокод при оформлении — скидка посчитается сразу.</p>
      </div>
      <button type="button" className={styles.code} onClick={() => void copy()} title="Скопировать промокод">
        <span className={styles.hole} aria-hidden="true" />
        {CODE}
      </button>
    </aside>
  );
}
