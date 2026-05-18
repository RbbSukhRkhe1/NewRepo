const DEFAULT_HERO_BY_TITLE: Record<string, string> = {
  LGBTQs: '/samples/causes/lgbtqs.jpg',
  War: '/samples/causes/war.jpg',
  Disaster: '/samples/causes/disaster.jpg',
  Hospital: '/samples/causes/hospital.jpg',
  Education: '/samples/causes/education.jpg',
};

/** Prefer API `image_url`; fall back to bundled sample heroes by cause title. */
export function resolveCauseHeroUrl(title: string, imageUrl?: string | null): string | null {
  const url = imageUrl?.trim();
  if (url) return url;
  return DEFAULT_HERO_BY_TITLE[title] ?? null;
}
