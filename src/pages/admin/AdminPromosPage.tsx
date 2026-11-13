import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Promo } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { useCreatePromo, usePromos } from '@/api/queries';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { EmptyState, ErrorState, Notice, Spinner } from '@/components/States';
import { formatMoney, parseTenge } from '@/lib/money';
import { formatDate } from '@/lib/orders';
import styles from './Admin.module.css';

const schema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,32}$/, 'От 3 до 32 символов: латиница, цифры, - и _'),
  percent: z
    .string()
    .regex(/^\d+$/, 'Целое число')
    .transform(Number)
    .refine((n) => n >= 1 && n <= 90, 'От 1 до 90 %'),
  min_order_total: z.string().transform((value, ctx) => {
    if (value.trim() === '') return 0;
    const tiyn = parseTenge(value);
    if (tiyn === null) {
      ctx.addIssue({ code: 'custom', message: 'Сумма в тенге, например 50000' });
      return z.NEVER;
    }
    return tiyn;
  }),
  max_uses: z
    .string()
    .regex(/^\d+$/, 'Целое число')
    .transform(Number)
    .refine((n) => n >= 1 && n <= 1_000_000, 'От 1 до 1 000 000'),
  expires_at: z
    .string()
    .min(1, 'Укажите дату')
    .refine((value) => new Date(value) > new Date(), 'Дата должна быть в будущем')
    .transform((value) => new Date(value).toISOString()), // локальное время браузера → UTC с часовым поясом
});
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

function promoState(promo: Promo): string {
  if (new Date(promo.expires_at) <= new Date()) return 'Истёк';
  if (promo.used_count >= promo.max_uses) return 'Исчерпан';
  return 'Действует';
}

function CreatePromo() {
  const create = useCreatePromo();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { code: '', percent: '10', min_order_total: '', max_uses: '100', expires_at: '' },
  });

  const onSubmit = handleSubmit((values) => create.mutate(values, { onSuccess: () => reset() }));

  return (
    <form className={styles.form} onSubmit={(e) => void onSubmit(e)} noValidate>
      <h2>Новый промокод</h2>
      {create.isError && <Notice tone="error">{errorMessage(create.error)}</Notice>}
      {create.isSuccess && <Notice tone="success">Промокод {create.data.code} создан</Notice>}
      <div className={styles.formRow}>
        <Field label="Код" placeholder="NEWYEAR" error={errors.code?.message} {...register('code')} />
        <Field
          label="Скидка, %"
          inputMode="numeric"
          error={errors.percent?.message}
          {...register('percent')}
        />
      </div>
      <div className={styles.formRow}>
        <Field
          label="Заказ от, ₸"
          inputMode="decimal"
          hint="Пусто — без ограничения"
          error={errors.min_order_total?.message}
          {...register('min_order_total')}
        />
        <Field
          label="Использований"
          inputMode="numeric"
          error={errors.max_uses?.message}
          {...register('max_uses')}
        />
      </div>
      <Field
        label="Действует до"
        type="datetime-local"
        error={errors.expires_at?.message}
        {...register('expires_at')}
      />
      <div className={styles.formActions}>
        <Button type="submit" loading={create.isPending}>
          Создать промокод
        </Button>
      </div>
    </form>
  );
}

export function AdminPromosPage() {
  const promos = usePromos();
  return (
    <section className={styles.layout}>
      <CreatePromo />
      {promos.isPending && <Spinner />}
      {promos.isError && <ErrorState error={promos.error} onRetry={() => void promos.refetch()} />}
      {promos.data?.length === 0 && <EmptyState title="Промокодов нет" />}
      {promos.data && promos.data.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Код</th>
                <th className={styles.num}>Скидка</th>
                <th className={styles.num}>Заказ от</th>
                <th className={styles.num}>Использовано</th>
                <th>До</th>
                <th>Состояние</th>
              </tr>
            </thead>
            <tbody>
              {promos.data.map((promo) => (
                <tr key={promo.id}>
                  <td>
                    <strong>{promo.code}</strong>
                  </td>
                  <td className={styles.num}>{promo.percent}%</td>
                  <td className={styles.num}>
                    {promo.min_order_total ? formatMoney(promo.min_order_total) : '—'}
                  </td>
                  <td className={styles.num}>
                    {promo.used_count} из {promo.max_uses}
                  </td>
                  <td>{formatDate(promo.expires_at)}</td>
                  <td>{promoState(promo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
