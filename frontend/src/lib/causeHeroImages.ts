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
};

/** @deprecated alias for seed / docs */
export const CAUSE_HERO_PUBLIC_PATH = CAUSE_HERO_BY_TITLE;

/** Prefer Photos folder heroes; use API URL only for custom causes. */
export function resolveCauseHeroUrl(title: string, imageUrl?: string | null): string | null {
  const photosHero = CAUSE_HERO_BY_TITLE[title];
  if (photosHero) return photosHero;
  const url = imageUrl?.trim();
  return url || null;
}
