import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import {
  transact,
  Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { PublicKey, Connection } from '@solana/web3.js';
import bs58 from 'bs58';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestNonce, verifySignature, confirmTopUp } from '../services/api';
import { buildTopUpTransaction, getConnection } from '../services/solana';
import { APP_IDENTITY, CLUSTER } from '../constants';

const STORAGE_KEY_PUBKEY = '@taprush/pubkey';
const STORAGE_KEY_JWT = '@taprush/jwt';

// Decode base64-encoded address from Phantom into a PublicKey
function decodeAddress(address: string): PublicKey {
  if (address.includes('=') || address.includes('+') || address.includes('/')) {
    const bytes = Uint8Array.from(atob(address), (c) => c.charCodeAt(0));
    return new PublicKey(bytes);
  }
  return new PublicKey(address);
}

export function useWallet() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [depositing, setDepositing] = useState(false);

  useEffect(() => {
    // No auto-connect — user must tap Connect
  }, []);

  // ─── Connect ────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    console.log('========== [CONNECT] START ==========');
    setLoading(true);
    try {
      // Step 1: Authorize with wallet app — get wallet address
      console.log('[CONNECT] Step 1: Opening wallet for authorization...');
      const walletAddress = await transact(async (wallet: Web3MobileWallet) => {
        console.log('[CONNECT] Inside transact callback, calling wallet.authorize...');
        const authResult = await wallet.authorize({
          identity: APP_IDENTITY,
          cluster: CLUSTER as any,
        });
        console.log('[CONNECT] wallet.authorize returned, accounts:', authResult.accounts?.length);

        if (!authResult.accounts || authResult.accounts.length === 0) {
          throw new Error('No accounts returned from wallet authorization');
        }

        const rawAddress = authResult.accounts[0].address;
        console.log('[CONNECT] Raw address from wallet:', rawAddress);
        const pubkey = decodeAddress(rawAddress);
        const bs58Address = pubkey.toBase58();
        console.log('[CONNECT] Decoded bs58 address:', bs58Address);
        return bs58Address;
      });

      console.log('[CONNECT] Step 1 DONE. Wallet address:', walletAddress);
      setPublicKey(walletAddress);

      // Step 2: Get nonce from backend
      console.log('[CONNECT] Step 2: Requesting nonce from backend...');
      const nonce = await requestNonce(walletAddress);
      console.log('[CONNECT] Step 2 DONE. Nonce received:', nonce.slice(0, 20) + '...');

      // Step 3: Sign the nonce with the wallet
      console.log('[CONNECT] Step 3: Signing nonce with wallet...');
      const nonceBytes = new TextEncoder().encode(nonce);
      console.log('[CONNECT] Nonce bytes length:', nonceBytes.length);

      const signResult = await transact(async (wallet: Web3MobileWallet) => {
        console.log('[CONNECT] Inside sign transact, calling wallet.authorize...');
        const authResult = await wallet.authorize({
          identity: APP_IDENTITY,
          cluster: CLUSTER as any,
        });
        console.log('[CONNECT] Authorized for signing, calling signMessages...');

        const result = await wallet.signMessages({
          addresses: [authResult.accounts[0].address],
          payloads: [nonceBytes],
        });
        console.log('[CONNECT] signMessages returned, results:', result?.length);
        return result;
      });

      console.log('[CONNECT] Step 3 DONE. Sign result received.');

      // Extract 64-byte ed25519 signature
      const sigBytes = signResult[0];
      console.log('[CONNECT] Signature bytes length:', sigBytes?.length);
      const signatureOnly = sigBytes.slice(0, 64);
      const signatureBs58 = bs58.encode(signatureOnly);
      console.log('[CONNECT] Signature bs58:', signatureBs58.slice(0, 20) + '...');

      // Step 4: Verify with backend → get JWT
      console.log('[CONNECT] Step 4: Verifying signature with backend...');
      const jwt = await verifySignature(walletAddress, signatureBs58, nonce);
      console.log('[CONNECT] Step 4 DONE. JWT received:', jwt.slice(0, 20) + '...');

      await AsyncStorage.multiSet([
        [STORAGE_KEY_PUBKEY, walletAddress],
        [STORAGE_KEY_JWT, jwt],
      ]);
      console.log('[CONNECT] Saved to AsyncStorage');

      setConnected(true);
      console.log('========== [CONNECT] SUCCESS ==========');
    } catch (err: any) {
      console.error('========== [CONNECT] FAILED ==========');
      console.error('[CONNECT] Error name:', err?.name);
      console.error('[CONNECT] Error message:', err?.message);
      console.error('[CONNECT] Error stack:', err?.stack);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Deposit (Top Up) ──────────────────────────────────────────
  const deposit = useCallback(async (): Promise<string> => {
    console.log('========== [DEPOSIT] START ==========');
    console.log('[DEPOSIT] publicKey:', publicKey);

    if (!publicKey) {
      console.error('[DEPOSIT] ABORT: No publicKey');
      throw new Error('Wallet not connected');
    }

    setDepositing(true);
    try {
      const playerPubkey = new PublicKey(publicKey);
      console.log('[DEPOSIT] PlayerPubkey:', playerPubkey.toBase58());

      const connection = getConnection();
      console.log('[DEPOSIT] Connection created');

      // Step 1: Build transaction
      console.log('[DEPOSIT] Step 1: Building top-up transaction...');
      const buildStart = Date.now();
      const { transaction } = await buildTopUpTransaction(playerPubkey);
      console.log('[DEPOSIT] Step 1 DONE in', Date.now() - buildStart, 'ms');
      console.log('[DEPOSIT] Transaction blockhash:', transaction.recentBlockhash);
      console.log('[DEPOSIT] Transaction feePayer:', transaction.feePayer?.toBase58());
      console.log('[DEPOSIT] Transaction instructions:', transaction.instructions.length);

      // Step 2: Sign via MWA
      console.log('[DEPOSIT] Step 2: Opening wallet for signing...');
      const signStart = Date.now();
      const signedTransaction = await transact(async (wallet: Web3MobileWallet) => {
        console.log('[DEPOSIT] Inside transact, calling wallet.authorize...');
        await wallet.authorize({
          identity: APP_IDENTITY,
          cluster: CLUSTER as any,
        });
        console.log('[DEPOSIT] Authorized, calling wallet.signTransactions...');

        const signedTxs = await wallet.signTransactions({
          transactions: [transaction],
        });
        console.log('[DEPOSIT] signTransactions returned, count:', signedTxs?.length);

        if (!signedTxs || signedTxs.length === 0) {
          throw new Error('No signed transaction returned from wallet');
        }

        return signedTxs[0];
      });
      console.log('[DEPOSIT] Step 2 DONE in', Date.now() - signStart, 'ms');
      console.log('[DEPOSIT] Signed tx signature:', signedTransaction.signature ? bs58.encode(signedTransaction.signature) : 'null');

      // Step 3: Send to network
      console.log('[DEPOSIT] Step 3: Sending signed tx to network...');
      await new Promise((r) => setTimeout(r, 500));

      const rawTransaction = signedTransaction.serialize();
      console.log('[DEPOSIT] Serialized tx size:', rawTransaction.length, 'bytes');

      let signature: string | null = null;
      try {
        const sendStart = Date.now();
        signature = await connection.sendRawTransaction(rawTransaction, {
          skipPreflight: true,
          maxRetries: 3,
        });
        console.log('[DEPOSIT] Step 3 DONE in', Date.now() - sendStart, 'ms');
        console.log('[DEPOSIT] TX signature:', signature);
      } catch (err: any) {
        console.warn('[DEPOSIT] sendRawTransaction FAILED:', err?.message);
        console.warn('[DEPOSIT] sendRawTransaction error name:', err?.name);
        console.warn('[DEPOSIT] Falling back to extracted signature...');
        signature = bs58.encode(signedTransaction.signature!);
        console.log('[DEPOSIT] Extracted signature:', signature);
      }

      // Step 4: Tell backend to grant credits
      console.log('[DEPOSIT] Step 4: Calling confirmTopUp API with signature:', signature.slice(0, 20) + '...');
      const apiStart = Date.now();
      try {
        const newBalance = await confirmTopUp(signature);
        console.log('[DEPOSIT] Step 4 DONE in', Date.now() - apiStart, 'ms');
        console.log('[DEPOSIT] New balance:', newBalance);
        console.log('========== [DEPOSIT] SUCCESS ==========');
        return signature;
      } catch (apiErr: any) {
        console.error('[DEPOSIT] confirmTopUp API FAILED in', Date.now() - apiStart, 'ms');
        console.error('[DEPOSIT] API error name:', apiErr?.name);
        console.error('[DEPOSIT] API error message:', apiErr?.message);
        console.error('[DEPOSIT] API error stack:', apiErr?.stack);
        throw apiErr;
      }
    } catch (err: any) {
      console.error('========== [DEPOSIT] FAILED ==========');
      console.error('[DEPOSIT] Error name:', err?.name);
      console.error('[DEPOSIT] Error message:', err?.message);
      console.error('[DEPOSIT] Error stack:', err?.stack);
      throw err;
    } finally {
      setDepositing(false);
    }
  }, [publicKey]);

  // ─── Disconnect ────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    console.log('[DISCONNECT] Clearing state...');
    setPublicKey(null);
    setConnected(false);
    await AsyncStorage.multiRemove([STORAGE_KEY_PUBKEY, STORAGE_KEY_JWT]);
    console.log('[DISCONNECT] Done');
  }, []);

  return {
    publicKey,
    connected,
    loading,
    depositing,
    connect,
    disconnect,
    deposit,
  };
}
