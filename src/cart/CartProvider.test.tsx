import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { product } from '@/test/server';
import { CartProvider, useCart } from './CartProvider';

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;
const setup = () => renderHook(() => useCart(), { wrapper });

it('считает количество и сумму', () => {
  const { result } = setup();
  act(() => {
    result.current.add(product({ id: 1, price: 10_000_00 }), 2);
    result.current.add(product({ id: 2, price: 500_00 }));
  });
  expect(result.current.count).toBe(3);
  expect(result.current.subtotal).toBe(20_500_00);
});

it('повторное добавление увеличивает количество, а не дублирует позицию', () => {
  const { result } = setup();
  act(() => {
    result.current.add(product());
    result.current.add(product());
  });
  expect(result.current.items).toHaveLength(1);
  expect(result.current.quantityOf(1)).toBe(2);
});

it('нельзя положить больше, чем есть на складе', () => {
  const { result } = setup();
  act(() => result.current.add(product({ stock: 3 }), 10));
  expect(result.current.quantityOf(1)).toBe(3);
});

it('не больше 100 штук одной позиции — лимит API', () => {
  const { result } = setup();
  act(() => result.current.add(product({ stock: 1000 }), 150));
  expect(result.current.quantityOf(1)).toBe(100);
});

it('товар без остатка в корзину не попадает', () => {
  const { result } = setup();
  act(() => result.current.add(product({ stock: 0 })));
  expect(result.current.items).toHaveLength(0);
});

it('количество 0 удаляет позицию', () => {
  const { result } = setup();
  act(() => result.current.add(product()));
  act(() => result.current.setQuantity(1, 0));
  expect(result.current.items).toHaveLength(0);
});

it('обновление цены запоминает старую — чтобы предупредить покупателя', () => {
  const { result } = setup();
  act(() => result.current.add(product({ price: 10_000_00 })));
  act(() => result.current.refresh(product({ price: 12_000_00 })));
  expect(result.current.items[0]).toMatchObject({ price: 12_000_00, priceWas: 10_000_00, quantity: 1 });
});

it('корзина переживает перезагрузку страницы', () => {
  const first = setup();
  act(() => first.result.current.add(product(), 2));
  first.unmount();
  expect(setup().result.current.quantityOf(1)).toBe(2);
});

it('без localStorage корзина всё равно работает', () => {
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('QuotaExceeded');
  });
  const { result } = setup();
  act(() => result.current.add(product()));
  expect(result.current.count).toBe(1);
  spy.mockRestore();
});
