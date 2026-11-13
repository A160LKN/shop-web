import { categoryInfo } from '@/lib/categories';
import { iconFor, type IconName } from '@/lib/productIcon';
import styles from './ProductArt.module.css';

// Фотографий у товаров нет — рисуем иконку по смыслу названия, цвет — по категории.
// Все иконки на сетке 64×64, линии одной толщины: витрина выглядит единым набором.
const ICONS: Record<IconName, React.ReactNode> = {
  phone: (
    <>
      <rect x="22" y="8" width="20" height="48" rx="4" />
      <path d="M29 13h6M30 50h4" />
    </>
  ),
  headphones: (
    <>
      <path d="M14 38v-6a18 18 0 0 1 36 0v6" />
      <rect x="12" y="36" width="10" height="16" rx="4" />
      <rect x="42" y="36" width="10" height="16" rx="4" />
    </>
  ),
  watch: (
    <>
      <rect x="20" y="20" width="24" height="24" rx="7" />
      <path d="M25 20l2-10h10l2 10M25 44l2 10h10l2-10M32 26v6l4 3" />
    </>
  ),
  speaker: (
    <>
      <rect x="10" y="20" width="44" height="26" rx="8" />
      <circle cx="24" cy="33" r="6" />
      <path d="M38 28h8M38 33h8M38 38h8" />
    </>
  ),
  book: (
    <>
      <rect x="18" y="10" width="28" height="44" rx="3" />
      <rect x="23" y="16" width="18" height="24" rx="1" />
      <path d="M29 47h6" />
    </>
  ),
  battery: (
    <>
      <rect x="12" y="20" width="36" height="24" rx="5" />
      <path d="M52 28v8M33 25l-6 8h8l-6 8" />
    </>
  ),
  kettle: (
    <>
      <path d="M16 52h30l-3-30H19z" />
      <path d="M22 22c0-6 4-10 9-10s9 4 9 10M46 28h4a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-6" />
    </>
  ),
  vacuum: (
    <>
      <path d="M40 8 26 44" />
      <path d="M14 44h18a6 6 0 0 1 6 6v2H14z" />
      <circle cx="18" cy="56" r="2" />
      <path d="M36 8h8" />
    </>
  ),
  coffeeMachine: (
    <>
      <path d="M14 10h36v12H14zM18 22v32h28V22" />
      <path d="M26 34h12v8a6 6 0 0 1-12 0zM38 37h3a2 2 0 0 1 0 4h-3M22 54h20" />
    </>
  ),
  drop: (
    <>
      <path d="M32 10c8 10 14 18 14 26a14 14 0 0 1-28 0c0-8 6-16 14-26z" />
      <path d="M26 38a6 6 0 0 0 6 6" />
    </>
  ),
  pot: (
    <>
      <path d="M14 28h36v16a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8z" />
      <path d="M8 30h6M50 30h6M24 22h16M32 16v6" />
    </>
  ),
  bag: (
    <>
      <rect x="14" y="20" width="36" height="34" rx="6" />
      <path d="M24 20v-4a8 8 0 0 1 16 0v4M14 32h36" />
    </>
  ),
  cup: (
    <>
      <path d="M20 14h24l-3 40H23z" />
      <path d="M18 14h28M21 24h22" />
    </>
  ),
  umbrella: (
    <>
      <path d="M8 32a24 24 0 0 1 48 0z" />
      <path d="M32 32v16a5 5 0 0 1-10 0M32 8v2" />
    </>
  ),
  beans: (
    <>
      <ellipse cx="32" cy="32" rx="14" ry="20" transform="rotate(30 32 32)" />
      <path d="M24 18c8 6 8 22 16 28" />
    </>
  ),
  leaf: (
    <>
      <path d="M14 50C14 26 28 14 52 12c-2 24-14 38-38 38z" />
      <path d="M14 50 36 28" />
    </>
  ),
  jar: (
    <>
      <path d="M20 22h24v28a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4z" />
      <rect x="18" y="12" width="28" height="10" rx="2" />
      <path d="M26 34h12" />
    </>
  ),
  bowl: (
    <>
      <path d="M10 34h44a22 22 0 0 1-44 0z" />
      <circle cx="24" cy="26" r="5" />
      <circle cx="36" cy="24" r="5" />
      <circle cx="44" cy="29" r="4" />
    </>
  ),
  box: (
    <>
      <path d="M12 22 32 12l20 10v22L32 54 12 44z" />
      <path d="M12 22l20 10 20-10M32 32v22" />
    </>
  ),
};

interface Props {
  category: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ProductArt({ category, name = '', size = 'md' }: Props) {
  const info = categoryInfo(category);
  return (
    <div
      className={`${styles.art} ${styles[size]}`}
      style={{ '--art-color': info.color } as React.CSSProperties}
    >
      <svg viewBox="0 0 64 64" aria-hidden="true" className={styles.icon}>
        {ICONS[iconFor(name, info.icon)]}
      </svg>
    </div>
  );
}
