import { getApiBaseUrl } from "@/config/env";
import { ApiError, NetworkError, ResponseFormatError } from "./errors";

export type ApiRequestOptions<T> = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  parseResponse?: (response: Response) => Promise<T>;
};

let accessTokenProvider: () => string | null = () => null;
let unauthorizedHandler: () => void | Promise<void> = () => undefined;

export const setAccessTokenProvider = (provider: () => string | null): void => {
  accessTokenProvider = provider;
};

export const setUnauthorizedHandler = (
  handler: () => void | Promise<void>,
): void => {
  unauthorizedHandler = handler;
};

export const authenticatedImageSource = (url: string) => {
  const resource = new URL(url);
  const base = new URL(getApiBaseUrl());
  if (resource.origin !== base.origin)
    throw new Error("La imagen no pertenece al servidor configurado.");
  const token = accessTokenProvider();
  if (!token) throw new Error("No hay una sesión activa.");
  return {
    uri: resource.toString(),
    headers: { Authorization: `Bearer ${token}` },
  };
};

const parseJsonText = (text: string): unknown => {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ResponseFormatError();
  }
};

const errorDetails = (
  value: unknown,
): { message: string; errors: Record<string, string[]> } => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { message: "No se pudo completar la solicitud.", errors: {} };
  }
  const record = value as Record<string, unknown>;
  const errors: Record<string, string[]> = {};
  if (
    typeof record.errors === "object" &&
    record.errors !== null &&
    !Array.isArray(record.errors)
  ) {
    for (const [key, messages] of Object.entries(record.errors)) {
      if (
        Array.isArray(messages) &&
        messages.every((message) => typeof message === "string")
      ) {
        errors[key] = messages;
      }
    }
  }
  return {
    message:
      typeof record.message === "string"
        ? record.message
        : "No se pudo completar la solicitud.",
    errors,
  };
};

export const apiRequest = async <T>(
  path: string,
  options: ApiRequestOptions<T> = {},
): Promise<T> => {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("La ruta de API debe ser relativa.");
  }

  const {
    body,
    headers: suppliedHeaders = {},
    timeoutMs = 15000,
    parseResponse,
    ...request
  } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const token = accessTokenProvider();
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...suppliedHeaders,
  };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !isFormData)
    headers["Content-Type"] = "application/json";

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...request,
      headers,
      signal: controller.signal,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
    });

    if (!response.ok) {
      const parsed = parseJsonText(await response.text());
      const details = errorDetails(parsed);
      if (response.status === 401) await unauthorizedHandler();
      throw new ApiError(
        response.status,
        details.message,
        details.errors,
        response.headers.get("Retry-After"),
      );
    }

    if (parseResponse) return await parseResponse(response);
    return parseJsonText(await response.text()) as T;
  } catch (error) {
    if (error instanceof ApiError || error instanceof ResponseFormatError)
      throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new NetworkError(
        "La solicitud tardó demasiado. Inténtalo nuevamente.",
        "timeout",
      );
    }
    throw new NetworkError(
      "No fue posible conectar con el servidor. Verifica tu conexión.",
    );
  } finally {
    clearTimeout(timeout);
  }
};
