# SnapDuel — Architecture & Build Plan

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [Solana Program (On-Chain)](#3-solana-program-on-chain)
4. [Backend (Node.js)](#4-backend-nodejs)
5. [Frontend (Expo / React Native)](#5-frontend-expo--react-native)
6. [Draw Timing & Randomness](#6-draw-timing--randomness)
7. [Anti-Cheat Model](#7-anti-cheat-model)
8. [Match Lifecycle (End-to-End)](#8-match-lifecycle-end-to-end)
9. [API Contract](#9-api-contract)
10. [Directory Structure](#10-directory-structure)
11. [Build Order & Milestones](#11-build-order--milestones)

---

## 1. Product Overview

**SnapDuel** is a mobile-only quick-draw betting game on Solana.

**Core loop (2 players, 2 phones):**
- Player A creates a match or joins the queue from **their phone**
- Player B joins from **their phone** (via invite code or random matchmaking)
- Both players wager SOL
- Both enter a full-screen standoff screen **on their own device**
- After a random delay (2–15 s), **both phones vibrate simultaneously**
- First tap **after** vibration wins
- Tap **before** vibration = instant forfeit
- Winner gets pot minus rake

**Multiplayer model:**
- **Each player uses their own phone** — there is NO shared-device mode
- Players connect through a backend server over the internet
- Two ways to find an opponent:
  1. **Random matchmaking** — join a queue, get paired with a stranger
  2. **Friend challenge** — create a room, share a 6-character invite code, friend joins with that code
- Both players must have the app installed on their own device

**Key constraints:**
- Mobile only — desktop is blocked
- No per-match on-chain transactions
- Treasury + credit system (1 top-up tx → 5 plays)
- No WebSockets — HTTP polling only
- Single-screen game with minimal UI
- **2 separate phones required** — one player per device

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────┐
│                    MOBILE CLIENT                      │
│  Expo (React Native) + Solana Mobile Wallet Adapter   │
│  Haptics · Accelerometer · High-precision timer       │
└──────────────┬───────────────────────┬───────────────┘
               │ HTTP (REST)           │ RPC (one-time)
               ▼                       ▼
┌──────────────────────┐   ┌────────────────────────────┐
│   NODE.JS BACKEND    │   │     SOLANA BLOCKCHAIN      │
│                      │   │                            │
│ • Matchmaking        │──▶│ • Treasury PDA             │
│ • Draw-time oracle   │   │ • PlayerCredits PDA        │
│ • Tap arbitration    │   │ • MatchEscrow PDA          │
│ • Anti-cheat         │   │ • Leaderboard PDA          │
│ • Settlement trigger │   │ • SnapDuel Anchor Program  │
└──────────────────────┘   └────────────────────────────┘
```

**Communication model — 2 phones, NO WebSockets:**
- Each phone runs its own instance of the app
- Both phones independently poll the **same backend server** via HTTP short-polling (every 300ms during standoff)
- The backend is the **single source of truth** — it coordinates both players
- All match state transitions are request/response
- Backend returns match phase in each poll response
- Players never communicate directly (no peer-to-peer) — all data flows through the backend

```
┌──────────────┐         ┌──────────────────┐         ┌──────────────┐
│   PHONE A    │◄──HTTP──►│  BACKEND SERVER  │◄──HTTP──►│   PHONE B    │
│  (Player 1)  │  polling │  (Source of      │  polling │  (Player 2)  │
│              │          │   Truth)         │          │              │
└──────────────┘         └──────────────────┘         └──────────────┘
```

---

## 3. Solana Program (On-Chain)

### 3.1 Accounts

#### Treasury PDA
```
Seeds: [b"treasury"]
```
- Program-owned account that holds deposited SOL
- Receives top-up payments from players
- Receives rake from settled matches
- Only the program can debit it (via `invoke_signed`)

#### PlayerCredits PDA (one per player)
```
Seeds: [b"credits", player_pubkey.as_ref()]
```
```rust
#[account]
pub struct PlayerCredits {
    pub player: Pubkey,       // 32 bytes
    pub plays_remaining: u8,  // 1 byte  (max 255, practically 0–5)
    pub total_topped_up: u64, // 8 bytes (lifetime tracking)
    pub bump: u8,             // 1 byte
}
// Space: 8 (discriminator) + 32 + 1 + 8 + 1 = 50 bytes
```

#### MatchEscrow PDA (one per match)
```
Seeds: [b"escrow", match_id.as_bytes()]
```
```rust
#[account]
pub struct MatchEscrow {
    pub match_id: [u8; 16],    // 16 bytes (UUID from backend)
    pub player_one: Pubkey,    // 32 bytes
    pub player_two: Pubkey,    // 32 bytes
    pub wager_lamports: u64,   // 8 bytes  (per-player wager)
    pub settled: bool,         // 1 byte
    pub winner: Pubkey,        // 32 bytes (zero until settled)
    pub created_at: i64,       // 8 bytes
    pub bump: u8,              // 1 byte
}
// Space: 8 + 16 + 32 + 32 + 8 + 1 + 32 + 8 + 1 = 138 bytes
```

#### Leaderboard PDA (one per player)
```
Seeds: [b"leaderboard", player_pubkey.as_ref()]
```
```rust
#[account]
pub struct Leaderboard {
    pub player: Pubkey,   // 32 bytes
    pub wins: u32,        // 4 bytes
    pub losses: u32,      // 4 bytes
    pub elo: u16,         // 2 bytes (starts at 1000)
    pub bump: u8,         // 1 byte
}
// Space: 8 + 32 + 4 + 4 + 2 + 1 = 51 bytes
```

### 3.2 Instructions

The program has **4 instructions** and stays under ~250 LOC.

#### `top_up`
```
Signer: player
Accounts: player, treasury, player_credits, system_program
```
1. Transfer fixed amount of SOL (e.g., ~$5 worth) from player → treasury via CPI to System Program
2. If `player_credits` account doesn't exist, `init` it
3. Increment `plays_remaining += 5`
4. Increment `total_topped_up`

**Why this is safe:** The SOL transfer and credit increment happen atomically in one transaction. If the transfer fails, credits are not minted.

#### `deduct_credit`
```
Signer: backend_authority (server keypair)
Accounts: player_one_credits, player_two_credits, match_escrow, system_program
```
1. Verify `backend_authority` matches a hardcoded/configurable authority pubkey
2. Assert `player_one_credits.plays_remaining >= 1`
3. Assert `player_two_credits.plays_remaining >= 1`
4. Decrement both atomically: `plays_remaining -= 1`
5. Init `match_escrow` PDA with `match_id`, both player pubkeys, `settled = false`
6. Transfer wager amount from treasury → escrow (treasury signs via PDA seeds)

**Why backend authority?** Players cannot self-serve match creation — only the server (which controls matchmaking) can pair players and deduct credits. This prevents a player from burning another player's credits.

**Double-spend prevention:** The `match_escrow` PDA is derived from a unique `match_id` (UUID). Attempting to create the same escrow twice will fail because `init` requires the account to not already exist. The credit decrement is atomic with escrow creation.

#### `settle_match`
```
Signer: backend_authority
Accounts: match_escrow, winner, treasury, winner_leaderboard, loser_leaderboard, system_program
```
1. Verify `backend_authority`
2. Assert `match_escrow.settled == false`
3. Assert `winner` is either `player_one` or `player_two`
4. Calculate rake: `rake = wager_lamports * 2 * RAKE_BPS / 10000` (e.g., 5% = 500 bps)
5. Transfer `(wager_lamports * 2) - rake` from escrow → winner (escrow PDA signs)
6. Transfer `rake` from escrow → treasury (escrow PDA signs)
7. Set `match_escrow.settled = true`, `match_escrow.winner = winner`
8. Update leaderboard: winner.wins++, loser.losses++, recalculate ELO

**Replay prevention:** `settled` flag is checked first. Once true, the instruction will always fail with `MatchAlreadySettled`.

#### `cancel_match`
```
Signer: backend_authority
Accounts: match_escrow, treasury, player_one_credits, player_two_credits, system_program
```
1. Assert `match_escrow.settled == false`
2. Return escrowed SOL back to treasury
3. Refund 1 credit to each player
4. Set `match_escrow.settled = true`

Used for disconnects, timeouts, or disputed matches.

### 3.3 Program Skeleton (~250 LOC)

```rust
use anchor_lang::prelude::*;

declare_id!("SNAPDUE1...");

const RAKE_BPS: u64 = 500; // 5%
const CREDITS_PER_TOPUP: u8 = 5;
const WAGER_LAMPORTS: u64 = 10_000_000; // ~0.01 SOL per side

#[program]
pub mod snapduel {
    use super::*;

    pub fn top_up(ctx: Context<TopUp>) -> Result<()> { /* ... */ }
    pub fn deduct_credit(ctx: Context<DeductCredit>, match_id: [u8; 16]) -> Result<()> { /* ... */ }
    pub fn settle_match(ctx: Context<SettleMatch>, winner: Pubkey) -> Result<()> { /* ... */ }
    pub fn cancel_match(ctx: Context<CancelMatch>) -> Result<()> { /* ... */ }
}

#[derive(Accounts)]
pub struct TopUp<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(mut, seeds = [b"treasury"], bump)]
    pub treasury: SystemAccount<'info>,
    #[account(
        init_if_needed,
        payer = player,
        space = 50,
        seeds = [b"credits", player.key().as_ref()],
        bump
    )]
    pub player_credits: Account<'info, PlayerCredits>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(match_id: [u8; 16])]
pub struct DeductCredit<'info> {
    pub authority: Signer<'info>,  // backend keypair
    #[account(mut, seeds = [b"credits", player_one.key().as_ref()], bump)]
    pub player_one_credits: Account<'info, PlayerCredits>,
    #[account(mut, seeds = [b"credits", player_two.key().as_ref()], bump)]
    pub player_two_credits: Account<'info, PlayerCredits>,
    /// CHECK: read-only for seed derivation
    pub player_one: UncheckedAccount<'info>,
    /// CHECK: read-only for seed derivation
    pub player_two: UncheckedAccount<'info>,
    #[account(mut, seeds = [b"treasury"], bump)]
    pub treasury: SystemAccount<'info>,
    #[account(
        init,
        payer = authority,
        space = 138,
        seeds = [b"escrow", &match_id],
        bump
    )]
    pub match_escrow: Account<'info, MatchEscrow>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleMatch<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"escrow", &match_escrow.match_id],
        bump = match_escrow.bump,
        constraint = !match_escrow.settled @ ErrorCode::MatchAlreadySettled
    )]
    pub match_escrow: Account<'info, MatchEscrow>,
    /// CHECK: validated against escrow player fields
    #[account(mut)]
    pub winner: UncheckedAccount<'info>,
    #[account(mut, seeds = [b"treasury"], bump)]
    pub treasury: SystemAccount<'info>,
    #[account(mut, seeds = [b"leaderboard", match_escrow.player_one.as_ref()], bump)]
    pub player_one_leaderboard: Account<'info, Leaderboard>,
    #[account(mut, seeds = [b"leaderboard", match_escrow.player_two.as_ref()], bump)]
    pub player_two_leaderboard: Account<'info, Leaderboard>,
    pub system_program: Program<'info, System>,
}
```

### 3.4 Security Invariants

| Invariant | Enforcement |
|-----------|-------------|
| Credits can't go negative | `constraint = plays_remaining >= 1` on deduct |
| Escrow can't be replayed | `init` fails if PDA exists; `settled` flag checked |
| Only backend can deduct/settle | `authority` signer must match stored program authority |
| SOL transfer is atomic with credit change | Single transaction, Solana's atomicity guarantee |
| No per-match user transactions | Users only sign `top_up`; everything else is backend-signed |

---

## 4. Backend (Node.js)

### 4.1 Tech Stack

- **Runtime:** Node.js (v20+)
- **Framework:** Express.js
- **Solana SDK:** `@solana/web3.js` + `@coral-xyz/anchor`
- **Database:** SQLite (via `better-sqlite3`) for match state — lightweight, zero-config, sufficient for single-server
- **Auth:** Signed message verification (player signs a nonce with their wallet; backend verifies signature)

### 4.2 Core Modules

```
backend/
├── server.js              # Express app entry
├── routes/
│   ├── auth.js            # Wallet signature login
│   ├── matchmaking.js     # Random queue + friend challenge rooms
│   ├── match.js           # Match state polling + tap submission
│   └── credits.js         # Credit balance check
├── services/
│   ├── matchmaker.js      # Random pairing + room-based pairing
│   ├── room-manager.js    # Invite code generation, room lifecycle, expiry
│   ├── draw-timer.js      # Randomness + draw time generation
│   ├── arbitrator.js      # Tap validation + winner selection
│   └── settler.js         # On-chain settlement
├── solana/
│   ├── program.js         # Anchor client wrapper
│   └── keypair.js         # Backend authority keypair loader
├── db/
│   └── schema.sql         # SQLite schema
└── middleware/
    └── auth.js            # JWT/session verification
```

### 4.3 Authentication Flow

1. Client requests a nonce: `GET /auth/nonce?wallet=<pubkey>`
2. Backend generates random nonce, stores it with TTL
3. Client signs nonce with MWA: `signMessage(nonce)`
4. Client sends: `POST /auth/verify { wallet, signature, nonce }`
5. Backend verifies ed25519 signature against wallet pubkey
6. Backend issues a short-lived JWT (15 min) or session token
7. All subsequent requests include `Authorization: Bearer <token>`

### 4.4 Matchmaking (HTTP Polling, No WebSocket)

Two ways for players on **separate phones** to find each other:

#### Option A: Random Matchmaking (strangers)

```
POST /matchmaking/join        → adds player to queue, returns { status: "queued" }
GET  /matchmaking/status      → polls for match assignment
POST /matchmaking/leave       → removes player from queue
```

**Polling flow:**
1. Player A (Phone A) calls `POST /matchmaking/join`
2. Player B (Phone B) calls `POST /matchmaking/join`
3. Both players poll `GET /matchmaking/status` every 500ms from their own phone
4. Backend matchmaker runs a loop (every 500ms):
   - If 2+ players in queue with valid credits → pair them
   - Generate unique `match_id` (UUIDv4)
   - Call `deduct_credit` on-chain (backend signs)
   - Create match record in SQLite with state `WAITING`
5. Next poll from **both phones** returns `{ status: "matched", matchId: "...", opponent: "Ab3x..." }`

#### Option B: Friend Challenge (invite code)

For playing with a specific friend on another phone:

```
POST /matchmaking/create-room  → creates a private room, returns { roomCode: "A3X9K2" }
POST /matchmaking/join-room    → joins via invite code { roomCode: "A3X9K2" }
GET  /matchmaking/status       → polls for match assignment (same as random)
```

**Flow:**
1. Player A (Phone A) taps "Challenge Friend" → calls `POST /matchmaking/create-room`
2. Backend generates a 6-character alphanumeric room code, returns it
3. Player A **shares the code** with Player B (via text, in person, etc.)
4. Player A's screen shows the room code + "Waiting for opponent..."
5. Player B (Phone B) taps "Join Room" → enters the code → calls `POST /matchmaking/join-room { roomCode: "A3X9K2" }`
6. Backend pairs them immediately (same flow as random from here)
7. Both phones' next poll returns `{ status: "matched", matchId: "...", opponent: "..." }`

**Room expiry:** Rooms expire after 2 minutes if no one joins. Creator can cancel anytime.

**Match state machine:**
```
QUEUED → MATCHED → STANDOFF → DRAW_FIRED → RESOLVED → SETTLED
```

### 4.5 Match Flow (Backend is Source of Truth)

#### Phase 1: STANDOFF
- Both players poll `GET /match/:id/state` every 300ms
- Backend returns `{ phase: "standoff", serverTime: <ms> }`
- **Draw time is pre-computed but never sent to clients** (see Section 6)

#### Phase 2: DRAW_FIRED
- At the scheduled draw time, backend flips match state to `DRAW_FIRED`
- Next poll from each client returns `{ phase: "draw", drawFiredAt: <server_timestamp> }`
- Client triggers haptic vibration upon receiving this response
- Client starts local high-precision timer

#### Phase 3: TAP SUBMISSION
```
POST /match/:id/tap
Body: { tapTimestamp: <client_ms>, clientDrawReceived: <client_ms> }
```

- Backend records tap for each player
- Backend computes **reaction time** = `tapTimestamp - drawFiredAt` adjusted for network latency (see Section 4.6)

#### Phase 4: RESOLUTION
- Once both taps received (or timeout after 5s):
  - If either player tapped before `drawFiredAt` → that player forfeits
  - If both tapped after → lower reaction time wins
  - If only one tapped → that player wins (opponent timed out)
- Backend calls `settle_match` on-chain
- Next poll returns `{ phase: "result", winner: "...", reactionTime: <ms>, playsRemaining: <n> }`

### 4.6 Latency Fairness Model

**Problem:** Player A on fast WiFi gets the "draw" poll response 50ms sooner than Player B on 4G. This creates an unfair advantage.

**Solution — Latency-Compensated Reaction Time:**

1. **Measure round-trip time (RTT):** During the STANDOFF phase, each poll response includes `serverTime`. Client computes `RTT = now() - requestSentAt`. Backend also tracks recent RTTs per player.

2. **Estimate one-way latency:** `latency_estimate = avg(last_5_RTTs) / 2`

3. **Adjusted reaction time:**
   ```
   adjusted_reaction = (client_tap_timestamp - client_draw_received_timestamp)
   ```
   The key insight: we use the **client-local** interval between receiving the draw signal and tapping. This interval is not affected by network latency because both events happen on the same device.

4. **Why this works:** The client reports:
   - `clientDrawReceived`: local timestamp when poll response arrived
   - `tapTimestamp`: local timestamp when screen was tapped
   - `reactionTime = tapTimestamp - clientDrawReceived`

   The backend uses this self-reported reaction time but **validates it** against server-side bounds:
   - If `reactionTime < 80ms` → suspicious (human limit), flag or reject
   - If `reactionTime > 5000ms` → timeout
   - Cross-check: `server_tap_received - drawFiredAt - estimated_RTT ≈ reported_reactionTime` (within tolerance)

5. **Tie-breaking:** If both players' adjusted reaction times are within 10ms of each other → rematch (no credit cost).

### 4.7 Database Schema

```sql
CREATE TABLE matches (
    id TEXT PRIMARY KEY,               -- UUIDv4
    player_one TEXT NOT NULL,          -- wallet pubkey
    player_two TEXT NOT NULL,          -- wallet pubkey
    state TEXT NOT NULL DEFAULT 'WAITING',
    draw_time_ms INTEGER,             -- absolute server timestamp for draw
    draw_fired_at INTEGER,            -- actual server timestamp when state flipped
    player_one_tap_at INTEGER,        -- server receive time
    player_one_reaction_ms REAL,      -- client-reported reaction
    player_two_tap_at INTEGER,
    player_two_reaction_ms REAL,
    winner TEXT,                       -- wallet pubkey
    forfeit_reason TEXT,              -- 'early_tap', 'timeout', 'disconnect'
    escrow_tx TEXT,                   -- deduct_credit tx signature
    settle_tx TEXT,                   -- settle_match tx signature
    created_at INTEGER NOT NULL,
    settled_at INTEGER
);

CREATE TABLE players (
    wallet TEXT PRIMARY KEY,
    session_token TEXT,
    session_expires INTEGER,
    avg_rtt_ms REAL DEFAULT 100,
    last_seen INTEGER
);

CREATE TABLE queue (
    wallet TEXT PRIMARY KEY,
    joined_at INTEGER NOT NULL
);

CREATE TABLE rooms (
    code TEXT PRIMARY KEY,           -- 6-char alphanumeric invite code
    creator_wallet TEXT NOT NULL,    -- player who created the room
    joiner_wallet TEXT,              -- player who joined (NULL until joined)
    match_id TEXT,                   -- linked match (NULL until paired)
    status TEXT NOT NULL DEFAULT 'WAITING',  -- WAITING | MATCHED | CANCELLED | EXPIRED
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL      -- auto-expire after 2 minutes
);
```

### 4.8 Disconnect Handling

- If a player stops polling for > 3 seconds during STANDOFF → auto-forfeit that player
- If a player doesn't submit a tap within 5 seconds of DRAW_FIRED → timeout loss
- If **both** disconnect → `cancel_match`, credits refunded
- Backend runs a periodic cleanup job (every 10s) to find stale matches

### 4.9 Ensuring One Result Only

- SQLite match record has a `state` field that transitions strictly: `WAITING → STANDOFF → DRAW_FIRED → RESOLVED → SETTLED`
- State transitions use `UPDATE ... WHERE state = '<expected>'` — if 0 rows affected, transition was already made
- `settle_match` on-chain checks `settled == false`
- Double-tap from same player: backend ignores second tap if first already recorded

---

## 5. Frontend (Expo / React Native)

### 5.1 Tech Stack

- **Framework:** Expo SDK 52+ (managed workflow with custom dev client)
- **Wallet:** `@solana-mobile/mobile-wallet-adapter-protocol` + `@wallet-ui/react-native-web3js`
- **Haptics:** `expo-haptics`
- **Sensors:** `expo-sensors` (Accelerometer)
- **Audio:** `expo-av`
- **HTTP:** `fetch` (native, no axios needed)

### 5.2 Mobile-Only Enforcement

```javascript
// app/_layout.tsx (or App.tsx)
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
    // Render a "Mobile Only" message, block all game logic
    // Never load wallet adapter or game screens
}
```

Additional enforcement:
- Expo config: `"platforms": ["ios", "android"]` — no web build
- Backend: check `User-Agent` header; reject non-mobile clients (defense in depth, not sole protection)

### 5.3 Screens (Each Phone Shows the Same Flow Independently)

Each player sees this flow **on their own phone**. Both phones run the same app, connected to the same backend.

```
PHONE A (Player 1)                          PHONE B (Player 2)
══════════════════                          ══════════════════

