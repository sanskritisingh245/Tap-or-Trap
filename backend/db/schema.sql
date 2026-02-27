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
    credits INTEGER NOT NULL DEFAULT 5,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    max_streak INTEGER NOT NULL DEFAULT 0,
    best_reaction_ms REAL,
    total_matches INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS queue (
    wallet TEXT PRIMARY KEY,
    joined_at INTEGER NOT NULL
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
