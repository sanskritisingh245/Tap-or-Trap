const express = require('express');
const crypto = require('crypto');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const { signToken } = require('../middleware/auth');

const router = express.Router();

// GET /auth/nonce?wallet=<pubkey>
// Generates a random nonce for the player to sign
router.get('/nonce', (req, res) => {
  const { wallet } = req.query;
  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Missing wallet query parameter' });
  }

  const db = req.app.locals.db;
  const nonce = crypto.randomBytes(32).toString('hex');
  const nonceExpires = Date.now() + 5 * 60 * 1000; // 5 min TTL

  // Upsert player with nonce
  db.prepare(`
    INSERT INTO players (wallet, nonce, nonce_expires, last_seen)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(wallet) DO UPDATE SET
      nonce = excluded.nonce,
      nonce_expires = excluded.nonce_expires,
      last_seen = excluded.last_seen
  `).run(wallet, nonce, nonceExpires, Date.now());

  res.json({ nonce });
});

// POST /auth/verify
// Verifies the player's ed25519 signature of the nonce
router.post('/verify', (req, res) => {
  const { wallet, signature, nonce } = req.body;
  if (!wallet || !signature || !nonce) {
    return res.status(400).json({ error: 'Missing wallet, signature, or nonce' });
  }

  const db = req.app.locals.db;

  // Look up stored nonce
  const player = db.prepare('SELECT nonce, nonce_expires FROM players WHERE wallet = ?').get(wallet);
  if (!player) {
    return res.status(401).json({ error: 'Unknown wallet. Request a nonce first.' });
  }
  if (player.nonce !== nonce) {
    return res.status(401).json({ error: 'Nonce mismatch' });
  }
  if (Date.now() > player.nonce_expires) {
    return res.status(401).json({ error: 'Nonce expired. Request a new one.' });
  }

  // Verify ed25519 signature
  try {
    const messageBytes = new TextEncoder().encode(nonce);
    const signatureBytes = bs58.default.decode(signature);
    const publicKeyBytes = bs58.default.decode(wallet);

    const valid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Signature verification failed' });
  }

  // Clear nonce (single-use)
  const token = signToken(wallet);
  const sessionExpires = Date.now() + 15 * 60 * 1000; // 15 min

  db.prepare(`
    UPDATE players SET
      nonce = NULL,
      nonce_expires = NULL,
      session_token = ?,
      session_expires = ?,
      last_seen = ?
    WHERE wallet = ?
  `).run(token, sessionExpires, Date.now(), wallet);

  res.json({ token });
});

// POST /auth/dev-login — dev mode: skip signature, issue JWT directly
router.post('/dev-login', (req, res) => {
  const { wallet } = req.body;
  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Missing wallet' });
  }

  const db = req.app.locals.db;

  // Upsert player
  db.prepare(`
    INSERT INTO players (wallet, last_seen)
    VALUES (?, ?)
    ON CONFLICT(wallet) DO UPDATE SET last_seen = excluded.last_seen
  `).run(wallet, Date.now());

  const token = signToken(wallet);
  res.json({ token });
});

module.exports = router;
