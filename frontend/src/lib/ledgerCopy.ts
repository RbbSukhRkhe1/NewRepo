import type { DonationLedgerEntry } from './donationLedger';

export function formatLedgerSummary(entry: DonationLedgerEntry): string {
  if (entry.kind === 'donation_in') {
    return `${entry.fromDisplayName} donated ${entry.amountEth} ETH to ${entry.toDisplayName}`;
  }
  const cause = entry.causeName?.trim();
  if (cause && cause !== 'General allocation') {
    return `${entry.fromDisplayName} sent ${entry.amountEth} ETH for the Cause '${cause}'`;
  }
  return `${entry.fromDisplayName} sent ${entry.amountEth} ETH to ${entry.toDisplayName}`;
}
