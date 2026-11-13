import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { errorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Notice } from '@/components/States';
import styles from './AuthPage.module.css';

// Те же правила, что у API: проверяем сразу, не дожидаясь ответа сервера
const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Введите email')
    .max(254, 'Слишком длинный email')
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Email выглядит так: name@mail.kz'),
  password: z.string().min(8, 'Пароль — не короче 8 символов').max(128, 'Пароль — не длиннее 128 символов'),
});
type Form = z.infer<typeof schema>;

/** Только относительные пути внутри сайта — иначе ?next=https://evil.example увёл бы после входа на чужой сайт */
const safeNext = (next: string | null) => (next?.startsWith('/') && !next.startsWith('//') ? next : '/');

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { login, register: signUp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [serverError, setServerError] = useState<string | null>(null);
  const isLogin = mode === 'login';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema), mode: 'onTouched' });

  useEffect(() => {
    document.title = `${isLogin ? 'Вход' : 'Регистрация'} — Дүкен`;
    setServerError(null);
  }, [isLogin]);

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    try {
      await (isLogin ? login(data) : signUp(data));
      void navigate(next, { replace: true });
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  const otherHref = `${isLogin ? '/register' : '/login'}${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <div className={styles.page}>
      <form className={styles.form} onSubmit={(e) => void onSubmit(e)} noValidate>
        <h1>{isLogin ? 'Вход' : 'Регистрация'}</h1>
        {serverError && <Notice tone="error">{serverError}</Notice>}
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Field
          label="Пароль"
          type="password"
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          hint={isLogin ? undefined : 'Не короче 8 символов'}
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" size="lg" loading={isSubmitting}>
          {isLogin ? 'Войти' : 'Зарегистрироваться'}
        </Button>
        <p className={styles.switch}>
          {isLogin ? 'Впервые у нас?' : 'Уже есть аккаунт?'}{' '}
          <Link to={otherHref}>{isLogin ? 'Зарегистрироваться' : 'Войти'}</Link>
        </p>
      </form>
    </div>
  );
}
