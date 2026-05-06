import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';

export function PrivyLoginPanel() {
  const { login, ready, authenticated } = usePrivy();
  const nav = useNavigate();

  useEffect(() => {
    if (!ready || !authenticated) return;
    nav('/account', { replace: true });
  }, [authenticated, nav, ready]);

  return (
    <div className="vtx-card mt-6 p-5">
      <h2 className="text-lg font-semibold text-white">Sign in with Privy</h2>
      <p className="mt-2 text-xs text-zinc-500">
        Email or Google → embedded Ethereum wallet on Base Sepolia. Your Valutex DB email must match a
        seeded account once the session syncs with the API.
      </p>
      <button
        type="button"
        disabled={!ready}
        className="vtx-btn-primary mt-4 px-5 py-2.5 text-sm disabled:opacity-50"
        onClick={() => login()}
      >
        Continue with Privy
      </button>
    </div>
  );
}
