import { useEffect, useState } from 'react';
import { readStorage, writeStorage } from './storage';

type Theme = 'light' | 'dark';
const KEY = 'duken.theme';

const systemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

/** Тема: по умолчанию как в системе, выбор пользователя запоминается. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => readStorage<Theme | null>(KEY, null) ?? systemTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = () =>
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      writeStorage(KEY, next);
      return next;
    });

  return { theme, toggle };
}
