import { useState, useCallback } from 'react';
import { devLogin } from '../services/api';

// Generate a unique mock wallet address for dev/testing
function generateMockWallet(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
  let addr = 'Dev';
  for (let i = 0; i < 41; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr;
}

export function useWallet() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const connect = useCallback(async () => {
    setLoading(true);
    try {
      // Dev mode: use mock wallet + dev-login (works on all platforms)
      const mockAddress = generateMockWallet();
      setPublicKey(mockAddress);
      await devLogin(mockAddress);
      setConnected(true);
    } catch (err) {
      console.error('Wallet connection failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signAndSendTransaction = useCallback(
    async (_serializedTransaction: Uint8Array) => {
      console.log('[useWallet] dev mode: mock signAndSendTransaction');
      return 'mock-signature';
    },
    []
  );

  return {
    publicKey,
    connected,
    loading,
    connect,
    signAndSendTransaction,
  };
}
