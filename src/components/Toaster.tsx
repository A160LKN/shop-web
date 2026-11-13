import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import styles from './Toaster.module.css';

interface Toast {
  id: number;
  text: string;
  tone: 'success' | 'info' | 'error';
  action?: { label: string; to: string };
}
type ToastInput = Omit<Toast, 'id' | 'tone'> & { tone?: Toast['tone'] };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);
const LIFETIME = 4000;

/**
 * Короткие уведомления о результате действия: «Добавлено в корзину», «Заказ отправлен».
 * Экранный диктор их зачитывает (aria-live), они не перекрывают контент и исчезают сами.
 */
export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (input: ToastInput) => {
      const toast: Toast = { tone: 'success', ...input, id: nextId.current++ };
      // не больше трёх сразу — новые важнее старых
      setToasts((current) => [...current.slice(-2), toast]);
      window.setTimeout(() => dismiss(toast.id), LIFETIME);
    },
    [dismiss],
  );

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext value={value}>
      {children}
      <div className={styles.region} aria-live="polite" aria-label="Уведомления">
        {toasts.map((toast) => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.tone]}`} data-testid="toast">
            <span>{toast.text}</span>
            {toast.action && (
              <Link to={toast.action.to} className={styles.action} onClick={() => dismiss(toast.id)}>
                {toast.action.label}
              </Link>
            )}
            <button
              type="button"
              className={styles.close}
              onClick={() => dismiss(toast.id)}
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast вызван вне Toaster');
  return context;
}
