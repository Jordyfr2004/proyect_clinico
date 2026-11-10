import { apiRequest, setAccessTokenProvider, setUnauthorizedHandler } from '../client';
import { ApiError, NetworkError, ResponseFormatError } from '../errors';
import { getApiBaseUrl } from '@/config/env';

const response = (status: number, body: unknown, retryAfter: string | null = null): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === 'retry-after' ? retryAfter : null) },
    text: jest.fn().mockResolvedValue(body === undefined ? '' : JSON.stringify(body)),
    blob: jest.fn().mockResolvedValue(body),
  }) as unknown as Response;

describe('API client', () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'https://clinic.example/api/';
    setAccessTokenProvider(() => null);
    setUnauthorizedHandler(() => undefined);
    globalThis.fetch = jest.fn();
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_API_URL = originalUrl;
  });

  test('rejects an absent or non-http API base URL', () => {
    expect(() => getApiBaseUrl('')).toThrow('EXPO_PUBLIC_API_URL');
    expect(() => getApiBaseUrl('ftp://clinic.example/api')).toThrow('EXPO_PUBLIC_API_URL');
  });

  test('sends JSON to the configured base URL with the bearer token', async () => {
    setAccessTokenProvider(() => 'secret-token');
    (globalThis.fetch as jest.Mock).mockResolvedValue(response(200, { data: { id: '1' } }));

    await expect(apiRequest('/agenda/mis-citas', { method: 'POST', body: { ok: true } })).resolves.toEqual({
      data: { id: '1' },
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://clinic.example/api/agenda/mis-citas',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ok: true }),
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer secret-token',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  test.each([403, 404, 409, 422, 429, 500, 503])(
    'preserves the semantics of HTTP %s errors',
    async (status) => {
      (globalThis.fetch as jest.Mock).mockResolvedValue(
        response(status, { message: 'Solicitud rechazada.', errors: { email: ['No válido.'] } }, '60'),
      );

      const promise = apiRequest('/resource');
      await expect(promise).rejects.toMatchObject({
        status,
        message: 'Solicitud rechazada.',
        fieldErrors: { email: ['No válido.'] },
        retryAfter: '60',
      } satisfies Partial<ApiError>);
    },
  );

  test('runs the unauthorized handler before rejecting a 401', async () => {
    const unauthorized = jest.fn();
    setUnauthorizedHandler(unauthorized);
    (globalThis.fetch as jest.Mock).mockResolvedValue(response(401, { message: 'No autenticado.' }));

    await expect(apiRequest('/user')).rejects.toBeInstanceOf(ApiError);
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });

  test('does not convert connection failures into successful empty data', async () => {
    (globalThis.fetch as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));

    await expect(apiRequest('/agenda/mis-citas')).rejects.toMatchObject({
      reason: 'connection',
    } satisfies Partial<NetworkError>);
  });

  test('rejects malformed JSON returned with a successful status', async () => {
    const malformed = response(200, undefined);
    (malformed.text as jest.Mock).mockResolvedValue('{bad json');
    (globalThis.fetch as jest.Mock).mockResolvedValue(malformed);

    await expect(apiRequest('/user')).rejects.toBeInstanceOf(ResponseFormatError);
  });

  test('aborts requests that exceed the configured timeout', async () => {
    (globalThis.fetch as jest.Mock).mockImplementation((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })),
        );
      }),
    );

    await expect(apiRequest('/slow', { timeoutMs: 1 })).rejects.toMatchObject({ reason: 'timeout' });
  });
});
