/** Normalize hero image input: site path under /public or http(s) URL. */
export function normalizeCauseImageUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;

  if (t.startsWith('/')) {
    if (t.length > 512 || t.includes('..') || /[\s<>"'`]/.test(t)) {
      throw new Error('Invalid image path');
    }
    if (!/^\/[\w./-]+\.[A-Za-z0-9]+$/i.test(t)) {
      throw new Error('Use a path like /samples/causes/my-cause.jpg or an https URL');
    }
    return t;
  }

  let candidate = t;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let u: URL;
  try {
    u = new URL(candidate);
  } catch {
    throw new Error('Hero image must be a valid URL or a path starting with /');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Hero image URL must start with http:// or https://');
  }
  return u.href;
}

export function previewCauseImageUrl(raw: string): string | null {
  try {
    return normalizeCauseImageUrl(raw);
  } catch {
    return null;
  }
}
