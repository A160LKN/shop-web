import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Product } from '@/api/client';
import { readStorage, writeStorage } from '@/lib/storage';

/** В корзине хранится снимок товара: цена и остаток уточняются на сервере при оформлении. */
export interface CartItem {
  productId: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  quantity: number;
  /** Цена, по которой товар добавили, если с тех пор она изменилась — чтобы честно предупредить */
  priceWas?: number;
}

export const MAX_QUANTITY = 100; // лимит API на одну позицию заказа
const KEY = 'duken.cart';

interface CartState {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (product: Product, quantity?: number) => void;
  /** Обновить цену и остаток из свежих данных, не трогая количество */
  refresh: (product: Product) => void;
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  quantityOf: (productId: number) => number;
}

const CartContext = createContext<CartState | null>(null);

const limitFor = (stock: number) => Math.max(0, Math.min(stock, MAX_QUANTITY));

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readStorage<CartItem[]>(KEY, []));

  useEffect(() => writeStorage(KEY, items), [items]);

  const add = useCallback((product: Product, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      const limit = limitFor(product.stock);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                price: product.price,
                stock: product.stock,
                quantity: Math.min(item.quantity + quantity, limit),
              }
            : item,
        );
      }
      if (limit === 0) return current;
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          stock: product.stock,
          quantity: Math.min(quantity, limit),
        },
      ];
    });
  }, []);

  const refresh = useCallback((product: Product) => {
    setItems((current) => {
      const item = current.find((i) => i.productId === product.id);
      if (!item || (item.price === product.price && item.stock === product.stock)) return current;
      return current.map((i) =>
        i.productId === product.id
          ? {
              ...i,
              price: product.price,
              stock: product.stock,
              priceWas: product.price !== i.price ? (i.priceWas ?? i.price) : i.priceWas,
            }
          : i,
      );
    });
  }, []);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setItems((current) =>
      current.flatMap((item) => {
        if (item.productId !== productId) return [item];
        const next = Math.min(Math.trunc(quantity), limitFor(item.stock));
        return next > 0 ? [{ ...item, quantity: next }] : [];
      }),
    );
  }, []);

  const remove = useCallback(
    (productId: number) => setItems((current) => current.filter((item) => item.productId !== productId)),
    [],
  );
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartState>(() => {
    const quantities = new Map(items.map((item) => [item.productId, item.quantity]));
    return {
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      add,
      refresh,
      setQuantity,
      remove,
      clear,
      quantityOf: (productId) => quantities.get(productId) ?? 0,
    };
  }, [items, add, refresh, setQuantity, remove, clear]);

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart(): CartState {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart вызван вне CartProvider');
  return context;
}
