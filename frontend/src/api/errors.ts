export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fieldErrors: Record<string, string[]> = {},
    public readonly retryAfter: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly reason: 'connection' | 'timeout' = 'connection',
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ResponseFormatError extends Error {
  constructor() {
    super('La respuesta del servidor no tiene el formato esperado.');
    this.name = 'ResponseFormatError';
  }
}
