'use client';

import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, bsc, polygon, arbitrum, optimism, base, avalanche } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';

const mantle = {
  id: 5000,
  name: 'Mantle',
  nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mantle.xyz'] } },
  blockExplorers: { default: { name: 'MantleScan', url: 'https://mantlescan.xyz' } },
} as const;

const config = getDefaultConfig({
  appName: 'Protocol Bet — Verdict Protocol',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
  chains: [mantle, bsc, mainnet, polygon, arbitrum, optimism, base, avalanche],
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#ff6b6b',
            accentColorForeground: '#080812',
            borderRadius: 'medium',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
