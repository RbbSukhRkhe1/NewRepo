import { ethers } from 'ethers';
import { dbService } from './db.js';
import { SUPER_RICH_INDEX, anvilAddress } from './anvil.js';
import { wsUrlFromRpc } from './blockchain.js';
import { buildAddressBook, labelForAddress } from './resolve.js';

async function trackedAddresses(): Promise<Set<string>> {
  const set = new Set<string>();
  set.add(anvilAddress(SUPER_RICH_INDEX).toLowerCase());
  const rows = await dbService.getUsersWithAnvilIndex();
  for (const r of rows) {
    set.add(anvilAddress(r.anvil_index).toLowerCase());
  }
  return set;
}

export function startChainWatcher(wsUrl: string): () => void {
  const provider = new ethers.WebSocketProvider(wsUrl);
  provider.on('error', (err: Error) => {
    console.warn('[chain] websocket error (is Anvil running?)', err.message);
  });

  const onBlock = async (blockNumber: number) => {
    const tracked = await trackedAddresses();
    const book = await buildAddressBook();
    try {
      const block = await provider.getBlock(blockNumber, true);
      if (!block) return;
      let txs: ethers.TransactionResponse[] = [];
      try {
        txs = block.prefetchedTransactions ?? [];
      } catch {
        if (!block?.transactions.length) return;
        const resolved = await Promise.all(
          block.transactions.map((h) =>
            typeof h === 'string' ? provider.getTransaction(h) : Promise.resolve(h)
          )
        );
        txs = resolved.filter((t): t is ethers.TransactionResponse => t != null);
      }
      if (!txs.length) return;

      for (const tx of txs) {
        const from = tx.from.toLowerCase();
        const to = (tx.to ?? '').toLowerCase();
        if (!tracked.has(from) && !tracked.has(to)) continue;

        const valueEth = ethers.formatEther(tx.value);
        await dbService.upsertLedgerEntry({
          tx_hash: tx.hash,
          block_number: blockNumber,
          from_addr: tx.from,
          to_addr: tx.to ?? '',
          value_eth: valueEth,
          kind: 'chain_sync',
          cause_id: null,
          from_display_name: labelForAddress(tx.from, book),
          to_display_name: tx.to ? labelForAddress(tx.to, book) : 'Contract',
          cause_name: '',
        });
      }
    } catch (e) {
      console.warn('[chain] block', blockNumber, e);
    }
  };

  provider.on('block', (n: number) => {
    void onBlock(n);
  });

  provider.getNetwork().then(
    () => console.info('[chain] Watching', wsUrl),
    (e) => console.error('[chain] connect failed — is Anvil running?', e)
  );

  return () => {
    provider.removeAllListeners();
    void provider.destroy();
  };
}

export function startChainWatcherSafe(): () => void {
  if ((process.env.CHAIN_TX_MODE ?? 'eoa') === 'vault') {
    console.info('[chain] skipping Anvil WebSocket watcher (CHAIN_TX_MODE=vault)');
    return () => {};
  }
  try {
    return startChainWatcher(wsUrlFromRpc());
  } catch (e) {
    console.warn('[chain] watcher not started:', e);
    return () => {};
  }
}
