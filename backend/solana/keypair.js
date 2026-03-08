const fs = require('fs');
const path = require('path');
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

/**
 * Loads the treasury keypair.
 * Priority: TREASURY_PRIVATE_KEY env var (base58) > BACKEND_KEYPAIR_PATH JSON file.
 */
function loadBackendKeypair() {
  // 1. Check for base58 private key in env
  const base58Key = process.env.TREASURY_PRIVATE_KEY;
  if (base58Key) {
    const secretKey = bs58.default.decode(base58Key);
    const keypair = Keypair.fromSecretKey(secretKey);
    console.log(`Treasury loaded from TREASURY_PRIVATE_KEY: ${keypair.publicKey.toBase58()}`);
    return keypair;
  }

  // 2. Fall back to JSON file
  const keypairPath = process.env.BACKEND_KEYPAIR_PATH
    || path.join(__dirname, 'backend-keypair.json');

  if (!fs.existsSync(keypairPath)) {
    throw new Error(
      `No treasury key found. Set TREASURY_PRIVATE_KEY (base58) in .env or provide a JSON file at ${keypairPath}`
    );
  }

  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
  console.log(`Treasury loaded from file: ${keypair.publicKey.toBase58()}`);
  return keypair;
}

module.exports = { loadBackendKeypair };
