import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiJson } from '../lib/api';

type Cause = {
  id: number;
  title: string;
  description: string;
  goal_eth: number;
  raised_eth: number;
};

const HUMAN_SUBTITLES = [
  'Providing mental health support for students under pressure and burnout.',
  'Helping families access urgent treatment, meals, and temporary shelter.',
  'Supporting children with safe learning spaces and daily essentials.',
] as const;

const THUMBNAIL_LABELS = ['Students First', 'Families in Crisis', 'Children & Education'] as const;
const LOCATIONS = ['Sydney, AU', 'Melbourne, AU', 'Brisbane, AU'] as const;
const CATEGORIES = ['Mental Health', 'Emergency Relief', 'Education'] as const;
const CARD_BACKGROUNDS = [
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 480'%3E%3Cdefs%3E%3CradialGradient id='g' cx='30%25' cy='25%25' r='70%25'%3E%3Cstop offset='0%25' stop-color='%2334d399' stop-opacity='.8'/%3E%3Cstop offset='100%25' stop-color='%23070a12' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='800' height='480' fill='%23070a12'/%3E%3Ccircle cx='210' cy='160' r='190' fill='url(%23g)'/%3E%3Ccircle cx='640' cy='360' r='170' fill='%23f59e0b' fill-opacity='.2'/%3E%3C/svg%3E\")",
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 480'%3E%3Crect width='800' height='480' fill='%23070a12'/%3E%3Cpath d='M0 330 C120 250 230 410 380 310 C500 225 615 325 800 210 L800 480 L0 480 Z' fill='%23f97316' fill-opacity='.28'/%3E%3Ccircle cx='635' cy='140' r='145' fill='%23fde047' fill-opacity='.2'/%3E%3C/svg%3E\")",
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 480'%3E%3Crect width='800' height='480' fill='%23070a12'/%3E%3Cellipse cx='260' cy='160' rx='230' ry='120' fill='%2322c55e' fill-opacity='.22'/%3E%3Cellipse cx='560' cy='330' rx='260' ry='140' fill='%230ea5e9' fill-opacity='.17'/%3E%3C/svg%3E\")",
] as const;
const CARD_IMAGE_SRCS = [
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 960 420'%3E%3Cdefs%3E%3ClinearGradient id='sky' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%230b1220'/%3E%3Cstop offset='100%25' stop-color='%23121f36'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='960' height='420' fill='url(%23sky)'/%3E%3Ccircle cx='760' cy='94' r='72' fill='%23fbbf24' fill-opacity='.33'/%3E%3Cpath d='M0 320 C130 250 240 350 390 300 C540 246 690 322 960 250 L960 420 L0 420 Z' fill='%2322c55e' fill-opacity='.32'/%3E%3Cpath d='M0 350 C170 280 290 375 470 322 C650 268 760 352 960 300 L960 420 L0 420 Z' fill='%2314b8a6' fill-opacity='.28'/%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 960 420'%3E%3Crect width='960' height='420' fill='%230a1324'/%3E%3Cpath d='M0 305 C120 248 270 362 440 294 C610 226 765 300 960 246 L960 420 L0 420 Z' fill='%23fb923c' fill-opacity='.32'/%3E%3Cpath d='M0 340 C160 286 290 376 480 328 C670 280 780 340 960 306 L960 420 L0 420 Z' fill='%23f59e0b' fill-opacity='.24'/%3E%3Ccircle cx='810' cy='112' r='58' fill='%23fef08a' fill-opacity='.3'/%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 960 420'%3E%3Crect width='960' height='420' fill='%2309131d'/%3E%3Cellipse cx='270' cy='170' rx='220' ry='120' fill='%2334d399' fill-opacity='.28'/%3E%3Cellipse cx='680' cy='290' rx='260' ry='135' fill='%2322d3ee' fill-opacity='.22'/%3E%3Cpath d='M0 336 C170 286 310 370 510 320 C710 270 810 332 960 296 L960 420 L0 420 Z' fill='%2310b981' fill-opacity='.23'/%3E%3C/svg%3E",
] as const;

type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

function priorityRank(priority: Priority) {
  if (priority === 'HIGH') return 0;
  if (priority === 'MEDIUM') return 1;
  return 2;
}

function getPriority(fundingPctRaw: number, daysLeft: number): Priority {
  if (fundingPctRaw < 50 || daysLeft < 3) return 'HIGH';
  if (fundingPctRaw <= 90) return 'MEDIUM';
  return 'LOW';
}

function getPriorityBadge(priority: Priority, isCompleted: boolean) {
  if (priority === 'HIGH') return 'URGENT';
  if (priority === 'MEDIUM') return 'ALMOST THERE';
  return isCompleted ? 'COMPLETED' : 'EXPANDING IMPACT';
}

