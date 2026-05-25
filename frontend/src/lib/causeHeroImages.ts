/**
 * Heroes: processed 800×600 JPEG (4:3) in `public/samples/causes/`.
 * Sources in `public/Photos/`; War/Disaster/Hospital still served from Photos until reprocessed.
 */
export const CAUSE_HERO_BY_TITLE: Record<string, string> = {
  LGBTQs: '/samples/causes/lgbtqs.jpg',
  War: '/Photos/War.jpg',
  Disaster: '/Photos/Disaster.jpg',
  Hospital: '/Photos/Hospital.jpg',
  Education: '/samples/causes/education.jpg',
  'Anti-Terrorism Initiative': '/samples/causes/anti-terrorism.jpg',
  'Mental Health Support Network': '/samples/causes/mental-health.jpg',
};

/** @deprecated alias for seed / docs */
export const CAUSE_HERO_PUBLIC_PATH = CAUSE_HERO_BY_TITLE;

/** Prefer API-uploaded or seeded image_url; legacy title map is fallback only. */
export function resolveCauseHeroUrl(title: string, imageUrl?: string | null): string | null {
  const url = imageUrl?.trim();
  if (url) return url;
  const photosHero = CAUSE_HERO_BY_TITLE[title];
  return photosHero ?? null;
}
