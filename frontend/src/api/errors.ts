export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fieldErrors: Record<string, string[]> = {},
    public readonly retryAfter: string | null = null,
    public readonly requiresVerification = false,
    public readonly verificationEmail: string | null = null,
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

export const apiErrorMessage = (reason: unknown, fallback: string): string => {
  if (reason instanceof ApiError) {
    const fields = Object.values(reason.fieldErrors).flat().filter(Boolean);
    if (fields.length) return fields.join('\n');
  }
  return reason instanceof Error ? reason.message : fallback;
};
