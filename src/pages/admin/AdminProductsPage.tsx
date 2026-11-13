import { useState } from 'react';
import { Link } from 'react-router';
import { errorMessage } from '@/api/errors';
import { PAGE_SIZE, useDeleteProduct, useProducts } from '@/api/queries';
import { Button, ButtonLink } from '@/components/Button';
import { Pagination } from '@/components/Pagination';
import { EmptyState, ErrorState, Notice, Spinner } from '@/components/States';
import { categoryInfo } from '@/lib/categories';
import { formatMoney } from '@/lib/money';
import { useToast } from '@/components/Toaster';
import styles from './Admin.module.css';

export function AdminProductsPage() {
  const [page, setPage] = useState(1);
  const products = useProducts({ page });
  const remove = useDeleteProduct();
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const toast = useToast();

  if (products.isPending) return <Spinner />;
  if (products.isError) return <ErrorState error={products.error} onRetry={() => void products.refetch()} />;

  const pages = Math.max(1, Math.ceil(products.data.total / PAGE_SIZE));

  return (
    <section className={styles.layout}>
      <div className={styles.toolbar}>
        <p className={styles.muted}>Товаров в каталоге: {products.data.total}</p>
        <ButtonLink to="/admin/products/new">Добавить товар</ButtonLink>
      </div>
      {remove.isError && <Notice tone="error">{errorMessage(remove.error)}</Notice>}
      {products.data.items.length === 0 ? (
        <EmptyState title="Каталог пуст" text="Добавьте первый товар." />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Товар</th>
                <th>Категория</th>
                <th className={styles.num}>Цена</th>
                <th className={styles.num}>Остаток</th>
                <th className={styles.num}>
                  <span className="visually-hidden">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.data.items.map((product) => (
                <tr key={product.id} data-testid="admin-product-row">
                  <td className={styles.wrap}>
                    <Link to={`/products/${product.id}`}>{product.name}</Link>
                  </td>
                  <td>{categoryInfo(product.category).label}</td>
                  <td className={styles.num}>{formatMoney(product.price)}</td>
                  <td className={styles.num}>{product.stock}</td>
                  <td>
                    <div className={styles.rowActions}>
                      {confirmId === product.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="danger"
                            loading={remove.isPending}
                            onClick={() =>
                              remove.mutate(product.id, {
                                onSuccess: () =>
                                  toast({ text: `«${product.name}» снят с продажи`, tone: 'info' }),
                                onSettled: () => setConfirmId(null),
                              })
                            }
                          >
                            Да, снять
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                            Отмена
                          </Button>
                        </>
                      ) : (
                        <>
                          <ButtonLink size="sm" variant="secondary" to={`/admin/products/${product.id}/edit`}>
                            Изменить
                          </ButtonLink>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmId(product.id)}
                            aria-label={`Снять с продажи «${product.name}»`}
                          >
                            Снять
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={pages} onChange={setPage} />
    </section>
  );
}
