const { pgTable, text, integer, bigint, real, serial, primaryKey, uniqueIndex } = require('drizzle-orm/pg-core');

// ---------- matches ----------
const matches = pgTable('matches', {
  id: text('id').primaryKey(),
  playerOne: text('player_one').notNull(),
  playerTwo: text('player_two').notNull(),
  state: text('state').notNull().default('WAITING'),
  drawTimeMs: bigint('draw_time_ms', { mode: 'number' }),
  drawFiredAt: bigint('draw_fired_at', { mode: 'number' }),
  drawSecret: text('draw_secret'),
  drawCommitment: text('draw_commitment'),
  playerOneTapAt: bigint('player_one_tap_at', { mode: 'number' }),
  playerOneReactionMs: real('player_one_reaction_ms'),
  playerOneEarly: integer('player_one_early').default(0),
  playerTwoTapAt: bigint('player_two_tap_at', { mode: 'number' }),
  playerTwoReactionMs: real('player_two_reaction_ms'),
  playerTwoEarly: integer('player_two_early').default(0),
  winner: text('winner'),
  forfeitReason: text('forfeit_reason'),
  escrowTx: text('escrow_tx'),
  settleTx: text('settle_tx'),
  mode: text('mode').notNull().default('single'),
  seriesId: text('series_id'),
  roundNumber: integer('round_number').default(1),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  settledAt: bigint('settled_at', { mode: 'number' }),
});

// ---------- players ----------
const players = pgTable('players', {
  wallet: text('wallet').primaryKey(),
  sessionToken: text('session_token'),
  sessionExpires: bigint('session_expires', { mode: 'number' }),
  nonce: text('nonce'),
  nonceExpires: bigint('nonce_expires', { mode: 'number' }),
  avgRttMs: real('avg_rtt_ms').default(100),
  lastSeen: bigint('last_seen', { mode: 'number' }),
  credits: integer('credits').notNull().default(100),
  wins: integer('wins').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  currentStreak: integer('current_streak').notNull().default(0),
  maxStreak: integer('max_streak').notNull().default(0),
  bestReactionMs: real('best_reaction_ms'),
  totalMatches: integer('total_matches').notNull().default(0),
  xp: integer('xp').notNull().default(0),
  tier: text('tier').notNull().default('BRONZE'),
  lastLoginDate: text('last_login_date'),
  loginStreak: integer('login_streak').notNull().default(0),
  winnings: integer('winnings').notNull().default(0),
});

// ---------- daily_challenges ----------
const dailyChallenges = pgTable('daily_challenges', {
  id: serial('id').primaryKey(),
  wallet: text('wallet').notNull(),
  challengeType: text('challenge_type').notNull(),
  target: integer('target').notNull(),
  progress: integer('progress').notNull().default(0),
  completed: integer('completed').notNull().default(0),
  rewardXp: integer('reward_xp').notNull().default(0),
  rewardCredits: integer('reward_credits').notNull().default(0),
  date: text('date').notNull(),
}, (table) => [
  uniqueIndex('daily_challenges_wallet_type_date').on(table.wallet, table.challengeType, table.date),
]);

// ---------- achievements ----------
const achievements = pgTable('achievements', {
  wallet: text('wallet').notNull(),
  achievementId: text('achievement_id').notNull(),
  unlockedAt: bigint('unlocked_at', { mode: 'number' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.wallet, table.achievementId] }),
]);

// ---------- series ----------
const series = pgTable('series', {
  id: text('id').primaryKey(),
  playerOne: text('player_one').notNull(),
  playerTwo: text('player_two').notNull(),
  scoreOne: integer('score_one').notNull().default(0),
  scoreTwo: integer('score_two').notNull().default(0),
  mode: text('mode').notNull().default('bo3'),
  state: text('state').notNull().default('ACTIVE'),
  winner: text('winner'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

// ---------- queue ----------
const queue = pgTable('queue', {
  wallet: text('wallet').primaryKey(),
  joinedAt: bigint('joined_at', { mode: 'number' }).notNull(),
  mode: text('mode').notNull().default('single'),
});

// ---------- game_bets ----------
const gameBets = pgTable('game_bets', {
  id: text('id').primaryKey(),
  wallet: text('wallet').notNull(),
  gameType: text('game_type').notNull(),
  amount: integer('amount').notNull(),
  payout: integer('payout').default(0),
  won: integer('won'),
  result: text('result'),
  serverSeed: text('server_seed'),
  clientSeed: text('client_seed'),
  nonce: integer('nonce'),
  seedHash: text('seed_hash'),
  state: text('state').default('resolved'),
  minesRevealed: text('mines_revealed'),
  mineCount: integer('mine_count'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

// ---------- crash_rounds ----------
const crashRounds = pgTable('crash_rounds', {
  id: text('id').primaryKey(),
  crashPoint: real('crash_point').notNull(),
  serverSeed: text('server_seed'),
  seedHash: text('seed_hash').notNull(),
  state: text('state').default('betting'),
  startedAt: bigint('started_at', { mode: 'number' }),
  crashedAt: bigint('crashed_at', { mode: 'number' }),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

// ---------- crash_players ----------
const crashPlayers = pgTable('crash_players', {
  roundId: text('round_id').notNull(),
  wallet: text('wallet').notNull(),
  betAmount: integer('bet_amount').notNull(),
  cashedOutAt: real('cashed_out_at'),
  payout: integer('payout').default(0),
}, (table) => [
  primaryKey({ columns: [table.roundId, table.wallet] }),
]);

// ---------- used_topup_signatures ----------
const usedTopupSignatures = pgTable('used_topup_signatures', {
  signature: text('signature').primaryKey(),
  wallet: text('wallet').notNull(),
  creditsGranted: integer('credits_granted').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

// ---------- rooms ----------
const rooms = pgTable('rooms', {
  code: text('code').primaryKey(),
  creatorWallet: text('creator_wallet').notNull(),
  joinerWallet: text('joiner_wallet'),
  matchId: text('match_id'),
  status: text('status').notNull().default('WAITING'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  expiresAt: bigint('expires_at', { mode: 'number' }).notNull(),
});

module.exports = {
  matches,
  players,
  dailyChallenges,
  achievements,
  series,
  queue,
  gameBets,
  crashRounds,
  crashPlayers,
  usedTopupSignatures,
  rooms,
};
