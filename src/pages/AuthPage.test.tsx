import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderPage } from '@/test/render';
import { API, appError, server } from '@/test/server';
import { AuthPage } from './AuthPage';

it('проверяет поля до отправки — понятным языком', async () => {
  const { user } = renderPage(<AuthPage mode="register" />);
  await user.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));
  expect(await screen.findByText('Введите email')).toBeInTheDocument();
  expect(screen.getByText('Пароль — не короче 8 символов')).toBeInTheDocument();
  expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');

  await user.type(screen.getByLabelText('Email'), 'aibol@mail');
  await user.tab();
  expect(await screen.findByText('Email выглядит так: name@mail.kz')).toBeInTheDocument();
});

it('ошибка сервера показывается над формой', async () => {
  server.use(
    http.post(`${API}/auth/login`, () => appError(401, 'bad_credentials', 'Неверный email или пароль')),
  );
  const { user } = renderPage(<AuthPage mode="login" />);
  await user.type(screen.getByLabelText('Email'), 'aibol@mail.kz');
  await user.type(screen.getByLabelText('Пароль'), 'wrong-password');
  await user.click(screen.getByRole('button', { name: 'Войти' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Неверный email или пароль');
});

it('после входа возвращает туда, откуда пришли', async () => {
  server.use(
    http.post(`${API}/auth/login`, () => HttpResponse.json({ access_token: 't', token_type: 'bearer' })),
  );
  const { user } = renderPage(<AuthPage mode="login" />, {
    route: '/login?next=%2Fcheckout',
    path: '/login',
  });
  await user.type(screen.getByLabelText('Email'), 'aibol@mail.kz');
  await user.type(screen.getByLabelText('Пароль'), 'secret-pass');
  await user.click(screen.getByRole('button', { name: 'Войти' }));
  expect(await screen.findByText('другая страница')).toBeInTheDocument();
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/checkout$/);
});

it.each(['//evil.example', 'https://evil.example', 'javascript:alert(1)'])(
  'не уводит на чужой сайт: next=%s',
  async (next) => {
    server.use(
      http.post(`${API}/auth/login`, () => HttpResponse.json({ access_token: 't', token_type: 'bearer' })),
    );
    const { user } = renderPage(<AuthPage mode="login" />, {
      route: `/login?next=${encodeURIComponent(next)}`,
      path: '/login',
    });
    await user.type(screen.getByLabelText('Email'), 'aibol@mail.kz');
    await user.type(screen.getByLabelText('Пароль'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/));
  },
);
