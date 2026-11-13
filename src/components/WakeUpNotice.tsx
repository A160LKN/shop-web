import { useEffect, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { Notice } from './States';

/** Через сколько миллисекунд ожидания показать подсказку. Обычный запрос укладывается в доли секунды. */
export const WAKE_UP_DELAY = 4000;

/**
 * Бесплатный хостинг API засыпает после простоя, и первый запрос идёт до минуты.
 * Если загрузка затянулась, объясняем, что происходит, вместо бесконечного спиннера.
 */
export function WakeUpNotice() {
  const fetching = useIsFetching() > 0;
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!fetching) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => {
      setSlow(true);
    }, WAKE_UP_DELAY);
    return () => {
      clearTimeout(timer);
    };
  }, [fetching]);

  if (!slow) return null;
  return (
    <Notice tone="warning">
      Сервер просыпается после простоя — это бесплатный хостинг, первая загрузка занимает до минуты.
    </Notice>
  );
}
