import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { EmptyState, Spinner } from '@/components/States';
import { ButtonLink } from '@/components/Button';
import { useAuth } from './AuthProvider';

/** Страница только для вошедших: остальных отправляем на вход и возвращаем обратно после него. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (checking) return <Spinner />;
  if (!user)
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return children;
}

/** Страница только для администратора. Интерфейс лишь прячет её — права всё равно проверяет API. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, checking } = useAuth();
  if (checking) return <Spinner />;
  if (!user) return <RequireAuth>{children}</RequireAuth>;
  if (user.role !== 'admin') {
    return (
      <EmptyState
        title="Нет доступа"
        text="Этот раздел только для администраторов магазина."
        action={<ButtonLink to="/">В каталог</ButtonLink>}
      />
    );
  }
  return children;
}
