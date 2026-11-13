import styles from './Pagination.module.css';

interface Props {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pages, onChange }: Props) {
  if (pages <= 1) return null;
  return (
    <nav className={styles.nav} aria-label="Страницы каталога">
      <button type="button" className={styles.step} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Назад
      </button>
      <span className={styles.current} aria-live="polite">
        {page} из {pages}
      </span>
      <button
        type="button"
        className={styles.step}
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Дальше
      </button>
    </nav>
  );
}
