import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import { SOLANA_RPC_URL, TREASURY_WALLET, TOPUP_LAMPORTS } from '../constants';

const treasuryPubkey = new PublicKey(TREASURY_WALLET);

export function getConnection(): Connection {
  console.log('[SOLANA] Creating connection to:', SOLANA_RPC_URL.slice(0, 40) + '...');
  return new Connection(SOLANA_RPC_URL, 'confirmed');
}

/**
 * Builds a SOL transfer to the treasury wallet.
 * Returns the Transaction object directly so MWA web3js wrapper can sign it.
 */
export async function buildTopUpTransaction(
  playerPubkey: PublicKey,
): Promise<{ transaction: Transaction; blockhash: string; lastValidBlockHeight: number }> {
  console.log('[SOLANA] buildTopUpTransaction called');
  console.log('[SOLANA] Player:', playerPubkey.toBase58());
  console.log('[SOLANA] Treasury:', treasuryPubkey.toBase58());
  console.log('[SOLANA] Amount:', TOPUP_LAMPORTS, 'lamports (', TOPUP_LAMPORTS / 1e9, 'SOL)');

  const connection = getConnection();

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: playerPubkey,
      toPubkey: treasuryPubkey,
      lamports: TOPUP_LAMPORTS,
    }),
  );
  console.log('[SOLANA] Transfer instruction added');

  console.log('[SOLANA] Fetching latest blockhash...');
  const blockhashStart = Date.now();
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  console.log('[SOLANA] Blockhash fetched in', Date.now() - blockhashStart, 'ms');
  console.log('[SOLANA] Blockhash:', blockhash);
  console.log('[SOLANA] Last valid block height:', lastValidBlockHeight);

  transaction.recentBlockhash = blockhash;
  transaction.feePayer = playerPubkey;

  console.log('[SOLANA] Transaction ready (unsigned)');
  return { transaction, blockhash, lastValidBlockHeight };
}
