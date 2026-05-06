import type { ReactNode } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { baseSepoliaLocal } from '../lib/chains';

export function AppProviders({ children }: { children: ReactNode }) {
  const appId = import.meta.env.VITE_PRIVY_APP_ID?.trim();

  if (!appId) {
    return children;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email', 'google'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        appearance: { theme: 'dark', accentColor: '#22d3ee' },
        defaultChain: baseSepoliaLocal,
        supportedChains: [baseSepoliaLocal],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
