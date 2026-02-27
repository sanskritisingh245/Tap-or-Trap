const fs = require('fs');
const path = require('path');
const { Keypair } = require('@solana/web3.js');

/**
 * Loads the backend authority keypair from a JSON file.
 * This keypair is used to sign deduct_credit, settle_match, and cancel_match transactions.
 */
function loadBackendKeypair() {
  const keypairPath = process.env.BACKEND_KEYPAIR_PATH
    || path.join(__dirname, 'backend-keypair.json');

  if (!fs.existsSync(keypairPath)) {
    console.warn(`Backend keypair not found at ${keypairPath}. Generating a new one for development.`);
    const keypair = Keypair.generate();
    fs.writeFileSync(keypairPath, JSON.stringify(Array.from(keypair.secretKey)));
    console.log(`Generated backend authority: ${keypair.publicKey.toBase58()}`);
    return keypair;
  }

  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

module.exports = { loadBackendKeypair };