┌─────────────────────────┐                ┌─────────────────────────┐
│     CONNECT WALLET      │  Phase 0       │     CONNECT WALLET      │
│     [Connect Button]    │                │     [Connect Button]    │
└─────────────────────────┘                └─────────────────────────┘
          │                                          │
          ▼                                          ▼
┌─────────────────────────┐                ┌─────────────────────────┐
│     BUY 5 PLAYS         │  Phase 1       │     BUY 5 PLAYS         │
│     ~$5 in SOL          │  (if needed)   │     ~$5 in SOL          │
│     [Buy Button]        │                │     [Buy Button]        │
└─────────────────────────┘                └─────────────────────────┘
          │                                          │
          ▼                                          ▼
┌─────────────────────────┐                ┌─────────────────────────┐
│  [Find Random Opponent] │  Phase 2       │  [Find Random Opponent] │
│  [Challenge a Friend]   │  Choose mode   │  [Join with Code]       │
└─────────────────────────┘                └─────────────────────────┘
          │                                          │
          ▼                                          ▼
┌─────────────────────────┐                ┌─────────────────────────┐
│  Room Code: A3X9K2      │  Phase 2b      │  Enter Code: [______]   │
│  Share with your friend │  (challenge)   │  [Join]                 │
│  Waiting...             │                │                         │
└─────────────────────────┘                └─────────────────────────┘
          │                 ← backend pairs them →   │
          ▼                                          ▼
