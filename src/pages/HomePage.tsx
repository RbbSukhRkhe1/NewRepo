import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Sparkles, WalletCards } from 'lucide-react';
import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson } from '../lib/api';

type Overview = {
  vault: { addressMasked: string; balanceEth: string | null };
  stats: {
    activeCauses: number;
    ledgerEntries: number;
    totalRaisedEth: number;
    totalDonatedEth: number;
    totalDisbursedEth: number;
  };
};

export function HomePage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const statCards: Array<{ label: string; value: string; icon: ComponentType<{ className?: string }> }> = [
    {
      label: 'Total Vault',
      value: overview?.vault.balanceEth ? `${Number(overview.vault.balanceEth).toFixed(3)} ETH` : '—',
      icon: WalletCards,
    },
    { label: 'Causes Active', value: `${overview?.stats.activeCauses ?? 0}`, icon: ShieldCheck },
    { label: 'Total Impact', value: `${(overview?.stats.totalRaisedEth ?? 0).toFixed(3)} ETH`, icon: Sparkles },
    { label: 'Ledger Events', value: `${overview?.stats.ledgerEntries ?? 0}`, icon: ShieldCheck },
  ];
  useEffect(() => {
    apiJson<Overview>('/overview')
      .then(setOverview)
      .catch(() => setOverview(null));
  }, []);

  return (
    <div className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#12121F]/80 p-8 backdrop-blur-2xl">
        <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-[#14F5B3]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-[#7B4CFF]/20 blur-3xl" />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <p className="text-xs uppercase tracking-[0.24em] text-[#14F5B3]">Valutex neobank</p>
          <h1 className="mt-3 max-w-2xl font-space-grotesk text-5xl font-bold tracking-[-0.02em]">
            Trustless. Transparent. Empowered.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-[#A0A0CC]">
            A premium Web3 donation rail where every inflow and disbursement is visible, auditable, and role-aware.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/dashboard" className="vtx-btn-primary inline-flex items-center gap-2 px-5 py-3">
              Launch Demo <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/ledger" className="vtx-btn-ghost inline-flex items-center gap-2 px-5 py-3">
              On-chain Ledger
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <article key={label} className="vtx-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.22em] text-[#A0A0CC]">{label}</p>
              <Icon className="h-5 w-5 text-[#14F5B3]" />
            </div>
            <p className="mt-4 font-space-grotesk text-3xl font-bold tracking-[-0.02em]">{value}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
