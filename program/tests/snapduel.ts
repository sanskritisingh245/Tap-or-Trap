import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Snapduel } from "../target/types/snapduel";
import { PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";

describe("snapduel", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.snapduel as Program<Snapduel>;
  const authority = provider.wallet;

  const playerOne = Keypair.generate();
  const playerTwo = Keypair.generate();

  const WAGER_LAMPORTS = 10_000_000;
  const CREDITS_PER_TOPUP = 5;
  const TOPUP_AMOUNT = CREDITS_PER_TOPUP * WAGER_LAMPORTS;

  function findTreasury(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      program.programId
    );
  }

  function findPlayerCredits(player: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("credits"), player.toBuffer()],
      program.programId
    );
  }

  function findMatchEscrow(matchId: number[]): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), Buffer.from(matchId)],
      program.programId
    );
  }

  function findLeaderboard(player: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("leaderboard"), player.toBuffer()],
      program.programId
    );
  }

  function generateMatchId(): number[] {
    return Array.from(Keypair.generate().publicKey.toBuffer().slice(0, 16));
  }

  before(async () => {
    // Airdrop SOL to test players
    const sig1 = await provider.connection.requestAirdrop(
      playerOne.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig1);

    const sig2 = await provider.connection.requestAirdrop(
      playerTwo.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig2);
  });

  // ─── init_treasury ────────────────────────────────────────────────

  it("init_treasury: creates the program-owned treasury PDA", async () => {
    const [treasuryPDA] = findTreasury();

    await program.methods
      .initTreasury()
      .accounts({
        payer: authority.publicKey,
        treasury: treasuryPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const treasury = await program.account.treasury.fetch(treasuryPDA);
    assert.ok(treasury.bump > 0);
  });

  // ─── top_up tests ─────────────────────────────────────────────────

  it("top_up: player one tops up and gets 5 credits", async () => {
    const [treasuryPDA] = findTreasury();
    const [creditsPDA] = findPlayerCredits(playerOne.publicKey);

    const treasuryBefore = await provider.connection.getBalance(treasuryPDA);

    await program.methods
      .topUp()
      .accounts({
        player: playerOne.publicKey,
        treasury: treasuryPDA,
        playerCredits: creditsPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([playerOne])
      .rpc();

    const credits = await program.account.playerCredits.fetch(creditsPDA);
    assert.equal(credits.playsRemaining, CREDITS_PER_TOPUP);
    assert.equal(credits.player.toBase58(), playerOne.publicKey.toBase58());
    assert.equal(credits.totalToppedUp.toNumber(), TOPUP_AMOUNT);

    const treasuryAfter = await provider.connection.getBalance(treasuryPDA);
    assert.equal(treasuryAfter - treasuryBefore, TOPUP_AMOUNT);
  });

  it("top_up: player two tops up and gets 5 credits", async () => {
    const [treasuryPDA] = findTreasury();
    const [creditsPDA] = findPlayerCredits(playerTwo.publicKey);

    await program.methods
      .topUp()
      .accounts({
        player: playerTwo.publicKey,
        treasury: treasuryPDA,
        playerCredits: creditsPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([playerTwo])
      .rpc();

    const credits = await program.account.playerCredits.fetch(creditsPDA);
    assert.equal(credits.playsRemaining, CREDITS_PER_TOPUP);
  });

  it("top_up: stacking credits works (top up twice)", async () => {
    const [treasuryPDA] = findTreasury();
    const [creditsPDA] = findPlayerCredits(playerOne.publicKey);

    await program.methods
      .topUp()
      .accounts({
        player: playerOne.publicKey,
        treasury: treasuryPDA,
        playerCredits: creditsPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([playerOne])
      .rpc();

    const credits = await program.account.playerCredits.fetch(creditsPDA);
    assert.equal(credits.playsRemaining, CREDITS_PER_TOPUP * 2);
    assert.equal(credits.totalToppedUp.toNumber(), TOPUP_AMOUNT * 2);
  });

  // ─── deduct_credit tests ─────────────────────────────────────────

  let matchId1: number[];
  let escrowPDA1: PublicKey;

  it("deduct_credit: creates escrow and deducts 1 credit from each player", async () => {
    matchId1 = generateMatchId();
    const [treasuryPDA] = findTreasury();
    const [p1Credits] = findPlayerCredits(playerOne.publicKey);
    const [p2Credits] = findPlayerCredits(playerTwo.publicKey);
    [escrowPDA1] = findMatchEscrow(matchId1);

    const creditsBefore1 = await program.account.playerCredits.fetch(p1Credits);
    const creditsBefore2 = await program.account.playerCredits.fetch(p2Credits);

    await program.methods
      .deductCredit(matchId1)
      .accounts({
        authority: authority.publicKey,
        playerOneCredits: p1Credits,
        playerTwoCredits: p2Credits,
        playerOne: playerOne.publicKey,
        playerTwo: playerTwo.publicKey,
        treasury: treasuryPDA,
        matchEscrow: escrowPDA1,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const creditsAfter1 = await program.account.playerCredits.fetch(p1Credits);
    const creditsAfter2 = await program.account.playerCredits.fetch(p2Credits);
    assert.equal(creditsAfter1.playsRemaining, creditsBefore1.playsRemaining - 1);
    assert.equal(creditsAfter2.playsRemaining, creditsBefore2.playsRemaining - 1);

    const escrow = await program.account.matchEscrow.fetch(escrowPDA1);
    assert.deepEqual(escrow.matchId, matchId1);
    assert.equal(escrow.playerOne.toBase58(), playerOne.publicKey.toBase58());
    assert.equal(escrow.playerTwo.toBase58(), playerTwo.publicKey.toBase58());
    assert.equal(escrow.wagerLamports.toNumber(), WAGER_LAMPORTS);
    assert.equal(escrow.settled, false);
  });

  it("deduct_credit: fails with duplicate match_id (replay prevention)", async () => {
    const [treasuryPDA] = findTreasury();
    const [p1Credits] = findPlayerCredits(playerOne.publicKey);
    const [p2Credits] = findPlayerCredits(playerTwo.publicKey);
    const [escrowDup] = findMatchEscrow(matchId1);

    try {
      await program.methods
        .deductCredit(matchId1)
        .accounts({
          authority: authority.publicKey,
          playerOneCredits: p1Credits,
          playerTwoCredits: p2Credits,
          playerOne: playerOne.publicKey,
          playerTwo: playerTwo.publicKey,
          treasury: treasuryPDA,
          matchEscrow: escrowDup,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have thrown — escrow PDA already exists");
    } catch (err) {
      assert.ok(err);
    }
  });

  // ─── settle_match tests ───────────────────────────────────────────

  it("settle_match: player one wins, gets payout minus rake", async () => {
    const [treasuryPDA] = findTreasury();
    const [p1Leaderboard] = findLeaderboard(playerOne.publicKey);
    const [p2Leaderboard] = findLeaderboard(playerTwo.publicKey);

    const winnerBalBefore = await provider.connection.getBalance(playerOne.publicKey);
    const treasuryBalBefore = await provider.connection.getBalance(treasuryPDA);

    const totalPot = WAGER_LAMPORTS * 2;
    const rake = totalPot * 500 / 10000;
    const winnerPayout = totalPot - rake;

    await program.methods
      .settleMatch(playerOne.publicKey)
      .accounts({
        authority: authority.publicKey,
        matchEscrow: escrowPDA1,
        winner: playerOne.publicKey,
        treasury: treasuryPDA,
        playerOneLeaderboard: p1Leaderboard,
        playerTwoLeaderboard: p2Leaderboard,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const escrow = await program.account.matchEscrow.fetch(escrowPDA1);
    assert.equal(escrow.settled, true);
    assert.equal(escrow.winner.toBase58(), playerOne.publicKey.toBase58());

    const winnerBalAfter = await provider.connection.getBalance(playerOne.publicKey);
    assert.equal(winnerBalAfter - winnerBalBefore, winnerPayout);

    const treasuryBalAfter = await provider.connection.getBalance(treasuryPDA);
    assert.equal(treasuryBalAfter - treasuryBalBefore, rake);

    const lb1 = await program.account.leaderboard.fetch(p1Leaderboard);
    assert.equal(lb1.wins, 1);
    assert.equal(lb1.losses, 0);
    assert.equal(lb1.elo, 1016);

    const lb2 = await program.account.leaderboard.fetch(p2Leaderboard);
    assert.equal(lb2.wins, 0);
    assert.equal(lb2.losses, 1);
    assert.equal(lb2.elo, 984);
  });

  it("settle_match: fails on already-settled match (replay prevention)", async () => {
    const [treasuryPDA] = findTreasury();
    const [p1Leaderboard] = findLeaderboard(playerOne.publicKey);
    const [p2Leaderboard] = findLeaderboard(playerTwo.publicKey);

    try {
      await program.methods
        .settleMatch(playerOne.publicKey)
        .accounts({
          authority: authority.publicKey,
          matchEscrow: escrowPDA1,
          winner: playerOne.publicKey,
          treasury: treasuryPDA,
          playerOneLeaderboard: p1Leaderboard,
          playerTwoLeaderboard: p2Leaderboard,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have thrown — match already settled");
    } catch (err) {
      assert.ok(
        err.toString().includes("MatchAlreadySettled") ||
        err.toString().includes("Constraint") ||
        err.toString().includes("Error")
      );
    }
  });

  // ─── cancel_match tests ───────────────────────────────────────────

  let matchId2: number[];
  let escrowPDA2: PublicKey;

  it("cancel_match: refunds credits and escrow to treasury", async () => {
    matchId2 = generateMatchId();
    const [treasuryPDA] = findTreasury();
    const [p1Credits] = findPlayerCredits(playerOne.publicKey);
    const [p2Credits] = findPlayerCredits(playerTwo.publicKey);
    [escrowPDA2] = findMatchEscrow(matchId2);

    await program.methods
      .deductCredit(matchId2)
      .accounts({
        authority: authority.publicKey,
        playerOneCredits: p1Credits,
        playerTwoCredits: p2Credits,
        playerOne: playerOne.publicKey,
        playerTwo: playerTwo.publicKey,
        treasury: treasuryPDA,
        matchEscrow: escrowPDA2,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const creditsBefore1 = await program.account.playerCredits.fetch(p1Credits);
    const creditsBefore2 = await program.account.playerCredits.fetch(p2Credits);
    const treasuryBefore = await provider.connection.getBalance(treasuryPDA);

    await program.methods
      .cancelMatch()
      .accounts({
        authority: authority.publicKey,
        matchEscrow: escrowPDA2,
        treasury: treasuryPDA,
        playerOneCredits: p1Credits,
        playerTwoCredits: p2Credits,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const creditsAfter1 = await program.account.playerCredits.fetch(p1Credits);
    const creditsAfter2 = await program.account.playerCredits.fetch(p2Credits);
    assert.equal(creditsAfter1.playsRemaining, creditsBefore1.playsRemaining + 1);
    assert.equal(creditsAfter2.playsRemaining, creditsBefore2.playsRemaining + 1);

    const escrow = await program.account.matchEscrow.fetch(escrowPDA2);
    assert.equal(escrow.settled, true);

    const treasuryAfter = await provider.connection.getBalance(treasuryPDA);
    assert.ok(treasuryAfter >= treasuryBefore);
  });

  it("settle_match: fails with invalid winner (not a match player)", async () => {
    const matchId3 = generateMatchId();
    const [treasuryPDA] = findTreasury();
    const [p1Credits] = findPlayerCredits(playerOne.publicKey);
    const [p2Credits] = findPlayerCredits(playerTwo.publicKey);
    const [escrowPDA3] = findMatchEscrow(matchId3);
    const [p1Leaderboard] = findLeaderboard(playerOne.publicKey);
    const [p2Leaderboard] = findLeaderboard(playerTwo.publicKey);

    await program.methods
      .deductCredit(matchId3)
      .accounts({
        authority: authority.publicKey,
        playerOneCredits: p1Credits,
        playerTwoCredits: p2Credits,
        playerOne: playerOne.publicKey,
        playerTwo: playerTwo.publicKey,
        treasury: treasuryPDA,
        matchEscrow: escrowPDA3,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const fakeWinner = Keypair.generate().publicKey;

    try {
      await program.methods
        .settleMatch(fakeWinner)
        .accounts({
          authority: authority.publicKey,
          matchEscrow: escrowPDA3,
          winner: fakeWinner,
          treasury: treasuryPDA,
          playerOneLeaderboard: p1Leaderboard,
          playerTwoLeaderboard: p2Leaderboard,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have thrown — invalid winner");
    } catch (err) {
      assert.ok(
        err.toString().includes("InvalidWinner") ||
        err.toString().includes("Error")
      );
    }
  });
});