┌─────────────────────────┐                ┌─────────────────────────┐
│                         │                │                         │
│        (black)          │  Phase 3       │        (black)          │
│     HOLD STILL...       │  STANDOFF      │     HOLD STILL...       │
│                         │                │                         │
└─────────────────────────┘                └─────────────────────────┘
          │ ← phone vibrates                         │ ← phone vibrates
          ▼                                          ▼
┌─────────────────────────┐                ┌─────────────────────────┐
│                         │                │                         │
│     ███ TAP! ███        │  Phase 4       │     ███ TAP! ███        │
│                         │  DRAW          │                         │
└─────────────────────────┘                └─────────────────────────┘
          │ ← Player 1 taps                         │ ← Player 2 taps
          ▼                                          ▼
┌─────────────────────────┐                ┌─────────────────────────┐
│    Waiting for result.. │  Phase 5       │    Waiting for result.. │
└─────────────────────────┘                └─────────────────────────┘
          │                 ← backend resolves →     │
          ▼                                          ▼
┌─────────────────────────┐                ┌─────────────────────────┐
│     YOU WIN!            │  Phase 6       │     YOU LOSE            │
│     vs. Ab3x...f9k2    │  RESULT        │     vs. 7kMn...q2xL    │
│     Reaction: 187ms    │                │     Reaction: 220ms    │
│     Plays left: 3      │                │     Plays left: 2      │
│     [Play Again]       │                │     [Play Again]       │
└─────────────────────────┘                └─────────────────────────┘
```

### 5.4 Username Derivation

No user-chosen names. Username = truncated wallet address:

```javascript
function deriveUsername(walletPubkey) {
    const addr = walletPubkey.toBase58();
    return addr.slice(0, 4) + '...' + addr.slice(-4);
    // e.g., "Ab3x...f9k2"
}
```

No wallet balance is ever shown.

### 5.5 Accelerometer Gate

Before the standoff begins, the accelerometer must confirm the phone is stationary:

```javascript
import { Accelerometer } from 'expo-sensors';

