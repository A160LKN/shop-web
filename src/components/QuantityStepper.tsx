import styles from './QuantityStepper.module.css';

interface Props {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
  /** Растянуть на всю ширину — в карточке товара вместо кнопки «В корзину» */
  wide?: boolean;
}

export function QuantityStepper({ value, max, onChange, label, min = 1, wide = false }: Props) {
  return (
    <div className={`${styles.stepper} ${wide ? styles.wide : ''}`} role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={value === 1 && min === 0 ? 'Убрать из корзины' : 'Меньше'}
      >
        −
      </button>
      <output aria-live="polite" data-testid="quantity">
        {value}
      </output>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Больше">
        +
      </button>
    </div>
  );
}
