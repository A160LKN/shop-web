import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ApiError } from '@/api/errors';
import { AuthProvider } from '@/auth/AuthProvider';
import { CartProvider } from '@/cart/CartProvider';
import { Toaster } from '@/components/Toaster';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Повторять имеет смысл только сбои сети и сервера: 404 или 403 от повтора не исправятся
        retry: (failures, error) =>
          failures < 2 && (!(error instanceof ApiError) || error.status === 0 || error.status >= 500),
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function Providers({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <Toaster>{children}</Toaster>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
