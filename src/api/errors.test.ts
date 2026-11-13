import { ApiError, errorMessage, toApiError } from './errors';

describe('toApiError', () => {
  it('ошибка бизнес-логики — код и текст от сервера', () => {
    const error = toApiError(409, { error: { code: 'out_of_stock', message: 'Недостаточно товара' } });
    expect(error).toMatchObject({ status: 409, code: 'out_of_stock', message: 'Недостаточно товара' });
  });

  it('422 от валидации — общий текст и ошибки по полям', () => {
    const error = toApiError(422, { detail: [{ loc: ['body', 'email'], msg: 'bad email' }] });
    expect(error.message).toBe('Проверьте введённые данные');
    expect(error.fields).toEqual({ email: 'bad email' });
  });

  it('500 без тела — человеческий текст, без технических подробностей', () => {
    expect(toApiError(500, 'Internal Server Error').message).toMatch(/сломалось на сервере/);
  });

  it('503 при перегрузке API — тоже понятный текст', () => {
    const error = toApiError(503, { error: { code: 'overloaded', message: 'Сервис перегружен' } });
    expect(error.code).toBe('overloaded');
  });
});

it('errorMessage прячет детали неизвестных ошибок', () => {
  expect(errorMessage(new TypeError('x is undefined'))).toBe('Что-то пошло не так. Попробуйте ещё раз');
  expect(errorMessage(new ApiError(404, 'not_found', 'Заказ не найден'))).toBe('Заказ не найден');
});