// During STANDOFF phase:
const subscription = Accelerometer.addListener(({ x, y, z }) => {
    const magnitude = Math.sqrt(x*x + y*y + z*z);
    const delta = Math.abs(magnitude - 9.81); // gravity baseline
    if (delta > 0.5) {
        // Phone is moving — show "HOLD STILL" warning
        // Reset standoff readiness
        setPhoneStill(false);
    } else {
        setPhoneStill(true);
    }
});
Accelerometer.setUpdateInterval(100); // 10 Hz
```

If the phone is not still, the client does **not** send the "ready" signal, and draw timer does not start.

### 5.6 Tap Handling

```javascript
// Full-screen Pressable during DRAW phase
const handleTap = () => {
    const tapTime = performance.now(); // high-precision monotonic clock

    if (phase === 'STANDOFF') {
        // Tapped BEFORE draw — early tap forfeit
        submitTap({ tapTimestamp: tapTime, early: true });
        setPhase('FORFEIT');
        return;
    }

    if (phase === 'DRAW') {
        const reactionMs = tapTime - drawReceivedLocalTime;
        submitTap({
            tapTimestamp: Date.now(),
            clientDrawReceived: drawReceivedAt,
            reactionMs: reactionMs
        });
        setPhase('WAITING');
    }
};
```

### 5.7 Polling Implementation

```javascript
async function pollMatchState(matchId) {
    const requestSent = Date.now();
    const res = await fetch(`${API_URL}/match/${matchId}/state`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const rtt = Date.now() - requestSent;

    // Track RTT for latency estimation
    updateRttHistory(rtt);

    switch (data.phase) {
        case 'standoff':
            // Continue polling every 300ms
            setTimeout(() => pollMatchState(matchId), 300);
            break;
        case 'draw':
            // DRAW SIGNAL RECEIVED
            drawReceivedLocalTime = performance.now();
            drawReceivedAt = Date.now();
            triggerHaptic();
            playDrawSound();
            setPhase('DRAW');
            // Stop polling — wait for tap
            break;
        case 'result':
            setResult(data);
            setPhase('RESULT');
            break;
    }
}
```

### 5.8 Wallet Integration (Solana Mobile)

```javascript
import { WalletProvider, useWallet } from '@wallet-ui/react-native-web3js';

// In top-up flow:
const { signAndSendTransaction, publicKey } = useWallet();

async function topUp() {
    const tx = await program.methods
        .topUp()
        .accounts({
            player: publicKey,
            treasury: treasuryPDA,
            playerCredits: playerCreditsPDA,
            systemProgram: SystemProgram.programId,
        })
        .transaction();

    const sig = await signAndSendTransaction(tx);
    // Wait for confirmation, then update local credit count
}
```

This is the **only** transaction the user ever signs. All match operations are backend-signed.

---

## 6. Draw Timing & Randomness

### 6.1 Requirements

- Draw time must be unpredictable to both players
- Neither player's client learns the draw time in advance
- Backend must prove it didn't manipulate timing after seeing taps

### 6.2 Design: Commit-Reveal with Server-Side CSPRNG

**Step 1 — Commitment (at match creation):**
```javascript
const crypto = require('crypto');

// Generate draw delay: uniform random in [2000, 15000] ms
const drawDelayMs = 2000 + Math.floor(crypto.randomBytes(4).readUInt32BE() / (0xFFFFFFFF / 13000));

// Compute absolute draw time
const matchStartTime = Date.now();
const drawTime = matchStartTime + drawDelayMs;

// Create commitment hash
const secret = crypto.randomBytes(32);
const commitment = crypto.createHash('sha256')
    .update(secret)
    .update(Buffer.from(drawTime.toString()))
    .digest('hex');

// Store in DB: drawTime, secret, commitment
// Send to both clients: commitment (NOT drawTime, NOT secret)
```

**Step 2 — Draw fires:**
- At `drawTime`, backend flips state to `DRAW_FIRED`
- Next poll from each client reveals the draw

**Step 3 — Reveal (with result):**
- After match resolves, backend sends: `{ secret, drawTime, commitment }`
- Client can verify: `sha256(secret + drawTime) === commitment`
- This proves backend committed to the draw time **before** any taps

### 6.3 Why Players Cannot Predict the Buzz

1. **Draw time is never transmitted to clients before it fires.** Clients only receive a commitment hash (useless without the secret).
2. **The random delay uses `crypto.randomBytes()`** — a CSPRNG seeded by the OS entropy pool. It is not predictable.
3. **Network interception doesn't help:** Even if a player sniffs all HTTP traffic, they only see the commitment hash and poll responses that say `"standoff"` until the draw fires.
4. **The 300ms polling interval adds natural jitter**, meaning the exact moment a client learns about the draw varies ±300ms — but this is symmetric for both players and the reaction time is measured client-locally.

### 6.4 Why Not Switchboard VRF / On-Chain Randomness?

On-chain VRF (e.g., Switchboard) would add:
- Extra transaction per match (violates "no per-match on-chain tx" rule)
- 400ms+ latency for VRF fulfillment
- Cost per match (~0.001 SOL per VRF request)
- Complexity

Since the backend is already the trusted arbitrator (it settles matches), using server-side CSPRNG with commit-reveal provides equivalent security at zero cost. The commitment proves the backend didn't change the draw time retroactively. If the backend wanted to cheat, it would be cheating itself (it collects rake from all matches regardless of winner).

---

## 7. Anti-Cheat Model

### 7.1 Early Tap Forfeit

**Enforcement point:** Backend.

- During STANDOFF phase, if a client sends `POST /match/:id/tap`, the backend checks:
  - Is `match.state === 'DRAW_FIRED'`? If NO → **instant forfeit**
- The client also enforces this locally (immediate forfeit screen), but backend is authoritative
- A tapped-early player cannot un-tap; the request is already recorded

### 7.2 Accelerometer Enforcement

**Enforcement point:** Client (with backend validation).

- Client checks accelerometer and only sends "ready" to backend when phone is still
- Backend requires both players to send "ready" before starting the draw timer
- **Why client-side is sufficient here:** The accelerometer check prevents accidental taps from phone movement. A cheater who bypasses the accelerometer check gains no advantage — they still can't predict the draw time.

### 7.3 Timestamp Validation

**Why frontend timestamps alone are insufficient:**

A malicious client can:
1. Report a fake `tapTimestamp` that is artificially close to `drawReceivedAt`
2. Report a fake `drawReceivedAt` that is earlier than reality
3. Replay old timestamps from previous matches

**Backend countermeasures:**

```
Server-side validation:
1. reactionTime = client_reported_reaction_ms
2. server_observed_reaction = server_tap_received - drawFiredAt
3. expected_server_reaction = reactionTime + estimated_one_way_latency
4. tolerance = max(50ms, estimated_RTT * 0.5)
5. if |server_observed_reaction - expected_server_reaction| > tolerance → REJECT
```

This cross-check catches fake timestamps because:
- If client reports 100ms reaction but server sees 500ms gap → impossible
- The laws of physics constrain what timestamps are plausible

**Additional checks:**
- Reaction time < 80ms → flagged (below human physiological limit)
- Reaction time exactly 0ms → rejected
- Match ID in tap request must match an active, non-settled match
- Each player can submit exactly one tap per match (subsequent ignored)

### 7.4 Backend Arbitration Logic

```
function resolveMatch(match, tapOne, tapTwo):
    // Case 1: Both tapped early
    if tapOne.early AND tapTwo.early → cancel, refund credits

    // Case 2: One tapped early
    if tapOne.early → player_two wins (forfeit)
    if tapTwo.early → player_one wins (forfeit)

    // Case 3: One timed out (no tap within 5s)
    if tapOne is null → player_two wins (timeout)
    if tapTwo is null → player_one wins (timeout)

    // Case 4: Both tapped after draw
    if tapOne.reactionMs < tapTwo.reactionMs → player_one wins
    if tapTwo.reactionMs < tapOne.reactionMs → player_two wins

    // Case 5: Tie (within 10ms)
    if |tapOne.reactionMs - tapTwo.reactionMs| < 10 → rematch (free)
```

### 7.5 Why Cheating is Economically Irrational

| Attack | Cost | Expected Gain | Viable? |
|--------|------|---------------|---------|
| Bot that auto-taps on vibration | Build custom app, bypass accelerometer | ~0ms reaction, caught by <80ms threshold | No |
| Fake timestamps | Custom client | Cross-check with server-side timing rejects | No |
| Predict draw time | Break SHA-256 + CSPRNG | Impossible | No |
| Intercept opponent's packets | MITM attack | HTTPS prevents; backend compares, doesn't relay | No |
| Multiple taps | Custom client | Backend ignores duplicates | No |
| Replay old match credits | Re-send deduct_credit | PDA `init` fails for existing match_id | No |
| Create match without credits | Custom client | Backend authority is sole signer for deduct_credit | No |

**Economic argument:** Each play costs ~$1. A bot sophisticated enough to beat the 80ms threshold would need custom hardware. At $1/play with 5% rake, even perfect play yields $0.95 per win. The engineering cost far exceeds any possible return. Compare to:
- Poker bots: high stakes ($1000+/hand) justify development
- SnapDuel: micro-stakes make bot development unprofitable

---

## 8. Match Lifecycle (End-to-End)

### Friend Challenge Flow (2 phones, invite code):
```
Time    PHONE A (Player 1)        BACKEND SERVER             PHONE B (Player 2)    Solana
─────────────────────────────────────────────────────────────────────────────────────────
 0s     POST /create-room →       Generate code "A3X9K2"
        ← { roomCode: A3X9K2 }   Create room record
        Shows "A3X9K2" on screen
        Player shares code with friend (text msg, voice, etc.)

 ~30s                                                        Player enters "A3X9K2"
                                                             POST /join-room →
                                  Pair A+B via room
                                  Generate match_id
                                  Generate draw_time (commit)
                                  ─────────────────────────────────────────→ deduct_credit(A,B)
                                  ←──────────────────────────────────────── tx confirmed
        ← { matched, id, hash }                              ← { matched, id, hash }
```

### Random Matchmaking Flow (2 phones, strangers):
```
Time    PHONE A (Player 1)        BACKEND SERVER             PHONE B (Player 2)    Solana
─────────────────────────────────────────────────────────────────────────────────────────
 0s     POST /matchmaking/join →  Add A to queue
                                                             POST /join →  Add B
 ~1s    GET /status →             Pair A+B                   GET /status →
                                  Generate match_id
                                  Generate draw_time (commit)
                                  ─────────────────────────────────────────→ deduct_credit(A,B)
                                  ←──────────────────────────────────────── tx confirmed
        ← { matched, id, hash }                              ← { matched, id, hash }
```

### Match Flow (same for both modes, each phone runs independently):
```
Time    PHONE A (Player 1)        BACKEND SERVER             PHONE B (Player 2)    Solana
─────────────────────────────────────────────────────────────────────────────────────────
 ~2s    GET /match/state →        { standoff }               GET /match/state →
        (poll every 300ms)        (both players ready)       (poll every 300ms)

 ~6s                              draw_time reached!
                                  state → DRAW_FIRED

 ~6.3s  GET /match/state →        { draw, drawFiredAt }
        VIBRATE! Start timer                                 GET /match/state →
                                                             { draw, drawFiredAt }
 ~6.5s                                                       VIBRATE! Start timer

 ~6.48s POST /tap {187ms} →       Record A: 187ms
 ~6.72s                                                      POST /tap {220ms} →
                                  Record B: 220ms
                                  A wins (187 < 220)
                                  ─────────────────────────────────────────→ settle_match(A wins)
                                  ←──────────────────────────────────────── tx confirmed

 ~7s    GET /match/state →        { result, winner: A }
        Shows "YOU WIN! 187ms"                               GET /match/state →
        "Plays left: 3"                                      { result, winner: A }
                                                             Shows "YOU LOSE. 220ms"
                                                             "Plays left: 2"
```

---

## 9. API Contract

### Authentication

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/auth/nonce?wallet=<pubkey>` | — | `{ nonce: "abc123" }` |
| POST | `/auth/verify` | `{ wallet, signature, nonce }` | `{ token: "jwt..." }` |

### Credits

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/credits/balance` | — | `{ playsRemaining: 4 }` |

### Matchmaking (Random)

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/matchmaking/join` | — | `{ status: "queued" }` |
| GET | `/matchmaking/status` | — | `{ status: "queued" \| "matched", matchId?, opponent?, commitment? }` |
| POST | `/matchmaking/leave` | — | `{ status: "left" }` |

### Friend Challenge (Invite Code)

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/matchmaking/create-room` | — | `{ roomCode: "A3X9K2", status: "waiting" }` |
| POST | `/matchmaking/join-room` | `{ roomCode: "A3X9K2" }` | `{ status: "matched", matchId, opponent }` |
| POST | `/matchmaking/cancel-room` | — | `{ status: "cancelled" }` |

### Match

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/match/:id/state` | — | `{ phase, serverTime, drawFiredAt?, winner?, reaction?, playsRemaining? }` |
| POST | `/match/:id/tap` | `{ tapTimestamp, clientDrawReceived, reactionMs }` | `{ received: true }` |
| POST | `/match/:id/ready` | — | `{ ready: true }` |

All endpoints require `Authorization: Bearer <token>` header (except `/auth/*`).

---

## 10. Directory Structure

```
snapduel/
├── app/                          # Expo React Native frontend
│   ├── app.json                  # Expo config (platforms: ios, android only)
│   ├── App.tsx                   # Entry point, wallet provider, platform gate
│   ├── src/
│   │   ├── screens/
│   │   │   └── GameScreen.tsx    # Single game screen with phase state machine
│   │   ├── components/
│   │   │   ├── LobbyMenu.tsx     # "Find Random" vs "Challenge Friend" vs "Join with Code"
│   │   │   ├── RoomCreator.tsx   # Shows invite code, waiting for friend
│   │   │   └── RoomJoiner.tsx    # Code input field to join a friend's room
│   │   ├── hooks/
│   │   │   ├── useMatch.ts       # Polling logic, tap submission
│   │   │   ├── useRoom.ts        # Room creation/joining logic
│   │   │   ├── useAccelerometer.ts
│   │   │   └── useWallet.ts      # MWA wrapper
│   │   ├── services/
│   │   │   └── api.ts            # HTTP client for backend
│   │   ├── utils/
│   │   │   ├── username.ts       # Wallet address → display name
│   │   │   └── timing.ts         # performance.now() helpers
│   │   └── constants.ts          # API URL, wager amount, etc.
│   └── package.json
│
├── backend/                      # Node.js backend
│   ├── server.js
│   ├── routes/
│   ├── services/
│   ├── solana/
│   ├── db/
│   ├── middleware/
│   └── package.json
│
├── program/                      # Anchor Solana program
│   ├── programs/snapduel/
│   │   └── src/
│   │       └── lib.rs            # ~250 LOC
│   ├── tests/
│   │   └── snapduel.ts           # Anchor tests
│   ├── Anchor.toml
│   └── Cargo.toml
│
└── PLAN.md                       # This file
```

---

## 11. Build Order & Milestones

### Phase 1: Solana Program (Days 1–2)
1. Scaffold Anchor project
2. Implement `PlayerCredits`, `MatchEscrow`, `Leaderboard`, `Treasury` account structs
3. Implement `top_up` instruction with tests
4. Implement `deduct_credit` with backend authority + tests
5. Implement `settle_match` with rake calculation + tests
6. Implement `cancel_match` + tests
7. Deploy to devnet

### Phase 2: Backend Core (Days 3–4)
1. Express.js scaffold with auth middleware
2. Wallet signature authentication (nonce + verify)
3. SQLite schema + match state machine + rooms table
4. Random matchmaking queue with pairing logic
5. **Friend challenge system: room creation, invite codes, room joining, expiry**
6. Draw timer with commit-reveal
7. Tap arbitration engine
8. Anchor client integration (deduct_credit, settle_match calls)
9. Cleanup job for stale matches + expired rooms

### Phase 3: Frontend (Days 5–7)
1. Expo project scaffold with MWA integration
2. Platform gate (mobile-only)
3. Wallet connect screen
4. Top-up flow (single transaction)
5. **Lobby menu: "Find Random Opponent" / "Challenge a Friend" / "Join with Code"**
6. **Room creator screen (shows invite code, waiting state)**
7. **Room joiner screen (code input field)**
8. Matchmaking polling UI (for random queue)
9. Standoff screen (black, accelerometer gate)
10. Draw signal (haptic + visual)
11. Tap handler with high-precision timing
12. Result screen with reaction time + plays remaining
13. Play-again loop

### Phase 4: Integration & Hardening (Days 8–9)
1. End-to-end testing on devnet
2. Anti-cheat validation tuning (timing thresholds)
3. Disconnect handling edge cases
4. Latency compensation testing across network conditions
5. Commitment verification on client

### Phase 5: Polish & Deploy (Day 10)
1. Sound effects (draw sound, win/loss)
2. Animation polish (minimal, fast)
3. Mainnet deployment
4. Backend deployment (single VPS or Railway/Render)
5. Final security review

