/**
 * Account abstraction integration stub.
 * Week 3 target: wire Privy + Pimlico user operations and replace direct API donation/disbursement calls.
 */
export type SmartAccountInfo = {
  address: string;
  provider: 'privy' | 'pimlico' | 'stub';
};

export async function getSmartAccountInfo(): Promise<SmartAccountInfo | null> {
  // Placeholder for future Privy SDK integration.
  return null;
}
