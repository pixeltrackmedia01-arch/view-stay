export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly fields?: Record<string, string[]>,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/** Browser-side JSON fetch that surfaces the API's error message; network failures become friendly errors. */
export async function api<T = unknown>(url: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
      headers: init.body !== undefined && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : undefined,
      body: init.body === undefined ? undefined : init.body instanceof FormData ? init.body : JSON.stringify(init.body),
      credentials: "same-origin",
      signal: init.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError("We couldn't reach ViewStay. Check your connection and try again.", 0, "NETWORK");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error ?? {};
    throw new ApiError(err.message ?? `Request failed (${res.status})`, res.status, err.code, err.fields, err.details);
  }
  return data as T;
}
