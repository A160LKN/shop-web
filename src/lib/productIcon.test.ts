import { iconFor } from './productIcon';

it.each([
  ['Чайник Xiaomi Mi Kettle', 'kettle'],
  ['Чай зелёный жасминовый', 'leaf'],
  ['Кофеварка De’Longhi', 'coffeeMachine'],
  ['Кофе в зёрнах 1 кг', 'beans'],
  ['Наушники JBL', 'headphones'],
  ['Смарт-часы Xiaomi', 'watch'],
  ['Powerbank Anker', 'battery'],
  ['Мёд горный', 'jar'],
] as const)('«%s» → %s', (name, icon) => {
  expect(iconFor(name, 'box')).toBe(icon);
});

it('неизвестный товар получает иконку категории', () => {
  expect(iconFor('Что-то новое', 'bag')).toBe('bag');
});

it('слово внутри другого слова не считается: «медведь» — не мёд', () => {
  expect(iconFor('Игрушка медведь', 'box')).toBe('box');
});
