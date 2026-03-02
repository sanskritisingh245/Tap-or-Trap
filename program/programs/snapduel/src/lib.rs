use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("HKUeBck47FAtguvzH1oceCshmMSxgXqKHTnN2RmcTNsH");

const RAKE_BPS: u64 = 500; // 5%
const CREDITS_PER_TOPUP: u8 = 5;
const WAGER_LAMPORTS: u64 = 10_000_000; // ~0.01 SOL per side
const INITIAL_ELO: u16 = 1000;

#[program]
pub mod snapduel {
    use super::*;

    /// One-time initialization of the treasury PDA (program-owned).
    pub fn init_treasury(ctx: Context<InitTreasury>) -> Result<()> {
        ctx.accounts.treasury.bump = ctx.bumps.treasury;
        Ok(())
    }

    /// Player deposits SOL into the treasury and receives 5 play credits.
    /// This is the ONLY transaction a user ever signs.
    pub fn top_up(ctx: Context<TopUp>) -> Result<()> {
        let topup_amount = (CREDITS_PER_TOPUP as u64) * WAGER_LAMPORTS;

        // Transfer SOL from player to treasury via CPI
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.player.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
        );
        system_program::transfer(cpi_ctx, topup_amount)?;

        let credits = &mut ctx.accounts.player_credits;
        credits.player = ctx.accounts.player.key();
        credits.plays_remaining = credits
            .plays_remaining
            .checked_add(CREDITS_PER_TOPUP)
            .ok_or(ErrorCode::Overflow)?;
        credits.total_topped_up = credits
            .total_topped_up
            .checked_add(topup_amount)
            .ok_or(ErrorCode::Overflow)?;
        credits.bump = ctx.bumps.player_credits;

        Ok(())
    }

    /// Backend-only: deducts 1 credit from each player and creates a match escrow.
    pub fn deduct_credit(ctx: Context<DeductCredit>, match_id: [u8; 16]) -> Result<()> {
        let p1_credits = &mut ctx.accounts.player_one_credits;
        let p2_credits = &mut ctx.accounts.player_two_credits;

        require!(p1_credits.plays_remaining >= 1, ErrorCode::InsufficientCredits);
        require!(p2_credits.plays_remaining >= 1, ErrorCode::InsufficientCredits);

        p1_credits.plays_remaining -= 1;
        p2_credits.plays_remaining -= 1;

        // Transfer wager from treasury to escrow (program owns both accounts)
        let escrow_amount = WAGER_LAMPORTS * 2;
        **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? -= escrow_amount;
        **ctx.accounts.match_escrow.to_account_info().try_borrow_mut_lamports()? += escrow_amount;

        // Initialize escrow fields
        let match_escrow = &mut ctx.accounts.match_escrow;
        match_escrow.match_id = match_id;
        match_escrow.player_one = ctx.accounts.player_one.key();
        match_escrow.player_two = ctx.accounts.player_two.key();
        match_escrow.wager_lamports = WAGER_LAMPORTS;
        match_escrow.settled = false;
        match_escrow.winner = Pubkey::default();
        match_escrow.created_at = Clock::get()?.unix_timestamp;
        match_escrow.bump = ctx.bumps.match_escrow;

        Ok(())
    }

    /// Backend-only: settles a match by paying the winner and collecting rake.
    pub fn settle_match(ctx: Context<SettleMatch>, winner: Pubkey) -> Result<()> {
        let escrow = &mut ctx.accounts.match_escrow;

        require!(!escrow.settled, ErrorCode::MatchAlreadySettled);
        require!(
            winner == escrow.player_one || winner == escrow.player_two,
            ErrorCode::InvalidWinner
        );

        let total_pot = escrow.wager_lamports * 2;
        let rake = total_pot * RAKE_BPS / 10_000;
        let winner_payout = total_pot - rake;

        // Transfer winner payout from escrow (program-owned)
        **escrow.to_account_info().try_borrow_mut_lamports()? -= winner_payout;
        **ctx.accounts.winner.to_account_info().try_borrow_mut_lamports()? += winner_payout;

        // Transfer rake from escrow to treasury (both program-owned)
        **escrow.to_account_info().try_borrow_mut_lamports()? -= rake;
        **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += rake;

        escrow.settled = true;
        escrow.winner = winner;

        // Update leaderboards
        let p1_lb = &mut ctx.accounts.player_one_leaderboard;
        let p2_lb = &mut ctx.accounts.player_two_leaderboard;

        if p1_lb.player == Pubkey::default() {
            p1_lb.player = escrow.player_one;
            p1_lb.elo = INITIAL_ELO;
            p1_lb.bump = ctx.bumps.player_one_leaderboard;
        }
        if p2_lb.player == Pubkey::default() {
            p2_lb.player = escrow.player_two;
            p2_lb.elo = INITIAL_ELO;
            p2_lb.bump = ctx.bumps.player_two_leaderboard;
        }

        if winner == escrow.player_one {
            p1_lb.wins += 1;
            p2_lb.losses += 1;
            p1_lb.elo = p1_lb.elo.saturating_add(16);
            p2_lb.elo = p2_lb.elo.saturating_sub(16);
        } else {
            p2_lb.wins += 1;
            p1_lb.losses += 1;
            p2_lb.elo = p2_lb.elo.saturating_add(16);
            p1_lb.elo = p1_lb.elo.saturating_sub(16);
        }

        Ok(())
    }

    /// Backend-only: commits a seed hash on-chain BEFORE a game round starts.
    /// This proves the outcome was determined before any bets were placed.
    pub fn commit_seed(
        ctx: Context<CommitSeed>,
        game_id: [u8; 32],
        seed_hash: [u8; 32],
        game_type: u8,
    ) -> Result<()> {
        let commitment = &mut ctx.accounts.commitment;
        commitment.game_id = game_id;
        commitment.seed_hash = seed_hash;
        commitment.game_type = game_type;
        commitment.revealed = false;
        commitment.server_seed = [0u8; 32];
        commitment.committed_at = Clock::get()?.unix_timestamp;
        commitment.revealed_at = 0;
        commitment.bump = ctx.bumps.commitment;
        Ok(())
    }

    /// Backend-only: reveals the server seed after a game round ends.
    /// Anyone can now verify: SHA-256(server_seed) == seed_hash.
    pub fn reveal_seed(
        ctx: Context<RevealSeed>,
        server_seed: [u8; 32],
    ) -> Result<()> {
        let commitment = &mut ctx.accounts.commitment;
        require!(!commitment.revealed, ErrorCode::SeedAlreadyRevealed);
        commitment.server_seed = server_seed;
        commitment.revealed = true;
        commitment.revealed_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Backend-only: cancels a match, refunds escrow to treasury, restores credits.
    pub fn cancel_match(ctx: Context<CancelMatch>) -> Result<()> {
        let escrow = &mut ctx.accounts.match_escrow;

        require!(!escrow.settled, ErrorCode::MatchAlreadySettled);

        // Return escrowed wager back to treasury
        let refund_amount = escrow.wager_lamports * 2;
        **escrow.to_account_info().try_borrow_mut_lamports()? -= refund_amount;
        **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += refund_amount;

        // Refund 1 credit to each player
        ctx.accounts.player_one_credits.plays_remaining += 1;
        ctx.accounts.player_two_credits.plays_remaining += 1;

        escrow.settled = true;

        Ok(())
    }
}

