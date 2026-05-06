import { useEffect, useRef } from 'react';
import { getIdentityToken, usePrivy } from '@privy-io/react-auth';
import { apiJson } from '../lib/api';
import { useAuth } from '../context/AuthContext';

/** Sync Privy JWT → Express cookie session (`POST /auth/privy`). */
export function PrivySessionEffects() {
  const { authenticated, ready } = usePrivy();
  const { refresh } = useAuth();
  const wasAuthed = useRef(false);

  useEffect(() => {
    if (!ready || !authenticated) return;
    async function sync() {
      try {
        const tok = await getIdentityToken();
        if (!tok) return;
        await apiJson<{ user: unknown }>('/auth/privy', {
          method: 'POST',
          body: JSON.stringify({ identityToken: tok }),
        });
        await refresh();
      } catch {
        await refresh();
      }
    }
    void sync();
  }, [authenticated, ready, refresh]);

  useEffect(() => {
    if (!ready) return;
    if (authenticated) {
      wasAuthed.current = true;
      return;
    }
    if (!wasAuthed.current) return;
    wasAuthed.current = false;
    async function clear() {
      try {
        await apiJson('/auth/logout', { method: 'POST', body: '{}' });
      } finally {
        await refresh();
      }
    }
    void clear();
  }, [authenticated, ready, refresh]);

  return null;
}
