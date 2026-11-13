import { ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/States';

export function NotFoundPage() {
  return (
    <EmptyState
      title="Страница не найдена"
      text="Ссылка устарела или в ней опечатка."
      action={<ButtonLink to="/">В каталог</ButtonLink>}
    />
  );
}
