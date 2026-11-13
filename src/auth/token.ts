// Токен доступа. Хранится в localStorage, чтобы вход переживал перезагрузку страницы;
// подписчики узнают о выходе — в том числе когда сервер ответил «токен истёк».
import { readStorage, writeStorage } from '@/lib/storage';

const KEY = 'duken.token';
type Listener = (token: string | null) => void;

let token: string | null = readStorage<string | null>(KEY, null);
const listeners = new Set<Listener>();

export const tokenStore = {
  get: () => token,
  set(next: string | null) {
    token = next;
    writeStorage(KEY, next);
    listeners.forEach((listener) => listener(next));
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },
};
