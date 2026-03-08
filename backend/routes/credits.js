const express = require('express');
const { Connection } = require('@solana/web3.js');
const { loadBackendKeypair } = require('../solana/keypair');

const router = express.Router();
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const CREDITS_PER_TOPUP = 5;
const TOPUP_LAMPORTS = 10_000_000; // 0.01 SOL

// GET /credits/balance
router.get('/balance', async (req, res) => {
  const player = req.app.locals.db
    .prepare('SELECT credits, winnings FROM players WHERE wallet = ?')
    .get(req.wallet);
  return res.json({ playsRemaining: player?.credits ?? 0, winnings: player?.winnings ?? 0 });
});

// POST /credits/confirm-topup — grant credits immediately (simplified, no on-chain verification)
router.post('/confirm-topup', async (req, res) => {
  const { signature } = req.body;
  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({ error: 'Missing transaction signature' });
  }

  try {
    console.log(`[confirm-topup] granting credits for sig: ${signature.slice(0, 16)}... wallet: ${req.wallet}`);

    // Atomically check replay + grant credits + record signature
    const grantCredits = req.app.locals.db.transaction(() => {
      const existing = req.app.locals.db
        .prepare('SELECT 1 FROM used_topup_signatures WHERE signature = ?')
        .get(signature);
      if (existing) {
        return { replay: true };
      }

      req.app.locals.db
        .prepare('UPDATE players SET credits = credits + ? WHERE wallet = ?')
        .run(CREDITS_PER_TOPUP, req.wallet);

      req.app.locals.db
        .prepare('INSERT INTO used_topup_signatures (signature, wallet, credits_granted, created_at) VALUES (?, ?, ?, ?)')
        .run(signature, req.wallet, CREDITS_PER_TOPUP, Date.now());

      const player = req.app.locals.db
        .prepare('SELECT credits FROM players WHERE wallet = ?')
        .get(req.wallet);

      return { replay: false, credits: player?.credits ?? 0 };
    });

    const result = grantCredits();
    if (result.replay) {
      return res.status(409).json({ error: 'This transaction signature has already been used' });
    }

    console.log(`[confirm-topup] SUCCESS: +${CREDITS_PER_TOPUP} credits for ${req.wallet.slice(0, 8)}...`);
    res.json({ playsRemaining: result.credits });
  } catch (err) {
    console.error('confirm-topup error:', err.message);
    res.status(500).json({ error: 'Failed to grant credits' });
  }
});

// POST /credits/withdraw — convert winnings back to SOL
const LAMPORTS_PER_CREDIT = 10_000_000;
const MIN_WITHDRAW_CREDITS = 1;

router.post('/withdraw', async (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;
  const { credits: requestedCredits } = req.body;

  const player = db.prepare('SELECT credits, winnings FROM players WHERE wallet = ?').get(wallet);
  const available = player?.winnings ?? 0;

  if (available < MIN_WITHDRAW_CREDITS) {
    return res.status(400).json({ error: 'No winnings to withdraw. Only match winnings can be withdrawn.' });
  }

  const creditsToWithdraw = requestedCredits
    ? Math.min(Math.floor(requestedCredits), available)
    : available;

  if (creditsToWithdraw < MIN_WITHDRAW_CREDITS) {
    return res.status(400).json({ error: `Minimum withdrawal is ${MIN_WITHDRAW_CREDITS} credit(s)` });
  }

  const lamportsToSend = creditsToWithdraw * LAMPORTS_PER_CREDIT;

  try {
    const { PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } = require('@solana/web3.js');
    const connection = new Connection(RPC_URL, 'confirmed');
    const vaultKeypair = loadBackendKeypair();
    const playerPubkey = new PublicKey(wallet);

    // Check vault balance
    const vaultBalance = await connection.getBalance(vaultKeypair.publicKey);
    const FEE_BUFFER = 15_000;

    if (vaultBalance < lamportsToSend + FEE_BUFFER) {
      return res.status(400).json({ error: 'Escrow vault has insufficient funds.' });
    }

    // Deduct credits + winnings
    const deductResult = db.prepare(
      'UPDATE players SET credits = credits - ?, winnings = winnings - ? WHERE wallet = ? AND winnings >= ?'
    ).run(creditsToWithdraw, creditsToWithdraw, wallet, creditsToWithdraw);

    if (deductResult.changes === 0) {
      return res.status(400).json({ error: 'Insufficient winnings' });
    }

    // Send SOL
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: vaultKeypair.publicKey,
        toPubkey: playerPubkey,
        lamports: lamportsToSend,
      })
    );

    let signature;
    try {
      signature = await sendAndConfirmTransaction(connection, transaction, [vaultKeypair], {
        commitment: 'confirmed',
      });
    } catch (txErr) {
      // Refund on failure
      db.prepare('UPDATE players SET credits = credits + ?, winnings = winnings + ? WHERE wallet = ?')
        .run(creditsToWithdraw, creditsToWithdraw, wallet);
      return res.status(500).json({ error: 'Transaction failed on-chain. Credits refunded.' });
    }

    const updated = db.prepare('SELECT credits FROM players WHERE wallet = ?').get(wallet);
    res.json({
      playsRemaining: updated?.credits ?? 0,
      withdrawn: creditsToWithdraw,
      lamports: lamportsToSend,
      signature,
    });
  } catch (err) {
    console.error('[WITHDRAW] Error:', err.message);
    res.status(500).json({ error: 'Withdrawal failed: ' + err.message });
  }
});

module.exports = router;
