import { ethers, HDNodeWallet } from 'ethers';

export const SUPER_RICH_INDEX = 0;
/** Single Vaultex admin wallet */
export const VAULTEX_ADMIN_INDEX = 1;
/** Seeded donor wallets: Haha, Sukhan, Tasin */
export const SEEDED_DONOR_INDICES = [2, 3, 4] as const;
export const BENEFICIARY_INDICES = [7, 8, 9] as const;

function getAnvilMnemonic(): string {
  const mnemonic = process.env.ANVIL_MNEMONIC;
  if (!mnemonic || !mnemonic.trim()) {
    throw new Error('[env] ANVIL_MNEMONIC is required for wallet derivation');
  }
  return mnemonic;
}

export function anvilWallet(index: number): HDNodeWallet {
  return HDNodeWallet.fromPhrase(
    getAnvilMnemonic(),
    undefined,
    `m/44'/60'/0'/0/${index}`
  );
}

export function anvilAddress(index: number): string {
  return anvilWallet(index).address;
}

export function connectWallet(index: number, provider: ethers.Provider): ethers.HDNodeWallet {
  return anvilWallet(index).connect(provider);
}

export const ROLE = {
  ADMIN: 'admin',
  DONOR: 'donor',
  BENEFICIARY: 'beneficiary',
} as const;
