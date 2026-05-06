import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { VaultTxErrorBoundary } from '../components/VaultTxErrorBoundary';
import { GaslessDonateForm } from '../components/GaslessDonateForm';

type Cause = {
  id: number;
  title: string;
  description: string;
  goal_eth: number;
  raised_eth: number;
};

type ApiCfg = {
  useUserOp: boolean;
  vaultContractAddress: string | null;
  chainTxMode: string;
  superRichAddress: string;
};

export function CauseDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [cause, setCause] = useState<Cause | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [amount, setAmount] = useState('0.1');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cfg, setCfg] = useState<ApiCfg | null>(null);

  useEffect(() => {
    apiJson<ApiCfg>('/config')
      .then(setCfg)
      .catch(() => setCfg(null));
  }, []);

  useEffect(() => {
    if (!id) return;
    apiJson<Cause>(`/causes/${id}`)
      .then(setCause)
      .catch((e: Error) => setErr(e.message));
  }, [id]);

  const gaslessEligible =
    Boolean(cfg?.useUserOp && cfg.chainTxMode === 'vault' && cfg.vaultContractAddress);

  const canDonate =
    user &&
    (user.role === 'donor' || user.role === 'admin') &&
    (gaslessEligible ? Boolean(user.embeddedWallet) : user.anvilIndex != null);

  async function donateClassic(e: React.FormEvent) {
    e.preventDefault();
    if (!cause) return;
    setSuccessMsg(null);
    setTxError(null);
    setBusy(true);
    try {
      const r = await apiJson<{ txHash: string }>('/donate', {
        method: 'POST',
        body: JSON.stringify({ causeId: cause.id, amountEth: amount }),
      });
      setSuccessMsg(`Sent · ${r.txHash.slice(0, 14)}…`);
      const updated = await apiJson<Cause>(`/causes/${cause.id}`);
      setCause(updated);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : 'Donation failed — check RPC, vault mode, and wallet balance.';
      setTxError(message);
    } finally {
      setBusy(false);
    }
  }

  if (err || !cause) {
    return (
      <div className="px-4 py-12 text-center text-zinc-400">
        {err || 'Loading…'}{' '}
        <Link to="/causes" className="text-cyan-400">
          Back
        </Link>
      </div>
    );
  }

  const pct = Math.min(100, (cause.raised_eth / cause.goal_eth) * 100);

  return (
    <div className="space-y-6 pb-10">
      <Link to="/causes" className="text-sm text-[#14F5B3] hover:underline">
        ← All causes
      </Link>
      <article className="vtx-card p-7">
        <h1 className="font-space-grotesk text-4xl font-bold tracking-[-0.02em]">{cause.title}</h1>
        <p className="mt-4 leading-relaxed text-[#A0A0CC]">{cause.description}</p>
        <div className="mt-8">
          <div className="flex justify-between text-sm text-[#A0A0CC]">
            <span>Raised</span>
            <span>
              {cause.raised_eth.toFixed(4)} / {cause.goal_eth} ETH
            </span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#0A0A0F]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#14F5B3] to-[#7B4CFF]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </article>

      {canDonate ? (
        <VaultTxErrorBoundary context="donate">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="vtx-card p-6">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Amount (ETH)
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-2 w-full max-w-[12rem] rounded-xl border border-white/10 bg-black/30 px-4 py-2 font-space-mono text-white"
              placeholder="Amount"
            />
            {gaslessEligible ? (
              <GaslessDonateForm
                cause={cause}
                amount={amount}
                vaultAddress={cfg!.vaultContractAddress!}
                superRichReceiver={cfg!.superRichAddress}
                setTxError={setTxError}
                setSuccessMsg={setSuccessMsg}
                onRecorded={async () => {
                  const updated = await apiJson<Cause>(`/causes/${cause.id}`);
                  setCause(updated);
                }}
              />
            ) : (
              <form
                onSubmit={(e) => void donateClassic(e)}
                className="mt-8 rounded-3xl border border-white/10 bg-[#12121F]/70 p-6 backdrop-blur-2xl"
              >
                <h2 className="text-lg font-semibold text-white">Donate ETH</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Sends from your assigned Anvil wallet to the vault. Requires USE_USEROP=false path.
                </p>
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={busy}
                    className="vtx-btn-primary px-6 py-2 text-sm disabled:opacity-50"
                  >
                    {busy ? 'Sending…' : 'Donate'}
                  </button>
                </div>
                {busy && (
                  <p className="mt-3 text-sm text-zinc-400" aria-live="polite">
                    Submitting vault transaction…
                  </p>
                )}
                {txError && (
                  <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-950/40 p-3 text-sm text-rose-200">
                    {txError}
                  </p>
                )}
                {successMsg && !txError && (
                  <p className="mt-3 text-sm text-emerald-400">{successMsg}</p>
                )}
              </form>
            )}
            {gaslessEligible && txError && (
              <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-950/40 p-3 text-sm text-rose-200">
                {txError}
              </p>
            )}
            {gaslessEligible && successMsg && !txError && (
              <p className="mt-3 text-sm text-emerald-400">{successMsg}</p>
            )}
          </motion.div>
        </VaultTxErrorBoundary>
      ) : (
        <p className="mt-10 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
          {user ? (
            gaslessEligible ? (
              <>
                Gasless donations need a synced Privy embedded wallet matching your seeded email (
                <Link to="/login" className="text-cyan-300 underline">
                  sign in with Privy
                </Link>
                ).
              </>
            ) : (
              'Only accounts with an Anvil wallet (indices 1–6 here) can send from the UI. Admins #1–3 can donate.'
            )
          ) : (
            'Sign in to donate.'
          )}{' '}
          {!user ? (
            <Link to="/login" className="text-cyan-300 underline">
              Sign in
            </Link>
          ) : null}
        </p>
      )}
    </div>
  );
}
