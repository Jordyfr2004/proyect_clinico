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

export class SessionChangedError extends Error {
  constructor() { super("La sesión cambió. Vuelve a consultar la información."); }
}

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
  if (resource.origin !== base.origin || resource.username || resource.password)
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
): { message: string; errors: Record<string, string[]>; requiresVerification: boolean; verificationEmail: string | null } => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { message: "No se pudo completar la solicitud.", errors: {}, requiresVerification: false, verificationEmail: null };
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
    requiresVerification: Array.isArray((record.errors as Record<string, unknown> | undefined)?.requires_verification)
      && (record.errors as Record<string, unknown[]>).requires_verification[0] === true,
    verificationEmail: errors.email?.[0] ?? null,
  };
};

export const apiRequest = async <T>(
  path: string,
  options: ApiRequestOptions<T> = {},
): Promise<T> => {
  const baseUrl = getApiBaseUrl();
  const url = new URL(`${baseUrl}${path}`);
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") ||
      url.origin !== new URL(baseUrl).origin || !url.pathname.startsWith(`${new URL(baseUrl).pathname.replace(/\/$/, "")}/`)) {
    throw new Error("La ruta de API debe ser relativa.");
  }

  const {
    body,
    headers: suppliedHeaders = {},
    timeoutMs = 15000,
    parseResponse,
    signal,
    ...request
  } = options;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const token = accessTokenProvider();
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...suppliedHeaders,
  };
  let parsing = false;

  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !isFormData)
    headers["Content-Type"] = "application/json";

  try {
    const response = await fetch(url.toString(), {
      ...request,
      headers,
      signal: controller.signal,
      redirect: "error",
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
    });

    if (token !== accessTokenProvider()) throw new SessionChangedError();
    if (!response.ok) {
      if (response.status === 401) await unauthorizedHandler();
      let parsed: unknown;
      try {
        parsed = parseJsonText(await response.text());
      } catch {
        parsed = undefined;
      }
      const details = errorDetails(parsed);
      throw new ApiError(
        response.status,
        details.message,
        details.errors,
        response.headers.get("Retry-After"),
        details.requiresVerification,
        details.verificationEmail,
      );
    }

    parsing = true;
    const value = parseResponse ? await parseResponse(response) : parseJsonText(await response.text()) as T;
    if (token !== accessTokenProvider()) throw new SessionChangedError();
    return value;
  } catch (error) {
    if (parsing && error instanceof TypeError) throw new NetworkError('Se interrumpió la conexión al recibir la respuesta. Inténtalo nuevamente.');
    if (parsing && error instanceof Error && error.name !== 'AbortError') throw error;
    if (error instanceof ApiError || error instanceof ResponseFormatError || error instanceof SessionChangedError)
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
    signal?.removeEventListener("abort", abort);
  }
};
