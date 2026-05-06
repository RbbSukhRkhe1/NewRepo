import { useEffect, useState } from 'react';
import { Activity, Coins, HeartHandshake, ShieldCheck } from 'lucide-react';
import { apiJson } from '../lib/api';

type DashboardOverview = {
  vault: { addressMasked: string; balanceEth: string | null };
  stats: {
    activeCauses: number;
    ledgerEntries: number;
    totalRaisedEth: number;
    totalDonatedEth: number;
    totalDisbursedEth: number;
  };
};

type HealthShape = {
  chain?: { mode?: string; useUserOp?: boolean };
  aa?: { useUserOp?: boolean };
};

function StatCard({
  title,
  value,
  icon: Icon,
  helper,
}: {
  title: string;
  value: string;
  icon: typeof Activity;
  helper: string;
}) {
  return (
    <article className="vtx-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-[#A0A0CC]">{title}</p>
        <Icon className="h-5 w-5 text-[#14F5B3]" />
      </div>
      <p className="mt-4 font-space-grotesk text-3xl font-bold tracking-[-0.02em]">{value}</p>
      <p className="mt-2 text-xs text-[#A0A0CC]">{helper}</p>
    </article>
  );
}

export function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [health, setHealth] = useState<HealthShape | null>(null);

  useEffect(() => {
    apiJson<DashboardOverview>('/overview')
      .then(setOverview)
      .catch(() => setOverview(null));
    apiJson<HealthShape>('/health')
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  return (
    <section className="space-y-6">
      <header className="vtx-card p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[#14F5B3]">Valutex dashboard</p>
        <h1 className="mt-2 font-space-grotesk text-3xl font-bold tracking-[-0.02em]">
          Trustless donation intelligence
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#A0A0CC]">
          Real-time overview across vault, causes, and disbursement flows with transparent ledger visibility.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Vault"
          value={overview?.vault.balanceEth ? `${Number(overview.vault.balanceEth).toFixed(3)} ETH` : '—'}
          icon={Coins}
          helper={`Address ${overview?.vault.addressMasked ?? 'unavailable'}`}
        />
        <StatCard
          title="Causes Active"
          value={`${overview?.stats.activeCauses ?? 0}`}
          icon={HeartHandshake}
          helper="Campaigns currently fundraising"
        />
        <StatCard
          title="Total Impact"
          value={`${(overview?.stats.totalRaisedEth ?? 0).toFixed(3)} ETH`}
          icon={ShieldCheck}
          helper="Raised across all active causes"
        />
        <StatCard
          title="My Contributions"
          value={`${(overview?.stats.totalDonatedEth ?? 0).toFixed(3)} ETH`}
          icon={Activity}
          helper="Donation volume recorded in app ledger"
        />
      </div>
      <article className="vtx-card p-6 text-sm text-[#A0A0CC]">
        <p>
          Chain mode: <span className="text-white">{health?.chain?.mode ?? 'unknown'}</span> · UserOp:{' '}
          <span className="text-white">
            {health?.aa?.useUserOp ?? health?.chain?.useUserOp ? 'enabled' : 'disabled'}
          </span>
        </p>
      </article>
    </section>
  );
}
