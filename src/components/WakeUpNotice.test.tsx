import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { WAKE_UP_DELAY, WakeUpNotice } from './WakeUpNotice';

function Harness({ request }: { request: () => Promise<string> }) {
  useQuery({ queryKey: ['slow'], queryFn: request });
  return <WakeUpNotice />;
}

function renderWith(request: () => Promise<string>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Harness request={request} />
    </QueryClientProvider>,
  );
  // TanStack Query сообщает о начале загрузки через setTimeout(0) — даём ему сработать
  act(() => {
    vi.advanceTimersByTime(1);
  });
}

const TEXT = /Сервер просыпается/;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

it('долгая загрузка — объясняет, что сервер просыпается', () => {
  renderWith(() => new Promise(() => {})); // ответ так и не пришёл
  act(() => {
    vi.advanceTimersByTime(WAKE_UP_DELAY - 100);
  });
  expect(screen.queryByText(TEXT)).not.toBeInTheDocument(); // обычная задержка — без лишних слов
  act(() => {
    vi.advanceTimersByTime(200);
  });
  expect(screen.getByText(TEXT)).toBeInTheDocument();
});

it('подсказка исчезает, когда сервер ответил', async () => {
  let answer: (value: string) => void = () => {};
  renderWith(
    () =>
      new Promise((resolve) => {
        answer = resolve;
      }),
  );
  act(() => {
    vi.advanceTimersByTime(WAKE_UP_DELAY + 100);
  });
  expect(screen.getByText(TEXT)).toBeInTheDocument();
  await act(async () => {
    answer('ok');
    await vi.advanceTimersByTimeAsync(10);
  });
  expect(screen.queryByText(TEXT)).not.toBeInTheDocument();
});
