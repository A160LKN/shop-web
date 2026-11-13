import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import type { Product } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { useCategories, useCreateProduct, useProduct, useUpdateProduct } from '@/api/queries';
import { Button, ButtonLink } from '@/components/Button';
import { Field } from '@/components/Field';
import { ErrorState, Notice, Spinner } from '@/components/States';
import { parseTenge, tiynToInput } from '@/lib/money';
import { useToast } from '@/components/Toaster';
import styles from './Admin.module.css';

const MAX_PRICE = 100_000_000_000; // 1 млрд ₸ — как в API

const schema = z.object({
  name: z.string().trim().min(1, 'Введите название').max(200, 'Не длиннее 200 символов'),
  category: z
    .string()
    .trim()
    .min(1, 'Укажите категорию')
    .max(50, 'Не длиннее 50 символов')
    .regex(/^[a-z0-9_-]+$/, 'Латиница в нижнем регистре, например home'),
  price: z.string().transform((value, ctx) => {
    const tiyn = parseTenge(value);
    if (tiyn === null) {
      ctx.addIssue({ code: 'custom', message: 'Цена — число, например 12490 или 12490,50' });
      return z.NEVER;
    }
    if (tiyn <= 0) {
      ctx.addIssue({ code: 'custom', message: 'Цена должна быть больше нуля' });
      return z.NEVER;
    }
    if (tiyn > MAX_PRICE) {
      ctx.addIssue({ code: 'custom', message: 'Не больше 1 000 000 000 ₸' });
      return z.NEVER;
    }
    return tiyn;
  }),
  stock: z
    .string()
    .regex(/^\d+$/, 'Остаток — целое число от 0')
    .transform(Number)
    .refine((n) => n <= 1_000_000, 'Не больше 1 000 000'),
});
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

function ProductForm({ product }: { product?: Product }) {
  const navigate = useNavigate();
  const categories = useCategories();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const mutation = product ? update : create;
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: product
      ? {
          name: product.name,
          category: product.category,
          price: tiynToInput(product.price),
          stock: String(product.stock),
        }
      : { name: '', category: '', price: '', stock: '0' },
  });

  const onSubmit = handleSubmit((values) => {
    const done = () => {
      toast({ text: product ? `«${values.name}» сохранён` : `«${values.name}» добавлен в каталог` });
      void navigate('/admin/products');
    };
    if (product) update.mutate({ id: product.id, body: values }, { onSuccess: done });
    else create.mutate(values, { onSuccess: done });
  });

  return (
    <form className={styles.form} onSubmit={(e) => void onSubmit(e)} noValidate>
      <h2>{product ? 'Изменить товар' : 'Новый товар'}</h2>
      {mutation.isError && <Notice tone="error">{errorMessage(mutation.error)}</Notice>}
      <Field label="Название" error={errors.name?.message} {...register('name')} />
      <Field
        label="Категория"
        list="categories"
        hint="Код категории латиницей: electronics, home, accessories, food"
        error={errors.category?.message}
        {...register('category')}
      />
      <datalist id="categories">
        {categories.data?.map((c) => (
          <option key={c.name} value={c.name} />
        ))}
      </datalist>
      <div className={styles.formRow}>
        <Field label="Цена, ₸" inputMode="decimal" error={errors.price?.message} {...register('price')} />
        <Field
          label="Остаток, шт."
          inputMode="numeric"
          error={errors.stock?.message}
          {...register('stock')}
        />
      </div>
      <div className={styles.formActions}>
        <Button type="submit" loading={mutation.isPending}>
          {product ? 'Сохранить' : 'Добавить товар'}
        </Button>
        <ButtonLink to="/admin/products" variant="ghost">
          Отмена
        </ButtonLink>
      </div>
    </form>
  );
}

export function ProductFormPage() {
  const { id } = useParams();
  const product = useProduct(Number(id));
  if (!id) return <ProductForm />;
  if (product.isPending) return <Spinner />;
  if (product.isError) return <ErrorState error={product.error} />;
  return <ProductForm product={product.data} />;
}
