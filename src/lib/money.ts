// Деньги в API — целые тиыны (1 ₸ = 100 тиын): без ошибок округления дробных чисел.

const formatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

/** 1249000 → «12 490 ₸», 99950 → «999,5 ₸» */
export function formatMoney(tiyn: number): string {
  return `${formatter.format(tiyn / 100)}\u00a0₸`;
}

/**
 * Строка из поля ввода в тенге → тиыны. «12 490», «12490,50», «12490.5» — понимает всё.
 * Возвращает null, если это не сумма или в ней больше двух знаков после запятой.
 */
export function parseTenge(input: string): number | null {
  const normalized = input.replace(/[\s ]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole = '0', fraction = ''] = normalized.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** Тиыны → строка для поля ввода: 1249050 → «12490,5» */
export function tiynToInput(tiyn: number): string {
  const whole = Math.trunc(tiyn / 100);
  const fraction = tiyn % 100;
  if (fraction === 0) return String(whole);
  return `${whole},${String(fraction).padStart(2, '0').replace(/0$/, '')}`;
}
