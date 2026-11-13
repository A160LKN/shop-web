import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { tokenStore } from '@/auth/token';
import { createQueryClient, Providers } from '@/providers';

/** Показывает текущий адрес — чтобы проверять переходы */
function Location() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

interface Options {
  route?: string;
  path?: string;
  loggedIn?: boolean;
}

/** Рендер страницы со всеми провайдерами: свой кеш запросов на каждый тест, роутер в памяти. */
export function renderPage(ui: ReactElement, { route = '/', path = '*', loggedIn = false }: Options = {}) {
  tokenStore.set(loggedIn ? 'test-token' : null);
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, retry: false } });
  return {
    user: userEvent.setup(),
    queryClient,
    ...render(
      <MemoryRouter initialEntries={[route]}>
        <Providers queryClient={queryClient}>
          <Routes>
            <Route path={path} element={ui} />
            <Route path="*" element={<p>другая страница</p>} />
          </Routes>
          <Location />
        </Providers>
      </MemoryRouter>,
    ),
  };
}
