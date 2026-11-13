import type { CategoryIcon } from './categories';

export type IconName =
  | CategoryIcon
  | 'headphones'
  | 'watch'
  | 'speaker'
  | 'book'
  | 'battery'
  | 'vacuum'
  | 'coffeeMachine'
  | 'drop'
  | 'pot'
  | 'cup'
  | 'umbrella'
  | 'leaf'
  | 'jar'
  | 'bowl';

// Порядок важен: «чайник» проверяется раньше «чая», «кофеварка» — раньше «кофе».
// \b в JavaScript понимает только латиницу, поэтому начало слова — (^|[^а-яё])
const RULES: [RegExp, IconName][] = [
  [/наушник/, 'headphones'],
  [/час(ы|ов)/, 'watch'],
  [/колонк/, 'speaker'],
  [/книг|ридер/, 'book'],
  [/powerbank|аккумулятор|power bank/, 'battery'],
  [/смартфон|телефон/, 'phone'],
  [/чайник/, 'kettle'],
  [/пылесос/, 'vacuum'],
  [/кофевар|кофемаш/, 'coffeeMachine'],
  [/увлажн/, 'drop'],
  [/посуд|кастрюл|сковород/, 'pot'],
  [/рюкзак|сумк/, 'bag'],
  [/кружк|термос|стакан/, 'cup'],
  [/зонт/, 'umbrella'],
  [/кофе/, 'beans'],
  [/(^|[^а-яё])ча[йя]/, 'leaf'],
  [/(^|[^а-яё])м[её]д([^а-яё]|$)|варенье|джем/, 'jar'],
  [/курт|орех|сухофрукт/, 'bowl'],
];

/** Иконка по названию товара; если ничего не подошло — иконка категории. */
export function iconFor(name: string, fallback: CategoryIcon): IconName {
  const lower = name.toLowerCase();
  return RULES.find(([pattern]) => pattern.test(lower))?.[1] ?? fallback;
}
