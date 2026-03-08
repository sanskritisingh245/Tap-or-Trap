CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,               -- UUIDv4
    player_one TEXT NOT NULL,          -- wallet pubkey
    player_two TEXT NOT NULL,          -- wallet pubkey
    state TEXT NOT NULL DEFAULT 'WAITING',
    draw_time_ms INTEGER,             -- absolute server timestamp for draw
    draw_fired_at INTEGER,            -- actual server timestamp when state flipped
    draw_secret TEXT,                  -- commit-reveal secret (hex)
    draw_commitment TEXT,              -- commit-reveal hash (hex)
    player_one_tap_at INTEGER,        -- server receive time
    player_one_reaction_ms REAL,      -- client-reported reaction
    player_one_early INTEGER DEFAULT 0,
    player_two_tap_at INTEGER,
    player_two_reaction_ms REAL,
    player_two_early INTEGER DEFAULT 0,
    winner TEXT,                       -- wallet pubkey
    forfeit_reason TEXT,              -- 'early_tap', 'timeout', 'disconnect'
    escrow_tx TEXT,                   -- deduct_credit tx signature
    settle_tx TEXT,                   -- settle_match tx signature
    mode TEXT NOT NULL DEFAULT 'single',  -- 'single' or 'bo3'
    series_id TEXT,                   -- links to series table for bo3
    round_number INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    settled_at INTEGER
);

CREATE TABLE IF NOT EXISTS players (
    wallet TEXT PRIMARY KEY,
    session_token TEXT,
    session_expires INTEGER,
    nonce TEXT,
    nonce_expires INTEGER,
    avg_rtt_ms REAL DEFAULT 100,
    last_seen INTEGER,
    credits INTEGER NOT NULL DEFAULT 100,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    max_streak INTEGER NOT NULL DEFAULT 0,
    best_reaction_ms REAL,
    total_matches INTEGER NOT NULL DEFAULT 0,
    xp INTEGER NOT NULL DEFAULT 0,
    tier TEXT NOT NULL DEFAULT 'BRONZE',
    last_login_date TEXT,
    login_streak INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet TEXT NOT NULL,
    challenge_type TEXT NOT NULL,
    target INTEGER NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    reward_xp INTEGER NOT NULL DEFAULT 0,
    reward_credits INTEGER NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    UNIQUE(wallet, challenge_type, date)
);

CREATE TABLE IF NOT EXISTS achievements (
    wallet TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    unlocked_at INTEGER NOT NULL,
    PRIMARY KEY (wallet, achievement_id)
);

CREATE TABLE IF NOT EXISTS series (
    id TEXT PRIMARY KEY,
    player_one TEXT NOT NULL,
    player_two TEXT NOT NULL,
    score_one INTEGER NOT NULL DEFAULT 0,
    score_two INTEGER NOT NULL DEFAULT 0,
    mode TEXT NOT NULL DEFAULT 'bo3',
    state TEXT NOT NULL DEFAULT 'ACTIVE',
    winner TEXT,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS queue (
    wallet TEXT PRIMARY KEY,
    joined_at INTEGER NOT NULL,
    mode TEXT NOT NULL DEFAULT 'single'
);

CREATE TABLE IF NOT EXISTS game_bets (
    id TEXT PRIMARY KEY,
    wallet TEXT NOT NULL,
    game_type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    payout INTEGER DEFAULT 0,
    won INTEGER,
    result TEXT,
    server_seed TEXT,
    client_seed TEXT,
    nonce INTEGER,
    seed_hash TEXT,
    state TEXT DEFAULT 'resolved',
    mines_revealed TEXT,
    mine_count INTEGER,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS crash_rounds (
    id TEXT PRIMARY KEY,
    crash_point REAL NOT NULL,
    server_seed TEXT,
    seed_hash TEXT NOT NULL,
    state TEXT DEFAULT 'betting',
    started_at INTEGER,
    crashed_at INTEGER,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS crash_players (
    round_id TEXT NOT NULL,
    wallet TEXT NOT NULL,
    bet_amount INTEGER NOT NULL,
    cashed_out_at REAL,
    payout INTEGER DEFAULT 0,
    PRIMARY KEY (round_id, wallet)
);

CREATE TABLE IF NOT EXISTS used_topup_signatures (
    signature TEXT PRIMARY KEY,
    wallet TEXT NOT NULL,
    credits_granted INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
    code TEXT PRIMARY KEY,           -- 6-char alphanumeric invite code
    creator_wallet TEXT NOT NULL,    -- player who created the room
    joiner_wallet TEXT,              -- player who joined (NULL until joined)
    match_id TEXT,                   -- linked match (NULL until paired)
    status TEXT NOT NULL DEFAULT 'WAITING',  -- WAITING | MATCHED | CANCELLED | EXPIRED
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL      -- auto-expire after 2 minutes
);
