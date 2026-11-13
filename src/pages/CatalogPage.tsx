import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { ProductSort } from '@/api/client';
import { PAGE_SIZE, useCategories, useProducts } from '@/api/queries';
import { CatalogFilters, SORT_LABELS, type Filters } from '@/components/CatalogFilters';
import { Pagination } from '@/components/Pagination';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { PromoBanner } from '@/components/PromoBanner';
import { EmptyState, ErrorState } from '@/components/States';
import { categoryInfo } from '@/lib/categories';
import { plural } from '@/lib/plural';
import styles from './CatalogPage.module.css';

function Categories({ active, q }: { active: string; q: string }) {
  const { data } = useCategories();
  const href = (category: string) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    const query = params.toString();
    return query ? `/?${query}` : '/';
  };
  return (
    <nav className={styles.categories} aria-label="Категории">
      <Link to={href('')} className={styles.category} aria-current={active === '' ? 'page' : undefined}>
        Все товары
      </Link>
      {[...(data ?? [])]
        .sort((a, b) => categoryInfo(a.name).label.localeCompare(categoryInfo(b.name).label, 'ru'))
        .map((category) => (
          <Link
            key={category.name}
            to={href(category.name)}
            className={styles.category}
            aria-current={active === category.name ? 'page' : undefined}
          >
            {categoryInfo(category.name).label}
            <span className={styles.count}>{category.count}</span>
          </Link>
        ))}
    </nav>
  );
}

const readPrice = (value: string | null) => {
  const n = Number(value);
  return value !== null && value !== '' && Number.isInteger(n) && n >= 0 ? n : undefined;
};

/** Всё состояние каталога — в адресе: ссылкой на подборку можно поделиться, «Назад» работает как ожидается */
function readFilters(params: URLSearchParams): Filters {
  const sort = params.get('sort');
  return {
    sort: sort && sort in SORT_LABELS ? (sort as ProductSort) : 'default',
    inStock: params.get('in_stock') === '1',
    min: readPrice(params.get('min')),
    max: readPrice(params.get('max')),
  };
}

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const filters = readFilters(params);
  const filtered = filters.inStock || filters.min !== undefined || filters.max !== undefined;

  const products = useProducts({
    q,
    category,
    page,
    sort: filters.sort === 'default' ? undefined : filters.sort,
    inStock: filters.inStock,
    minPrice: filters.min === undefined ? undefined : filters.min * 100,
    maxPrice: filters.max === undefined ? undefined : filters.max * 100,
  });

  const changeFilters = (next: Filters) => {
    const updated = new URLSearchParams(params);
    const set = (key: string, value: string | undefined) =>
      value === undefined ? updated.delete(key) : updated.set(key, value);
    set('sort', next.sort === 'default' ? undefined : next.sort);
    set('in_stock', next.inStock ? '1' : undefined);
    set('min', next.min?.toString());
    set('max', next.max?.toString());
    updated.delete('page'); // новые условия — с первой страницы
    setParams(updated);
  };

  const resetFilters = () => changeFilters({ sort: filters.sort, inStock: false });
  const pages = products.data ? Math.max(1, Math.ceil(products.data.total / PAGE_SIZE)) : 1;

  useEffect(() => {
    document.title = q ? `«${q}» — Дүкен` : 'Дүкен — электроника и товары для дома';
  }, [q]);

  const goToPage = (next: number) => {
    const updated = new URLSearchParams(params);
    if (next === 1) updated.delete('page');
    else updated.set('page', String(next));
    setParams(updated);
    window.scrollTo({ top: 0 });
  };

  const title = q ? `Поиск: «${q}»` : category ? categoryInfo(category).label : 'Каталог';

  return (
    <div className={styles.layout}>
      <Categories active={category} q={q} />
      <section className={styles.results} aria-busy={products.isFetching}>
        <header className={styles.heading}>
          <h1>{title}</h1>
          {products.data && (
            <p className={styles.total} data-testid="total">
              {products.data.total} {plural(products.data.total, ['товар', 'товара', 'товаров'])}
            </p>
          )}
        </header>

        {!q && !category && !filtered && page === 1 && <PromoBanner />}

        <CatalogFilters value={filters} onChange={changeFilters} />

        {products.isPending && (
          <div className={styles.grid}>
            {Array.from({ length: 6 }, (_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        )}

        {products.isError && <ErrorState error={products.error} onRetry={() => void products.refetch()} />}

        {products.data?.items.length === 0 && (
          <EmptyState
            title="Ничего не нашлось"
            text={
              filtered
                ? 'Под эти условия товаров нет — попробуйте их ослабить.'
                : q
                  ? 'Попробуйте другое слово или посмотрите все товары.'
                  : 'В этой категории пока пусто.'
            }
            action={
              filtered ? (
                <button type="button" className={styles.reset} onClick={resetFilters}>
                  Сбросить фильтры
                </button>
              ) : (
                <Link to="/" className={styles.reset}>
                  Смотреть все товары
                </Link>
              )
            }
          />
        )}

        {products.data && products.data.items.length > 0 && (
          <>
            <div className={styles.grid} style={{ opacity: products.isPlaceholderData ? 0.6 : 1 }}>
              {products.data.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <Pagination page={Math.min(page, pages)} pages={pages} onChange={goToPage} />
          </>
        )}
      </section>
    </div>
  );
}