// ─── Account Structs ────────────────────────────────────────────────

/// Program-owned treasury that holds deposited SOL.
/// Seeds: [b"treasury"]
#[account]
pub struct Treasury {
    pub bump: u8, // 1
}
// Space: 8 + 1 = 9

/// Tracks a player's remaining play credits and lifetime deposits.
/// Seeds: [b"credits", player_pubkey]
#[account]
pub struct PlayerCredits {
    pub player: Pubkey,       // 32
    pub plays_remaining: u8,  // 1
    pub total_topped_up: u64, // 8
    pub bump: u8,             // 1
}
// Space: 8 + 32 + 1 + 8 + 1 = 50

/// Holds escrowed funds for an active match.
/// Seeds: [b"escrow", match_id]
#[account]
pub struct MatchEscrow {
    pub match_id: [u8; 16],    // 16
    pub player_one: Pubkey,    // 32
    pub player_two: Pubkey,    // 32
    pub wager_lamports: u64,   // 8
    pub settled: bool,         // 1
    pub winner: Pubkey,        // 32
    pub created_at: i64,       // 8
    pub bump: u8,              // 1
}
// Space: 8 + 16 + 32 + 32 + 8 + 1 + 32 + 8 + 1 = 138

/// Per-player win/loss record and ELO rating.
/// Seeds: [b"leaderboard", player_pubkey]
#[account]
pub struct Leaderboard {
    pub player: Pubkey, // 32
    pub wins: u32,      // 4
    pub losses: u32,    // 4
    pub elo: u16,       // 2
    pub bump: u8,       // 1
}
// Space: 8 + 32 + 4 + 4 + 2 + 1 = 51

