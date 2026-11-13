import { formatMoney, parseTenge, tiynToInput } from './money';

const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');

describe('formatMoney', () => {
  it.each([
    [1_249_000, '12 490 ₸'],
    [99_950, '999,5 ₸'],
    [1, '0,01 ₸'],
    [100_000_000_000, '1 000 000 000 ₸'],
  ])('%i тиын → %s', (tiyn, expected) => {
    expect(plain(formatMoney(tiyn))).toBe(expected);
  });

  it('между числом и ₸ — неразрывный пробел: знак валюты не переносится на новую строку', () => {
    expect(formatMoney(100)).toContain(' ₸');
  });
});

describe('parseTenge', () => {
  it.each([
    ['12490', 1_249_000],
    ['12 490', 1_249_000],
    ['12490,5', 1_249_050],
    ['12490.50', 1_249_050],
    ['0,01', 1],
    ['0', 0],
  ])('«%s» → %i тиын', (input, expected) => {
    expect(parseTenge(input)).toBe(expected);
  });

  it.each(['', 'abc', '12,345', '-5', '1e3', '12.4.5', ','])('«%s» — не сумма', (input) => {
    expect(parseTenge(input)).toBeNull();
  });

  it('туда и обратно — то же значение', () => {
    for (const tiyn of [1, 50, 99_950, 1_249_000, 1_249_050]) {
      expect(parseTenge(tiynToInput(tiyn))).toBe(tiyn);
    }
  });
});
