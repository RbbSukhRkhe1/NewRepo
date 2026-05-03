import { ethers, HDNodeWallet } from 'ethers';

/** Same mnemonic as Anvil / Hardhat default — dev only. */
const ANVIL_MNEMONIC =
  'test test test test test test test test test test test junk';

export const SUPER_RICH_INDEX = 0;
/** Haha, Sukhan, Tasin */
export const ADMIN_INDICES = [1, 2, 3] as const;
/** Assigned when admins create donors via API */
export const NEW_USER_POOL_INDICES = [4, 5, 6] as const;
export const HOSPITAL_INDICES = [7, 8, 9] as const;

export function anvilWallet(index: number): HDNodeWallet {
  return HDNodeWallet.fromPhrase(
    ANVIL_MNEMONIC,
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
  HOSPITAL: 'hospital',
} as const;
