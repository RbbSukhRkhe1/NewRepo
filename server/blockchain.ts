import { ethers } from 'ethers';
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  encodeFunctionData,
  formatEther,
  getAddress,
  http,
  parseAbiItem,
  parseEther,
  type Address,
  type Hash,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { connectWallet } from './anvil.js';

export function rpcProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.ANVIL_RPC_URL;
  if (!rpcUrl || !rpcUrl.trim()) {
    throw new Error('[env] ANVIL_RPC_URL is required');
  }
  return new ethers.JsonRpcProvider(rpcUrl);
}

export function wsUrlFromRpc(): string {
  const ws = process.env.ANVIL_WS_URL;
  if (ws && ws.trim()) return ws;
  const rpcUrl = process.env.ANVIL_RPC_URL;
  if (!rpcUrl || !rpcUrl.trim()) {
    throw new Error('[env] ANVIL_RPC_URL is required');
  }
  return rpcUrl.replace(/^http/i, 'ws');
}

export async function getBalance(address: string): Promise<bigint> {
  return rpcProvider().getBalance(address);
}

export const valutexVaultAbi = [
  {
    name: 'totalAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'previewDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

type TxResult = { hash: string; from: string; blockNumber: number | null };

const depositEventAbi = parseAbiItem(
  'event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)'
);
export function envUserOpEnabled(): boolean {
  return process.env.USE_USEROP === 'true';
}

function txMode(): 'eoa' | 'vault' {
  return process.env.CHAIN_TX_MODE === 'vault' ? 'vault' : 'eoa';
}

function baseRpcUrl(): string {
  const url = process.env.BASE_SEPOLIA_RPC_URL;
  if (!url || !url.trim()) throw new Error('[env] BASE_SEPOLIA_RPC_URL is required');
  return url;
}

function vaultAddress(): Address {
  const addr = process.env.VAULT_CONTRACT_ADDRESS as Address | undefined;
  if (!addr) throw new Error('[env] VAULT_CONTRACT_ADDRESS is required');
  return addr;
}

function viemPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(baseRpcUrl()),
  });
}

function viemWalletClient() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk || !pk.trim()) throw new Error('[env] PRIVATE_KEY is required');
  const account = privateKeyToAccount(pk.startsWith('0x') ? (pk as Address) : (`0x${pk}` as Address));
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(baseRpcUrl()),
  });
}

export async function getVaultBalance(): Promise<string | null> {
  if (txMode() !== 'vault') return null;
  const assets = await viemPublicClient().readContract({
    address: vaultAddress(),
    abi: valutexVaultAbi,
    functionName: 'totalAssets',
  });
  return formatEther(assets);
}

export async function previewDeposit(amountEth: string): Promise<string | null> {
  if (txMode() !== 'vault') return null;
  const shares = await viemPublicClient().readContract({
    address: vaultAddress(),
    abi: valutexVaultAbi,
    functionName: 'previewDeposit',
    args: [parseEther(amountEth)],
  });
  return shares.toString();
}

