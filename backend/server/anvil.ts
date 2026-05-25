import { ethers, HDNodeWallet } from 'ethers';
import {
  chainId,
  getRpcHttpUrl,
  getRpcWsUrl,
  isAnvilDemoNetwork,
  network,
} from './config.js';
import type { VaultexNetwork } from './config.js';

export type { VaultexNetwork };
export { network, chainId, getRpcHttpUrl, getRpcWsUrl, isAnvilDemoNetwork };

if (network === 'sepolia') {
  console.warn(
    '[vaultex] NETWORK=sepolia: HTTP/WebSocket RPCs come from config (Sepolia). ' +
      'Server-side donate/disburse still use the dev HD wallet in this module — keep demos on NETWORK=anvil unless keys are funded on Sepolia. ' +
      'MetaMask / browser-side signing is a separate frontend milestone.',
  );
}

/** Same mnemonic as Anvil / Hardhat default — dev only. */
const ANVIL_MNEMONIC =
  'test test test test test test test test test test test junk';

/** Vaultex treasury vault — also the admin account wallet (`users.anvil_index = 0`). */
export const SUPER_RICH_INDEX = 0;
/** Seeded donor wallets: Haha, Sukhan, Tasin */
export const SEEDED_DONOR_INDICES = [2, 3, 4] as const;
/** Extra simulation donor wallets (Sam, Priya, Lena). */
export const SIM_DONOR_INDICES = [1, 5, 6] as const;
export const BENEFICIARY_INDICES = [7, 8, 9] as const;
/** Dedicated Anvil HD indices for cause treasury wallets (do not overlap users 0–9). */
export const CAUSE_WALLET_START = 10;

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
  BENEFICIARY: 'beneficiary',
} as const;