/// On-chain commitment of a game's seed hash for provably fair verification.
/// Seeds: [b"commitment", game_id]
#[account]
pub struct GameCommitment {
    pub game_id: [u8; 32],      // 32
    pub seed_hash: [u8; 32],    // 32
    pub server_seed: [u8; 32],  // 32 (zeroed until revealed)
    pub game_type: u8,          // 1 (0=coinflip, 1=dice, 2=mines, 3=crash)
    pub revealed: bool,         // 1
    pub committed_at: i64,      // 8
    pub revealed_at: i64,       // 8
    pub bump: u8,               // 1
}
// Space: 8 + 32 + 32 + 32 + 1 + 1 + 8 + 8 + 1 = 123

// ─── Instruction Accounts ───────────────────────────────────────────

#[derive(Accounts)]
pub struct InitTreasury<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 9,
        seeds = [b"treasury"],
        bump
    )]
    pub treasury: Account<'info, Treasury>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TopUp<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(mut, seeds = [b"treasury"], bump = treasury.bump)]
    pub treasury: Account<'info, Treasury>,

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
#[instruction(game_id: [u8; 32])]
pub struct CommitSeed<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 123,
        seeds = [b"commitment", game_id.as_ref()],
        bump
    )]
    pub commitment: Account<'info, GameCommitment>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevealSeed<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"commitment", commitment.game_id.as_ref()],
        bump = commitment.bump,
        constraint = !commitment.revealed @ ErrorCode::SeedAlreadyRevealed
    )]
    pub commitment: Account<'info, GameCommitment>,
}

#[derive(Accounts)]
#[instruction(match_id: [u8; 16])]
pub struct DeductCredit<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"credits", player_one.key().as_ref()],
        bump = player_one_credits.bump,
        constraint = player_one_credits.plays_remaining >= 1 @ ErrorCode::InsufficientCredits
    )]
    pub player_one_credits: Account<'info, PlayerCredits>,

    #[account(
        mut,
        seeds = [b"credits", player_two.key().as_ref()],
        bump = player_two_credits.bump,
        constraint = player_two_credits.plays_remaining >= 1 @ ErrorCode::InsufficientCredits
    )]
    pub player_two_credits: Account<'info, PlayerCredits>,

    /// CHECK: Read-only, used for PDA seed derivation.
    pub player_one: UncheckedAccount<'info>,
    /// CHECK: Read-only, used for PDA seed derivation.
    pub player_two: UncheckedAccount<'info>,

    #[account(mut, seeds = [b"treasury"], bump = treasury.bump)]
    pub treasury: Account<'info, Treasury>,

    #[account(
        init,
        payer = authority,
        space = 138,
        seeds = [b"escrow", match_id.as_ref()],
        bump
    )]
    pub match_escrow: Account<'info, MatchEscrow>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleMatch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"escrow", match_escrow.match_id.as_ref()],
        bump = match_escrow.bump,
        constraint = !match_escrow.settled @ ErrorCode::MatchAlreadySettled
    )]
    pub match_escrow: Account<'info, MatchEscrow>,

    /// CHECK: Validated against escrow player fields in instruction logic.
    #[account(mut)]
    pub winner: UncheckedAccount<'info>,

    #[account(mut, seeds = [b"treasury"], bump = treasury.bump)]
    pub treasury: Account<'info, Treasury>,

    #[account(
        init_if_needed,
        payer = authority,
        space = 51,
        seeds = [b"leaderboard", match_escrow.player_one.as_ref()],
        bump
    )]
    pub player_one_leaderboard: Account<'info, Leaderboard>,

    #[account(
        init_if_needed,
        payer = authority,
        space = 51,
        seeds = [b"leaderboard", match_escrow.player_two.as_ref()],
        bump
    )]
    pub player_two_leaderboard: Account<'info, Leaderboard>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelMatch<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"escrow", match_escrow.match_id.as_ref()],
        bump = match_escrow.bump,
        constraint = !match_escrow.settled @ ErrorCode::MatchAlreadySettled
    )]
    pub match_escrow: Account<'info, MatchEscrow>,

    #[account(mut, seeds = [b"treasury"], bump = treasury.bump)]
    pub treasury: Account<'info, Treasury>,

    #[account(
        mut,
        seeds = [b"credits", match_escrow.player_one.as_ref()],
        bump = player_one_credits.bump
    )]
    pub player_one_credits: Account<'info, PlayerCredits>,

    #[account(
        mut,
        seeds = [b"credits", match_escrow.player_two.as_ref()],
        bump = player_two_credits.bump
    )]
    pub player_two_credits: Account<'info, PlayerCredits>,

    pub system_program: Program<'info, System>,
}

// ─── Errors ─────────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Player does not have enough credits.")]
    InsufficientCredits,
    #[msg("This match has already been settled.")]
    MatchAlreadySettled,
    #[msg("Winner must be one of the match players.")]
    InvalidWinner,
    #[msg("Arithmetic overflow.")]
    Overflow,
    #[msg("Seed has already been revealed.")]
    SeedAlreadyRevealed,
}
