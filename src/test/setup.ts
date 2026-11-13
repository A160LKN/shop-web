import '@testing-library/jest-dom/vitest';
import './matchMedia';
import { cleanup } from '@testing-library/react';
import { server } from './server';

// Любой запрос, который тест не описал, — ошибка теста, а не тихий поход в сеть
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
  localStorage.clear();
});
afterAll(() => server.close());
