'use client';

import { ReactNode } from 'react';
import { createAppKit } from '@reown/appkit';
import { mainnet } from '@reown/appkit/networks';
import { WalletProvider } from './WalletContext';

// Initialize AppKit
const appKit = createAppKit({
  projectId: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || '', // You'll need to get a project ID
  networks: [mainnet],
  metadata: {
    name: 'RYFIN Exchange',
    description: 'Token Sale Application',
    url: 'https://ryfincoin.com',
    icons: ['/assets/ryfin-logo.svg']
  },
  features: {
    analytics: false,
    email: false,
    socials: false
  }
});

interface AppKitProviderProps {
  children: ReactNode;
}

export default function AppKitProvider({ children }: AppKitProviderProps) {
  return (
    <WalletProvider>
      {children}
      {/* @ts-ignore - This is a custom element from Reown AppKit */}
      <appkit-modal />
    </WalletProvider>
  );
}