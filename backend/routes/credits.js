const express = require('express');
const { getPlayerCredits } = require('../solana/program');

const router = express.Router();

// GET /credits/balance
router.get('/balance', async (req, res) => {
  if (process.env.SKIP_ONCHAIN === 'true') {
    const player = req.app.locals.db
      .prepare('SELECT credits FROM players WHERE wallet = ?')
      .get(req.wallet);
    return res.json({ playsRemaining: player?.credits ?? 0 });
  }
  try {
    const playsRemaining = await getPlayerCredits(req.wallet);
    res.json({ playsRemaining });
  } catch (err) {
    res.json({ playsRemaining: 0 });
  }
});

// POST /credits/topup — dev mode: add 5 credits
router.post('/topup', (req, res) => {
  if (process.env.SKIP_ONCHAIN !== 'true') {
    return res.status(400).json({ error: 'Use on-chain top-up in production' });
  }
  req.app.locals.db
    .prepare('UPDATE players SET credits = credits + 1000 WHERE wallet = ?')
    .run(req.wallet);
  const player = req.app.locals.db
    .prepare('SELECT credits FROM players WHERE wallet = ?')
    .get(req.wallet);
  res.json({ playsRemaining: player?.credits ?? 5 });
});

module.exports = router;