export async function sendNativeTransfer(
  fromAnvilIndex: number,
  to: string,
  value: bigint
): Promise<TxResult> {
  if (!to || !to.trim()) throw new Error('Transfer recipient is required');
  if (value <= 0n) throw new Error('Transfer value must be positive');
  try {
    const provider = rpcProvider();
    const signer = connectWallet(fromAnvilIndex, provider);
    const tx = await signer.sendTransaction({ to, value });
    const receipt = await tx.wait();
    if (receipt == null) {
      throw new Error('Transfer receipt missing');
    }
    return {
      hash: tx.hash,
      from: signer.address,
      blockNumber: receipt.blockNumber ?? null,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown transfer error';
    throw new Error(`Native transfer failed: ${msg}`);
  }
}

export async function sendDonationToVault(input: {
  fromAnvilIndex: number;
  amountEth: string;
  receiverAddress: string;
}): Promise<TxResult> {
  if (txMode() !== 'vault') {
    return sendNativeTransfer(input.fromAnvilIndex, input.receiverAddress, parseEther(input.amountEth));
  }
  const wallet = viemWalletClient();
  const hash = await wallet.writeContract({
    address: vaultAddress(),
    abi: valutexVaultAbi,
    functionName: 'deposit',
    args: [parseEther(input.amountEth), input.receiverAddress as Address],
  });
  const receipt = await viemPublicClient().waitForTransactionReceipt({ hash });
  return {
    hash,
    from: wallet.account.address,
    blockNumber: Number(receipt.blockNumber),
  };
}

export async function sendDisbursementFromVault(input: {
  fromAnvilIndex: number;
  toAddress: string;
  amountEth: string;
  note?: string;
}): Promise<TxResult> {
  if (txMode() !== 'vault') {
    return sendNativeTransfer(input.fromAnvilIndex, input.toAddress, parseEther(input.amountEth));
  }
  const wallet = viemWalletClient();
  const hash = await wallet.writeContract({
    address: vaultAddress(),
    abi: valutexVaultAbi,
    functionName: 'withdraw',
    args: [parseEther(input.amountEth), input.toAddress as Address, wallet.account.address],
  });
  const receipt = await viemPublicClient().waitForTransactionReceipt({ hash });
  return {
    hash,
    from: wallet.account.address,
    blockNumber: Number(receipt.blockNumber),
  };
}

export type RpcProbeResult = {
  target: 'anvil' | 'base_sepolia';
  reachable: boolean;
  blockNumber?: string;
  error?: string;
};

/** Health check: native/Anvil JSON-RPC (EOA mode). */
export async function probeAnvilRpc(): Promise<RpcProbeResult> {
  try {
    const bn = await rpcProvider().getBlockNumber();
    return { target: 'anvil', reachable: true, blockNumber: String(bn) };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'RPC unreachable';
    return { target: 'anvil', reachable: false, error: msg };
  }
}

/** Health check: Base Sepolia HTTP RPC (vault reads / tx). */
export async function probeBaseSepoliaRpc(): Promise<RpcProbeResult> {
  try {
    const client = viemPublicClient();
    const bn = await client.getBlockNumber();
    return { target: 'base_sepolia', reachable: true, blockNumber: String(bn) };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'RPC unreachable';
    return { target: 'base_sepolia', reachable: false, error: msg };
  }
}

export type VaultConnectionHealth = {
  mode: 'eoa' | 'vault';
  contractAddress: string | null;
  connection: 'ok' | 'skipped' | 'error';
  balanceEth: string | null;
  error?: string;
};

/** Vault ERC-4626 read probe; in eoa mode vault contract is not used for tx. */
export async function probeVaultConnection(): Promise<VaultConnectionHealth> {
  const mode = txMode();
  const addr = (process.env.VAULT_CONTRACT_ADDRESS as string | undefined)?.trim() || null;
  if (mode !== 'vault') {
    return {
      mode: 'eoa',
      contractAddress: addr,
      connection: 'skipped',
      balanceEth: null,
    };
  }
  if (!addr) {
    return {
      mode: 'vault',
      contractAddress: null,
      connection: 'error',
      balanceEth: null,
      error: 'VAULT_CONTRACT_ADDRESS missing',
    };
  }
  try {
    const balanceEth = await getVaultBalance();
    return {
      mode: 'vault',
      contractAddress: addr,
      connection: 'ok',
      balanceEth,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'vault read failed';
    return {
      mode: 'vault',
      contractAddress: addr,
      connection: 'error',
      balanceEth: null,
      error: msg,
    };
  }
}

export function encodeVaultDepositCalldata(amountEth: string, receiver: Address): `0x${string}` {
  return encodeFunctionData({
    abi: valutexVaultAbi,
    functionName: 'deposit',
    args: [parseEther(amountEth), receiver],
  });
}

export function encodeVaultWithdrawCalldata(
  amountEth: string,
  receiver: Address,
  owner: Address
): `0x${string}` {
  return encodeFunctionData({
    abi: valutexVaultAbi,
    functionName: 'withdraw',
    args: [parseEther(amountEth), receiver, owner],
  });
}

export type ParsedDeposit = { sender: Address; owner: Address; assets: bigint };
export async function parseDepositFromReceipt(txHash: Hash, vault: Address): Promise<ParsedDeposit | null> {
  const client = viemPublicClient();
  const receipt = await client.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== 'success') return null;
  const v = getAddress(vault);
  for (const log of receipt.logs) {
    if (getAddress(log.address) !== v) continue;
    try {
      const dec = decodeEventLog({ abi: [depositEventAbi], data: log.data, topics: log.topics });
      if (dec.eventName !== 'Deposit') continue;
      return {
        sender: getAddress(dec.args.sender as Address),
        owner: getAddress(dec.args.owner as Address),
        assets: dec.args.assets as bigint,
      };
    } catch {
      /* skip */
    }
  }
  return null;
}

/**
 * When USE_USEROP=false, performs a server-signed donation (EOA or vault).
 * When USE_USEROP=true, the server does not sign for the donor — use client flow + /donate/confirm.
 */
export async function sendUserOperationForDonation(input: {
  fromAnvilIndex: number;
  amountEth: string;
  receiverAddress: string;
}): Promise<TxResult> {
  if (!envUserOpEnabled()) {
    return sendDonationToVault(input);
  }
  throw new Error(
    'USE_USEROP=true: submit a Privy-sponsored vault deposit from the browser, then POST /api/donate/confirm'
  );
}

/**
 * When USE_USEROP=false, performs a server-signed disbursement.
 * When USE_USEROP=true, treasury must use a client-sponsored withdraw, then POST /api/disburse/confirm.
 */
export async function sendUserOperationForDisbursement(input: {
  fromAnvilIndex: number;
  toAddress: string;
  amountEth: string;
  note?: string;
}): Promise<TxResult> {
  if (!envUserOpEnabled()) {
    return sendDisbursementFromVault(input);
  }
  throw new Error(
    'USE_USEROP=true: submit a Privy-sponsored vault withdraw from the browser, then POST /api/disburse/confirm'
  );
}
