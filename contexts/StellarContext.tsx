"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { connectFreighter, getFreighterAddress, isFreighterConnected } from '@/lib/freighter';
import { server, STELLAR_RPC_URL } from '@/lib/stellar';

interface StellarContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: string;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const StellarContext = createContext<StellarContextType>({
  address: null,
  isConnected: false,
  isConnecting: false,
  balance: '0',
  connect: async () => {},
  disconnect: () => {},
});

export function useStellarWallet() {
  return useContext(StellarContext);
}

export function StellarProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState('0');

  const fetchBalance = useCallback(async (addr: string) => {
    try {
      const { Horizon } = await import('@stellar/stellar-sdk');
      const horizonServer = new Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await horizonServer.loadAccount(addr);
      const nativeBalance = account.balances.find((b: any) => b.asset_type === 'native');
      setBalance(nativeBalance ? parseFloat(nativeBalance.balance).toFixed(2) : '0');
    } catch {
      setBalance('0');
    }
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const addr = await connectFreighter();
      if (addr) {
        setAddress(addr);
        await fetchBalance(addr);
      }
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [fetchBalance]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setBalance('0');
  }, []);

  // Auto-reconnect on page load
  useEffect(() => {
    const autoConnect = async () => {
      try {
        const connected = await isFreighterConnected();
        if (connected) {
          const addr = await getFreighterAddress();
          if (addr) {
            setAddress(addr);
            await fetchBalance(addr);
          }
        }
      } catch {
        // Freighter not available
      }
    };
    autoConnect();
  }, [fetchBalance]);

  // Refresh balance periodically
  useEffect(() => {
    if (!address) return;
    const interval = setInterval(() => fetchBalance(address), 30000);
    return () => clearInterval(interval);
  }, [address, fetchBalance]);

  return (
    <StellarContext.Provider value={{
      address,
      isConnected: !!address,
      isConnecting,
      balance,
      connect,
      disconnect,
    }}>
      {children}
    </StellarContext.Provider>
  );
}
