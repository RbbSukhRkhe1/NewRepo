import type { User } from '@privy-io/server-auth';
import { getAddress, type Address } from 'viem';

/** Primary email for matching against seeded `users.email`. */
export function pickPrivyEmail(pu: User): string | undefined {
  if (pu.email?.address) return pu.email.address.trim().toLowerCase();
  for (const a of pu.linkedAccounts) {
    if (a.type === 'email' && 'address' in a && typeof a.address === 'string') {
      return a.address.trim().toLowerCase();
    }
    if (a.type === 'google_oauth' && 'email' in a && typeof a.email === 'string') {
      return a.email.trim().toLowerCase();
    }
  }
  return undefined;
}

/** Ethereum address for sponsored txs (smart wallet preferred, else embedded EOA). */
export function pickPrivyWalletAddress(pu: User): Address | undefined {
  for (const a of pu.linkedAccounts) {
    if (a.type === 'smart_wallet' && 'address' in a && typeof a.address === 'string') {
      try {
        return getAddress(a.address);
      } catch {
        /* ignore */
      }
    }
  }
  for (const a of pu.linkedAccounts) {
    if (
      a.type === 'wallet' &&
      'address' in a &&
      typeof a.address === 'string' &&
      'walletClientType' in a &&
      a.walletClientType === 'privy'
    ) {
      try {
        return getAddress(a.address);
      } catch {
        /* ignore */
      }
    }
  }
  if (pu.smartWallet?.address) {
    try {
      return getAddress(pu.smartWallet.address);
    } catch {
      /* ignore */
    }
  }
  if (pu.wallet?.address) {
    try {
      return getAddress(pu.wallet.address);
    } catch {
      /* ignore */
    }
  }
  return undefined;
}
