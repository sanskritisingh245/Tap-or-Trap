import { useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { transact, type AuthToken } from '@solana-mobile/mobile-wallet-adapter-protocol';
import bs58 from 'bs58';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestNonce, verifySignature, devLogin } from '../services/api';
import { APP_IDENTITY } from '../constants';

const STORAGE_KEY_AUTH = '@taprush/mwa_auth_token';
const STORAGE_KEY_PUBKEY = '@taprush/pubkey';

// Base64 helpers
function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Dev mock wallet for simulator / dev mode fallback
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
  const mwaAuthToken = useRef<AuthToken | null>(null);

  const connect = useCallback(async () => {
    setLoading(true);
    try {
      // In dev mode or on non-Android platforms, use dev mock wallet
      // (MWA only works on Android with a real wallet app installed)
      if (__DEV__ || Platform.OS !== 'android') {
        console.log('[useWallet] using dev mock wallet');
        const mockAddress = generateMockWallet();
        console.log('[useWallet] mock address:', mockAddress);
        setPublicKey(mockAddress);
        const token = await devLogin(mockAddress);
        console.log('[useWallet] auth token:', token);
        setConnected(true);
        return;
      }

      // Step 1: Authorize with wallet app (Phantom, Solflare, etc.)
      const authResult = await transact(async (wallet) => {
        const result = await wallet.authorize({
          identity: APP_IDENTITY,
          cluster: 'devnet',
        });
        return result;
      });

      const accountBytes = fromBase64(authResult.accounts[0].address);
      const walletAddress = bs58.encode(accountBytes);
      mwaAuthToken.current = authResult.auth_token;

      console.log('[useWallet] wallet address:', walletAddress);
      setPublicKey(walletAddress);

      // Step 2: Get nonce from backend
      const nonce = await requestNonce(walletAddress);
      console.log('[useWallet] nonce:', nonce);

      // Step 3: Sign the nonce with the wallet
      const nonceBytes = new TextEncoder().encode(nonce);
      const nonceBase64 = toBase64(nonceBytes);

      const signResult = await transact(async (wallet) => {
        await wallet.reauthorize({
          auth_token: mwaAuthToken.current!,
          identity: APP_IDENTITY,
        });
        const result = await wallet.signMessages({
          addresses: [authResult.accounts[0].address],
          payloads: [nonceBase64],
        });
        return result;
      });

      // Convert signature from base64 to bs58 (backend expects bs58)
      const sigBytes = fromBase64(signResult.signed_payloads[0]);
      // The signed_payload is: signature (64 bytes) + original message
      // Extract just the 64-byte signature
      const signatureOnly = sigBytes.slice(0, 64);
      const signatureBs58 = bs58.encode(signatureOnly);
      console.log('[useWallet] signature (bs58):', signatureBs58);

      // Step 4: Verify signature with backend to get JWT
      const jwt = await verifySignature(walletAddress, signatureBs58, nonce);
      console.log('[useWallet] auth token (JWT):', jwt);

      // Persist for session restore
      await AsyncStorage.multiSet([
        [STORAGE_KEY_AUTH, mwaAuthToken.current],
        [STORAGE_KEY_PUBKEY, walletAddress],
      ]);

      setConnected(true);
    } catch (err) {
      console.error('Wallet connection failed:', err);
      // On Android, if MWA fails (no wallet app installed), fall back to dev mode in __DEV__
      if (__DEV__ && Platform.OS === 'android') {
        console.log('[useWallet] MWA failed in dev mode, falling back to mock wallet');
        try {
          const mockAddress = generateMockWallet();
          setPublicKey(mockAddress);
          const token = await devLogin(mockAddress);
          console.log('[useWallet] fallback auth token:', token);
          setConnected(true);
          return;
        } catch (fallbackErr) {
          console.error('Fallback also failed:', fallbackErr);
        }
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signAndSendTransaction = useCallback(
    async (serializedTransaction: Uint8Array): Promise<string> => {
      if (!mwaAuthToken.current) {
        throw new Error('Wallet not connected');
      }

      const txBase64 = toBase64(serializedTransaction);

      const result = await transact(async (wallet) => {
        await wallet.reauthorize({
          auth_token: mwaAuthToken.current!,
          identity: APP_IDENTITY,
        });
        return wallet.signAndSendTransactions({
          payloads: [txBase64],
        });
      });

      const sigBytes = fromBase64(result.signatures[0]);
      const signature = bs58.encode(sigBytes);
      console.log('[useWallet] tx signature:', signature);
      return signature;
    },
    []
  );

  const disconnect = useCallback(async () => {
    if (mwaAuthToken.current && Platform.OS === 'android') {
      try {
        await transact(async (wallet) => {
          await wallet.deauthorize({ auth_token: mwaAuthToken.current! });
        });
      } catch (err) {
        console.warn('[useWallet] deauthorize failed:', err);
      }
    }
    mwaAuthToken.current = null;
    setPublicKey(null);
    setConnected(false);
    await AsyncStorage.multiRemove([STORAGE_KEY_AUTH, STORAGE_KEY_PUBKEY]);
  }, []);

  return {
    publicKey,
    connected,
    loading,
    connect,
    disconnect,
    signAndSendTransaction,
  };
}