export function CausesPage() {
  const [causes, setCauses] = useState<Cause[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiJson<Cause[]>('/causes')
      .then(setCauses)
      .catch((e: Error) => setErr(e.message));
  }, []);

  if (err) {
    return (
      <div className="px-4 py-12 text-center text-rose-400">
        {err} — is the API running? Use <code className="text-zinc-400">npm run dev</code>
      </div>
    );
  }

  const prioritizedCauses = causes
    .map((c, i) => {
      const daysLeft = 2 + (c.id % 12);
      const fundingPctRaw = (c.raised_eth / c.goal_eth) * 100;
      const priority = getPriority(fundingPctRaw, daysLeft);
      return { c, i, daysLeft, fundingPctRaw, priority };
    })
    .sort((a, b) => {
      const rankDiff = priorityRank(a.priority) - priorityRank(b.priority);
      if (rankDiff !== 0) return rankDiff;
      if (a.priority === 'HIGH') return a.daysLeft - b.daysLeft || a.fundingPctRaw - b.fundingPctRaw;
      if (a.priority === 'MEDIUM') return b.fundingPctRaw - a.fundingPctRaw;
      return b.fundingPctRaw - a.fundingPctRaw;
    });

  return (
    <div className="space-y-6 pb-10">
      <header className="vtx-card p-6">
        <h1 className="font-space-grotesk text-4xl font-bold tracking-[-0.02em]">Causes</h1>
        <p className="mt-2 text-sm text-[#A0A0CC]">Choose where your ETH should make measurable impact.</p>
      </header>
      <ul className="grid gap-4 lg:grid-cols-2">
        {prioritizedCauses.map(({ c, i, daysLeft, fundingPctRaw, priority }) => {
          const pctRaw = fundingPctRaw;
          const pct = Math.min(100, pctRaw);
          const stripe =
            priority === 'HIGH'
              ? 'from-rose-500 via-orange-500 to-amber-500'
              : priority === 'MEDIUM'
                ? 'from-amber-300 via-orange-400 to-yellow-500'
                : 'from-emerald-400 via-teal-400 to-green-500';
          const badge = getPriorityBadge(priority, c.raised_eth >= c.goal_eth);
          const humanSubtitle = HUMAN_SUBTITLES[i % HUMAN_SUBTITLES.length];
          const thumbnailLabel = THUMBNAIL_LABELS[i % THUMBNAIL_LABELS.length];
          const region = `${LOCATIONS[i % LOCATIONS.length]} · ${CATEGORIES[i % CATEGORIES.length]}`;
          const donors = 90 + ((c.id * 17 + i * 11) % 180);
          const cardBackground = CARD_BACKGROUNDS[i % CARD_BACKGROUNDS.length];
          const cardImageSrc = CARD_IMAGE_SRCS[i % CARD_IMAGE_SRCS.length];
          const badgeColorClass =
            priority === 'HIGH'
              ? 'border-rose-300/30 bg-rose-950/50 text-rose-100'
              : priority === 'MEDIUM'
                ? 'border-amber-300/30 bg-amber-950/45 text-amber-100'
                : 'border-emerald-300/30 bg-emerald-950/45 text-emerald-100';
          return (
            <li key={c.id}>
              <motion.div whileHover={{ y: -4 }}>
                <Link
                  to={`/causes/${c.id}`}
                  className="vtx-card group relative block overflow-hidden p-6 transition-all hover:border-[#14F5B3]/50"
                >
                  <div className="pointer-events-none absolute inset-0" aria-hidden>
                    <div className="absolute inset-0 opacity-[0.16]" style={{ backgroundImage: cardBackground }} />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F]/88 via-[#0A0A0F]/72 to-[#0A0A0F]/90" />
                  </div>

                  <div className="relative z-[1]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${badgeColorClass}`}
                          >
                            {badge}
                          </span>
                          <span className="text-xs text-[#A0A0CC]">{region}</span>
                        </div>

                        <h2 className="mt-3 font-space-grotesk text-2xl font-semibold tracking-[-0.02em]">
                          {c.title}
                        </h2>
                        <p className="mt-2 text-sm text-zinc-200/90">{humanSubtitle}</p>
                      </div>

                      <div className="shrink-0 text-right font-space-mono">
                        <p className="text-lg text-[#14F5B3]">
                          {c.raised_eth.toFixed(2)} / {c.goal_eth.toFixed(2)} ETH
                        </p>
                        <p className="text-xs text-[#A0A0CC]">{pct.toFixed(0)}% funded</p>
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                      <div className={`h-1.5 w-full bg-gradient-to-r ${stripe} opacity-90`} aria-hidden />
                      <div className="relative h-28 sm:h-32">
                        <img
                          src={cardImageSrc}
                          alt={`${c.title} impact visual`}
                          className="h-full w-full object-cover opacity-80 transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                        <div
                          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0A0A0F]/35 via-transparent to-[#0A0A0F]/58"
                          aria-hidden
                        />
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm text-[#A0A0CC]">{c.description}</p>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#A0A0CC]">
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
                        {donors} donors
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
                        {daysLeft} days left
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
                        {thumbnailLabel}
                      </span>
                    </div>

                    <div className="mt-4 inline-flex items-center gap-2 text-sm text-[#14F5B3]">
                      Donate now <ArrowUpRight className="h-4 w-4" />
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#0A0A0F]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#14F5B3] to-[#7B4CFF]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </Link>
              </motion.div>
            </li>
          );
        })}
      </ul>
      {causes.length === 0 && !err && (
        <p className="mt-8 text-center text-[#A0A0CC]">No causes yet. Admins can add one.</p>
      )}
    </div>
  );
}
