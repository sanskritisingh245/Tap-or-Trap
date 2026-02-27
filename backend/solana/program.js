const { Connection, PublicKey, SystemProgram } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');
const { loadBackendKeypair } = require('./keypair');
const fs = require('fs');
const path = require('path');

// Load IDL
const idlPath = path.join(__dirname, '..', '..', 'program', 'target', 'idl', 'snapduel.json');
let idl;
try {
  idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
} catch (err) {
  console.warn('IDL not found. On-chain operations will be stubbed.');
  idl = null;
}

const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID || 'HKUeBck47FAtguvzH1oceCshmMSxgXqKHTnN2RmcTNsH');
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

let connection;
let program;
let backendKeypair;

function getProgram() {
  if (!program) {
    connection = new Connection(RPC_URL, 'confirmed');
    backendKeypair = loadBackendKeypair();

    const wallet = new anchor.Wallet(backendKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });

    if (idl) {
      program = new anchor.Program(idl, provider);
    }
  }
  return { program, connection, backendKeypair };
}

// PDA derivation helpers
function findTreasury() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('treasury')],
    PROGRAM_ID
  );
}

function findPlayerCredits(playerPubkey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('credits'), new PublicKey(playerPubkey).toBuffer()],
    PROGRAM_ID
  );
}

function findMatchEscrow(matchId) {
  // Convert UUID string to 16-byte array
  const matchIdBytes = uuidToBytes(matchId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), Buffer.from(matchIdBytes)],
    PROGRAM_ID
  );
}

function findLeaderboard(playerPubkey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('leaderboard'), new PublicKey(playerPubkey).toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Converts a UUID string to a 16-byte array.
 */
function uuidToBytes(uuid) {
  const hex = uuid.replace(/-/g, '');
  const bytes = [];
  for (let i = 0; i < 32; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return bytes;
}

/**
 * Gets a player's remaining credits from on-chain state.
 */
async function getPlayerCredits(walletPubkey) {
  const { program } = getProgram();
  if (!program) return 0;

  const [creditsPDA] = findPlayerCredits(walletPubkey);
  try {
    const credits = await program.account.playerCredits.fetch(creditsPDA);
    return credits.playsRemaining;
  } catch {
    return 0;
  }
}

/**
 * Deducts 1 credit from each player and creates match escrow on-chain.
 */
async function deductCredits(playerOneWallet, playerTwoWallet, matchId) {
  const { program, backendKeypair } = getProgram();
  if (!program) {
    console.warn('Program not loaded — skipping on-chain deduct_credit');
    return 'stub-tx-sig';
  }

  const matchIdBytes = uuidToBytes(matchId);
  const [treasuryPDA] = findTreasury();
  const [p1Credits] = findPlayerCredits(playerOneWallet);
  const [p2Credits] = findPlayerCredits(playerTwoWallet);
  const [escrowPDA] = findMatchEscrow(matchId);

  const tx = await program.methods
    .deductCredit(matchIdBytes)
    .accounts({
      authority: backendKeypair.publicKey,
      playerOneCredits: p1Credits,
      playerTwoCredits: p2Credits,
      playerOne: new PublicKey(playerOneWallet),
      playerTwo: new PublicKey(playerTwoWallet),
      treasury: treasuryPDA,
      matchEscrow: escrowPDA,
      systemProgram: SystemProgram.programId,
    })
    .signers([backendKeypair])
    .rpc();

  return tx;
}

/**
 * Settles a match on-chain — pays winner, collects rake.
 */
async function settleMatchOnChain(playerOneWallet, playerTwoWallet, matchId, winnerWallet) {
  const { program, backendKeypair } = getProgram();
  if (!program) {
    console.warn('Program not loaded — skipping on-chain settle_match');
    return 'stub-tx-sig';
  }

  const [treasuryPDA] = findTreasury();
  const [escrowPDA] = findMatchEscrow(matchId);
  const [p1Leaderboard] = findLeaderboard(playerOneWallet);
  const [p2Leaderboard] = findLeaderboard(playerTwoWallet);

  const tx = await program.methods
    .settleMatch(new PublicKey(winnerWallet))
    .accounts({
      authority: backendKeypair.publicKey,
      matchEscrow: escrowPDA,
      winner: new PublicKey(winnerWallet),
      treasury: treasuryPDA,
      playerOneLeaderboard: p1Leaderboard,
      playerTwoLeaderboard: p2Leaderboard,
      systemProgram: SystemProgram.programId,
    })
    .signers([backendKeypair])
    .rpc();

  return tx;
}

/**
 * Cancels a match on-chain — refunds escrow, restores credits.
 */
async function cancelMatchOnChain(playerOneWallet, playerTwoWallet, matchId) {
  const { program, backendKeypair } = getProgram();
  if (!program) {
    console.warn('Program not loaded — skipping on-chain cancel_match');
    return 'stub-tx-sig';
  }

  const [treasuryPDA] = findTreasury();
  const [escrowPDA] = findMatchEscrow(matchId);
  const [p1Credits] = findPlayerCredits(playerOneWallet);
  const [p2Credits] = findPlayerCredits(playerTwoWallet);

  const tx = await program.methods
    .cancelMatch()
    .accounts({
      authority: backendKeypair.publicKey,
      matchEscrow: escrowPDA,
      treasury: treasuryPDA,
      playerOneCredits: p1Credits,
      playerTwoCredits: p2Credits,
      systemProgram: SystemProgram.programId,
    })
    .signers([backendKeypair])
    .rpc();

  return tx;
}

module.exports = {
  getProgram,
  getPlayerCredits,
  deductCredits,
  settleMatchOnChain,
  cancelMatchOnChain,
  findTreasury,
  findPlayerCredits,
  findMatchEscrow,
  findLeaderboard,
  uuidToBytes,
  PROGRAM_ID,
};
