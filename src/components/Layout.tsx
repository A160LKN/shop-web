import { useState, type SyntheticEvent } from 'react';
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';
import { useCart } from '@/cart/CartProvider';
import { useTheme } from '@/lib/theme';
import { Icon } from './Icon';
import { WakeUpNotice } from './WakeUpNotice';
import styles from './Layout.module.css';

function Search() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [value, setValue] = useState(params.get('q') ?? '');

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    const q = value.trim();
    void navigate(q ? `/?q=${encodeURIComponent(q)}` : '/');
  };

  return (
    <form role="search" className={styles.search} onSubmit={submit}>
      <label htmlFor="site-search" className="visually-hidden">
        Поиск товаров
      </label>
      <input
        id="site-search"
        type="search"
        placeholder="Чайник, наушники, кофе…"
        value={value}
        maxLength={100}
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit">Найти</button>
    </form>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>
        Перейти к содержимому
      </a>
      <header className={styles.header}>
        <div className={styles.bar}>
          <Link to="/" className={styles.logo} aria-label="Дүкен — на главную">
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path d="M6 4h14l8 8v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="var(--tag)" />
              <circle cx="11" cy="11" r="2.5" fill="var(--tag-ink)" />
            </svg>
            Дүкен
          </Link>
          <Search />
          <nav className={styles.nav} aria-label="Основное меню">
            <button
              type="button"
              className={styles.iconButton}
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
              title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
            {user ? (
              <>
                {user.role === 'admin' && (
                  <NavLink to="/admin" className={styles.link}>
                    <Icon name="chart" />
                    <span className={styles.label}>Админка</span>
                  </NavLink>
                )}
                <NavLink to="/orders" className={styles.link} end>
                  <Icon name="box" />
                  <span className={styles.label}>Заказы</span>
                </NavLink>
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => {
                    logout();
                    void navigate('/');
                  }}
                >
                  <Icon name="logout" />
                  <span className={styles.label}>Выйти</span>
                </button>
              </>
            ) : (
              <NavLink to="/login" className={styles.link}>
                <Icon name="user" />
                <span className={styles.label}>Войти</span>
              </NavLink>
            )}
            <NavLink to="/cart" className={styles.cart} data-testid="cart-link">
              <Icon name="cart" />
              <span className={styles.label}>Корзина</span>
              {count > 0 && (
                <span className={styles.badge} data-testid="cart-count" aria-label={`товаров: ${count}`}>
                  {count}
                </span>
              )}
            </NavLink>
          </nav>
        </div>
      </header>
      <main id="main" className={styles.main}>
        <div className={styles.wake}>
          <WakeUpNotice />
        </div>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p className={styles.footerBrand}>Дүкен</p>
          <p>Учебный магазин: оплата тестовая, деньги не списываются.</p>
          <p>
            Код —{' '}
            <a href="https://github.com/A160LKN/shop-web" target="_blank" rel="noreferrer">
              фронтенд
            </a>{' '}
            и{' '}
            <a href="https://github.com/A160LKN/shop-api" target="_blank" rel="noreferrer">
              бэкенд
            </a>{' '}
            на GitHub
          </p>
        </div>
      </footer>
    </div>
  );
}
