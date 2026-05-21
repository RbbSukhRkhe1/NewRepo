import { formatEther, parseEther } from './ethWei';

export function weiFromEthString(amountEth: string): bigint {
  try {
    return parseEther(amountEth);
  } catch {
    return 0n;
  }
}

export function formatEth(wei: bigint, decimals = 6): string {
  const s = formatEther(wei);
  const [i, f = ''] = s.split('.');
  if (decimals <= 0) return i;
  return `${i}.${f.padEnd(decimals, '0').slice(0, decimals)}`.replace(/\.?0+$/, '');
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function initials(name: string): string {
  const t = name.trim();
  if (!t) return '??';
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

export function shortHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export function shortAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function recordedIso(recordedAt: string): string {
  return recordedAt.includes('T') ? recordedAt : `${recordedAt}Z`;
}
