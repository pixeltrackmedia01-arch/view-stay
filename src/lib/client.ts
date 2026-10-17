export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}

/** Browser-side JSON fetch that surfaces the API's error message. */
export async function api<T = unknown>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: init.body ? { "Content-Type": "application/json" } : undefined,
    body: init.body ? JSON.stringify(init.body) : undefined,
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error ?? {};
    throw new ApiError(err.message ?? `Request failed (${res.status})`, res.status, err.code, err.fields);
  }
  return data as T;
}
