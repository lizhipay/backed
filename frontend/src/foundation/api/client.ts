import type { ApiEnvelope, ApiError, PageMeta, PageMetaRaw } from './types';
import { tokenStore } from './tokenStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiRequestError extends Error {
  status: number;
  code: string;
  fields?: Record<string, unknown>;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = error.code;
    this.fields = error.fields;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  anonymous?: boolean;
  params?: Record<string, string | number | boolean | undefined | null>;
}

export interface ListResult<T> {
  items: T[];
  meta?: PageMeta;
}

let refreshInFlight: Promise<boolean> | null = null;
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  if (!params) return url;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') usp.append(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `${url}?${qs}` : url;
}

function normalizeMeta(meta?: PageMetaRaw): PageMeta | undefined {
  if (!meta) return undefined;
  return {
    page: meta.page,
    pageSize: meta.page_size,
    total: meta.total,
  };
}

async function attemptRefresh(): Promise<boolean> {
  try {
    const res = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const json = (await res.json()) as ApiEnvelope<{
      access_token: string;
    }>;
    if (!json.data?.access_token) return false;
    tokenStore.set(json.data.access_token);
    return true;
  } catch {
    return false;
  }
}

async function parseEnvelope<T>(res: Response): Promise<ApiEnvelope<T>> {
  const text = await res.text();
  const json: ApiEnvelope<T> = text
    ? JSON.parse(text)
    : ({ data: undefined } as ApiEnvelope<T>);

  if (!res.ok || json.error) {
    throw new ApiRequestError(
      res.status,
      json.error ?? {
        code: `http_${res.status}`,
        message: res.statusText || 'Request failed',
      },
    );
  }
  return json;
}

async function requestEnvelope<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiEnvelope<T>> {
  const { body, anonymous, params, headers, ...rest } = options;

  const doRequest = async (): Promise<Response> => {
    const finalHeaders = new Headers(headers);
    if (body !== undefined && !(body instanceof FormData)) {
      finalHeaders.set('Content-Type', 'application/json');
    }
    if (!anonymous && tokenStore.access) {
      finalHeaders.set('Authorization', `Bearer ${tokenStore.access}`);
    }
    return fetch(buildUrl(path, params), {
      ...rest,
      credentials: 'include',
      headers: finalHeaders,
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });
  };

  let res = await doRequest();

  if (res.status === 401 && !anonymous) {
    if (!refreshInFlight) refreshInFlight = attemptRefresh();
    const ok = await refreshInFlight;
    refreshInFlight = null;
    if (ok) {
      res = await doRequest();
    } else {
      tokenStore.clear();
      onUnauthorized?.();
    }
  }

  return parseEnvelope<T>(res);
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const json = await requestEnvelope<T>(path, options);
  return json.data;
}

export async function apiList<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ListResult<T>> {
  const json = await requestEnvelope<T[]>(path, options);
  return { items: json.data ?? [], meta: normalizeMeta(json.meta) };
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),
  list: <T>(path: string, options?: RequestOptions) =>
    apiList<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};
