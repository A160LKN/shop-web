import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { call, client, type User } from '@/api/client';
import { keys } from '@/api/queries';
import { tokenStore } from './token';

interface Credentials {
  email: string;
  password: string;
}

interface AuthState {
  user: User | null;
  /** true, пока проверяем сохранённый токен — чтобы не мигать «Войти» у вошедшего пользователя */
  checking: boolean;
  login: (credentials: Credentials) => Promise<User>;
  register: (credentials: Credentials) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(tokenStore.get);

  useEffect(() => tokenStore.subscribe(setToken), []);

  const me = useQuery({
    queryKey: [...keys.me, token],
    queryFn: () => call(client.GET('/auth/me')),
    enabled: token !== null,
    staleTime: Infinity,
    retry: false,
  });

  const login = useCallback(
    async (credentials: Credentials) => {
      const { access_token } = await call(client.POST('/auth/login', { body: credentials }));
      tokenStore.set(access_token);
      const user = await call(client.GET('/auth/me'));
      queryClient.setQueryData([...keys.me, access_token], user);
      void queryClient.invalidateQueries({ queryKey: keys.orders });
      return user;
    },
    [queryClient],
  );

  const register = useCallback(
    async (credentials: Credentials) => {
      await call(client.POST('/auth/register', { body: credentials }));
      return login(credentials);
    },
    [login],
  );

  const logout = useCallback(() => {
    tokenStore.set(null);
    queryClient.removeQueries({ queryKey: keys.orders });
    queryClient.removeQueries({ queryKey: ['order'] });
    queryClient.removeQueries({ queryKey: keys.promos });
  }, [queryClient]);

  const value = useMemo<AuthState>(
    () => ({
      user: token ? (me.data ?? null) : null,
      checking: token !== null && me.isPending,
      login,
      register,
      logout,
    }),
    [token, me.data, me.isPending, login, register, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth вызван вне AuthProvider');
  return context;
}
