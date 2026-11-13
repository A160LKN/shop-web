import { useEffect, useState, type SyntheticEvent } from 'react';
import type { ProductSort } from '@/api/client';
import styles from './CatalogFilters.module.css';

export const SORT_LABELS: Record<ProductSort, string> = {
  default: 'По умолчанию',
  newest: 'Сначала новые',
  price_asc: 'Сначала дешевле',
  price_desc: 'Сначала дороже',
  name: 'По названию',
};

export interface Filters {
  sort: ProductSort;
  inStock: boolean;
  /** Цена в целых тенге — так её видит и вводит покупатель */
  min?: number;
  max?: number;
}

interface Props {
  value: Filters;
  onChange: (next: Filters) => void;
}

const toNumber = (text: string) => (text.trim() === '' ? undefined : Number(text));

export function CatalogFilters({ value, onChange }: Props) {
  const [min, setMin] = useState(value.min?.toString() ?? '');
  const [max, setMax] = useState(value.max?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);

  // При переходе по ссылке или «Назад» поля цены совпадают с адресом страницы
  useEffect(() => {
    setMin(value.min?.toString() ?? '');
    setMax(value.max?.toString() ?? '');
  }, [value.min, value.max]);

  const applyPrice = (event: SyntheticEvent) => {
    event.preventDefault();
    const from = toNumber(min);
    const to = toNumber(max);
    if ([from, to].some((n) => n !== undefined && (!Number.isInteger(n) || n < 0))) {
      setError('Цена — целое число тенге');
      return;
    }
    if (from !== undefined && to !== undefined && from > to) {
      setError('Цена «от» больше цены «до»');
      return;
    }
    setError(null);
    onChange({ ...value, min: from, max: to });
  };

  return (
    <div className={styles.filters}>
      <label className={styles.sort}>
        <span className="visually-hidden">Сортировка</span>
        <select
          value={value.sort}
          onChange={(e) => onChange({ ...value, sort: e.target.value as ProductSort })}
        >
          {Object.entries(SORT_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.check}>
        <input
          type="checkbox"
          checked={value.inStock}
          onChange={(e) => onChange({ ...value, inStock: e.target.checked })}
        />
        Только в наличии
      </label>

      <form className={styles.price} onSubmit={applyPrice} aria-label="Цена">
        <span className={styles.priceLabel}>Цена, ₸</span>
        <input
          inputMode="numeric"
          placeholder="от"
          aria-label="Цена от, тенге"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          aria-invalid={error ? true : undefined}
        />
        <span aria-hidden="true">—</span>
        <input
          inputMode="numeric"
          placeholder="до"
          aria-label="Цена до, тенге"
          value={max}
          onChange={(e) => setMax(e.target.value)}
          aria-invalid={error ? true : undefined}
        />
        <button type="submit">Показать</button>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
