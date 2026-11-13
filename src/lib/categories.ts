// Категории приходят из API как коды. Здесь — их названия и иконки для витрины.

export type CategoryIcon = 'phone' | 'kettle' | 'bag' | 'beans' | 'box';

interface CategoryInfo {
  label: string;
  icon: CategoryIcon;
  color: string;
}

const KNOWN: Record<string, CategoryInfo> = {
  electronics: { label: 'Электроника', icon: 'phone', color: 'var(--cat-electronics)' },
  home: { label: 'Для дома', icon: 'kettle', color: 'var(--cat-home)' },
  accessories: { label: 'Аксессуары', icon: 'bag', color: 'var(--cat-accessories)' },
  food: { label: 'Продукты', icon: 'beans', color: 'var(--cat-food)' },
};

export function categoryInfo(code: string): CategoryInfo {
  return (
    KNOWN[code] ?? {
      label: code.charAt(0).toUpperCase() + code.slice(1),
      icon: 'box',
      color: 'var(--cat-other)',
    }
  );
}
