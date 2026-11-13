/** Ошибка API в одном виде для всего приложения: код — для логики, текст — для человека. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface AppErrorBody {
  error: { code: string; message: string };
}
interface ValidationErrorBody {
  detail: { loc: (string | number)[]; msg: string }[];
}

const isAppError = (body: unknown): body is AppErrorBody =>
  typeof body === 'object' && body !== null && 'error' in body;
const isValidationError = (body: unknown): body is ValidationErrorBody =>
  typeof body === 'object' && body !== null && Array.isArray((body as { detail?: unknown }).detail);

/** Тело ошибки от Shop API → ApiError. Понимает и ошибки бизнес-логики, и 422 от валидации. */
export function toApiError(status: number, body: unknown): ApiError {
  if (isAppError(body)) return new ApiError(status, body.error.code, body.error.message);
  if (status === 422 && isValidationError(body)) {
    const fields = Object.fromEntries(
      body.detail.map((item) => [String(item.loc[item.loc.length - 1]), item.msg] as const),
    );
    return new ApiError(422, 'validation', 'Проверьте введённые данные', fields);
  }
  if (status >= 500)
    return new ApiError(status, 'server', 'Что-то сломалось на сервере. Попробуйте через минуту');
  return new ApiError(status, 'unknown', `Неожиданный ответ сервера (${status})`);
}

export const networkError = () =>
  new ApiError(0, 'network', 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз');

/** Текст ошибки для показа: ApiError — как есть, всё остальное — общий текст. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Что-то пошло не так. Попробуйте ещё раз';
}
