import { ethers } from 'ethers';
import { db } from './db.js';
import { SUPER_RICH_INDEX, anvilAddress } from './anvil.js';
import { buildAddressBook, labelForAddress } from './resolve.js';

function trackedAddresses(): Set<string> {
  const set = new Set<string>();
  set.add(anvilAddress(SUPER_RICH_INDEX).toLowerCase());
  const rows = db
    .prepare(`SELECT anvil_index FROM users WHERE anvil_index IS NOT NULL`)
    .all() as { anvil_index: number }[];
  for (const r of rows) {
    set.add(anvilAddress(r.anvil_index).toLowerCase());
  }
  return set;
}

export function startChainWatcher(wsUrl: string): () => void {
  const provider = new ethers.WebSocketProvider(wsUrl);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO ledger_entries (
      tx_hash, block_number, from_addr, to_addr, value_eth, kind,
      cause_id, from_display_name, to_display_name, cause_name
    ) VALUES (?,?,?,?,?,?,?,?,?,?)
  `);

  const onBlock = async (blockNumber: number) => {
    const tracked = trackedAddresses();
    const book = buildAddressBook();
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
        insert.run(
          tx.hash,
          blockNumber,
          tx.from,
          tx.to ?? '',
          valueEth,
          'chain_sync',
          null,
          labelForAddress(tx.from, book),
          tx.to ? labelForAddress(tx.to, book) : 'Contract',
          ''
        );
      }
    } catch (e) {
      console.warn('[chain] block', blockNumber, e);
    }
  };

  provider.on('block', (n: number) => {
    void onBlock(n);
  });

  provider.getNetwork().then(
    () => console.log('[chain] Watching', wsUrl),
    (e) => console.error('[chain] connect failed — is Anvil running?', e)
  );

  return () => {
    provider.removeAllListeners();
    void provider.destroy();
  };
}

export function startChainWatcherSafe(): () => void {
  const http = process.env.ANVIL_RPC_URL ?? 'http://127.0.0.1:8545';
  const ws = process.env.ANVIL_WS_URL ?? http.replace(/^http/i, 'ws');
  try {
    return startChainWatcher(ws);
  } catch (e) {
    console.warn('[chain] watcher not started:', e);
    return () => {};
  }
}
