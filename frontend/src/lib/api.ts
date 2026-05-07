const headersJson = { 'Content-Type': 'application/json' };

export async function apiJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    ...init,
    headers: { ...headersJson, ...init?.headers },
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }
  if (!res.ok) {
    const err =
      (data as { error?: string })?.error ?? (text || res.statusText);
    throw new Error(err);
  }
  return data as T;
}
