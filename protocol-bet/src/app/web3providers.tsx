'use client';

import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, bsc, polygon, arbitrum, optimism, base, avalanche } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import '@rainbow-me/rainbowkit/styles.css';

const mantleSepolia = {
  id: 5003,
  name: 'Mantle Sepolia',
  nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.sepolia.mantle.xyz'] } },
  blockExplorers: { default: { name: 'MantleScan Sepolia', url: 'https://sepolia.mantlescan.xyz' } },
} as const;

const bscTestnet = {
  id: 97,
  name: 'BNB Testnet',
  nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
  rpcUrls: { default: { http: ['https://data-seed-prebsc-1-s1.bnbchain.org:8545'] } },
  blockExplorers: { default: { name: 'BscScan Testnet', url: 'https://testnet.bscscan.com' } },
  testnet: true,
} as const;

const queryClient = new QueryClient();

export default function Web3Providers({ children }: { children: ReactNode }) {
  const configRef = useRef<ReturnType<typeof getDefaultConfig> | null>(null);
  
  if (!configRef.current) {
    configRef.current = getDefaultConfig({
      appName: 'Protocol Bet',
      projectId: 'c04340f72bb9dd71c7f22ba48ba492e0',
      chains: [bscTestnet, mantleSepolia, bsc, mainnet, polygon, arbitrum, optimism, base, avalanche],
      ssr: false,
    });
  }

  return (
    <WagmiProvider config={configRef.current}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#ff6b6b', accentColorForeground: '#080812', borderRadius: 'medium' })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
