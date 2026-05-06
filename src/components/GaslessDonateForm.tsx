import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { encodeFunctionData, parseEther, type Hex } from 'viem';
import { apiJson } from '../lib/api';
import { valutexVaultAbi } from '../lib/valutexVaultAbi';

type Cause = {
  id: number;
  title: string;
  goal_eth: number;
  raised_eth: number;
};

type Props = {
  cause: Cause;
  amount: string;
  vaultAddress: string;
  superRichReceiver: string;
  onRecorded: () => void;
  setTxError: (m: string | null) => void;
  setSuccessMsg: (m: string | null) => void;
};

export function GaslessDonateForm({
  cause,
  amount,
  vaultAddress,
  superRichReceiver,
  onRecorded,
  setTxError,
  setSuccessMsg,
}: Props) {
  const { sendTransaction } = usePrivy();
  const [busy, setBusy] = useState(false);

  async function donate(e: React.FormEvent) {
    e.preventDefault();
    setTxError(null);
    setSuccessMsg(null);
    if (busy) return;
    setBusy(true);
    try {
      let valueWei;
      try {
        valueWei = parseEther(amount);
      } catch {
        throw new Error('Invalid ETH amount');
      }
      if (valueWei <= 0n) throw new Error('Amount must be positive');

      const data = encodeFunctionData({
        abi: valutexVaultAbi,
        functionName: 'deposit',
        args: [valueWei, superRichReceiver as Hex],
      }) as Hex;

      const vault = vaultAddress.startsWith('0x') ? (vaultAddress as Hex) : (`0x${vaultAddress}` as Hex);

      const { hash } = await sendTransaction(
        {
          chainId: 84532,
          to: vault,
          data,
        },
        { sponsor: true }
      );

      await apiJson<{ txHash: string }>('/donate/confirm', {
        method: 'POST',
        body: JSON.stringify({ causeId: cause.id, txHash: hash }),
      });
      setSuccessMsg(`Recorded · ${hash.slice(0, 14)}…`);
      onRecorded();
    } catch (err: unknown) {
      setTxError(err instanceof Error ? err.message : 'Donation failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(ev) => void donate(ev)}
      className="mt-8 rounded-3xl border border-white/10 bg-[#12121F]/70 p-6 backdrop-blur-2xl"
    >
      <h2 className="text-lg font-semibold text-white">Donate ETH (gasless)</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Sponsored <span className="font-mono">deposit</span> on ValutexVault — shares assign to treasury receiver. You need
        vault underlying (e.g. WETH) and approval on Base Sepolia.
      </p>
      <p className="mt-3 text-sm text-zinc-400">
        Vault: <span className="font-mono text-xs">{vaultAddress}</span>
      </p>
      <p className="mt-1 text-sm text-zinc-400">
        Shares receiver: <span className="font-mono text-xs">{superRichReceiver}</span>
      </p>
      <button
        type="submit"
        disabled={busy}
        className="vtx-btn-primary mt-6 px-6 py-2 text-sm disabled:opacity-50"
      >
        {busy ? 'Submitting…' : `Confirm gasless deposit (${amount} ETH)`}
      </button>
      <p className="mt-3 text-[11px] text-zinc-600">
        Privy opens a confirmation UI. After mining, the server verifies the Deposit event and updates the ledger.
      </p>
    </form>
  );
}
