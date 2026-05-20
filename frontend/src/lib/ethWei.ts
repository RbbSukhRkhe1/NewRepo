/** 1 ETH in wei — local helpers so the frontend does not depend on `ethers` for tsc/vite. */

const WEI_PER_ETH = 10n ** 18n;

export function parseEther(eth: string): bigint {
  try {
    let s = eth.trim().replace(/_/g, '');
    if (!s) return 0n;
    const neg = s[0] === '-';
    if (neg) s = s.slice(1);
    if (!/^\d*\.?\d*$/.test(s)) return 0n;
    const [ip, fp = ''] = s.split('.');
    const intPart = ip === '' ? '0' : ip;
    if (!/^\d+$/.test(intPart)) return 0n;
    const fracRaw = (fp + '0'.repeat(18)).slice(0, 18);
    if (fp && !/^\d*$/.test(fp)) return 0n;
    const fracPadded = fracRaw.padEnd(18, '0');
    const whole = BigInt(intPart) * WEI_PER_ETH + BigInt(fracPadded);
    return neg ? -whole : whole;
  } catch {
    return 0n;
  }
}

export function formatEther(wei: bigint): string {
  const neg = wei < 0n;
  const v = neg ? -wei : wei;
  const whole = v / WEI_PER_ETH;
  const frac = v % WEI_PER_ETH;
  const fracStr = frac.toString().padStart(18, '0').replace(/0+$/, '');
  if (!fracStr) return neg ? `-${whole}` : `${whole}`;
  const out = `${whole}.${fracStr}`;
  return neg ? `-${out}` : out;
}
