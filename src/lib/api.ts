export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api" + path, {
    ...options,
    headers:
      options.body instanceof FormData
        ? options.headers
        : { "Content-Type": "application/json", ...options.headers },
  });
  let value: unknown;
  try {
    const text = await response.text();
    value = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      "The server returned an unreadable response. Reload the page.",
    );
  }
  if (!response.ok)
    throw new Error(
      value && typeof value === "object" && "error" in value
        ? String(value.error)
        : "Connection failed.",
    );
  return value as T;
}
export const post = <T = unknown>(
  path: string,
  body: unknown = {},
): Promise<T> => api<T>(path, { method: "POST", body: JSON.stringify(body) });
