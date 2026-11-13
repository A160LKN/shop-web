import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router';
import { Spinner } from '@/components/States';
import styles from './Admin.module.css';

export function AdminLayout() {
  return (
    <div className={styles.layout}>
      <header className={styles.top}>
        <h1>Админка</h1>
        <nav className={styles.tabs} aria-label="Разделы админки">
          <NavLink to="/admin" end>
            Сводка
          </NavLink>
          <NavLink to="/admin/orders">Заказы</NavLink>
          <NavLink to="/admin/products">Товары</NavLink>
          <NavLink to="/admin/promos">Промокоды</NavLink>
        </nav>
      </header>
      <Suspense fallback={<Spinner />}>
        <Outlet />
      </Suspense>
    </div>
  );
}
