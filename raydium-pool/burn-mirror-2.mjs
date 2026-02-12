import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createBurnInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

const keypairPath = '/root/.openclaw/agents/macmini/agent/solana/id.json';
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
const owner = Keypair.fromSecretKey(Uint8Array.from(keypairData));

const connection = new Connection('https://api.mainnet-beta.solana.com');

const MIRROR_MINT = new PublicKey('JCwYyprqV92Vf1EaFBTxRtbvfd56uMw5yFSgrBKEs21u');

async function main() {
  const tokenAccount = await getAssociatedTokenAddress(MIRROR_MINT, owner.publicKey);
  
  // Check current balance
  const balance = await connection.getTokenAccountBalance(tokenAccount);
  console.log('Current balance:', balance.value.uiAmountString, 'MIRROR');
  
  const currentRaw = BigInt(balance.value.amount);
  const keepRaw = BigInt(12332100); // 123.321 MIRROR with 5 decimals
  const burnAmount = currentRaw - keepRaw;
  
  console.log('Keeping: 123.321 MIRROR');
  console.log('Burning:', Number(burnAmount) / 100000, 'MIRROR');
  
  if (burnAmount <= 0) {
    console.log('Nothing to burn!');
    return;
  }
  
  const tx = new Transaction().add(
    createBurnInstruction(
      tokenAccount,
      MIRROR_MINT,
      owner.publicKey,
      burnAmount,
      [],
      TOKEN_PROGRAM_ID
    )
  );
  
  tx.feePayer = owner.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(owner);
  
  console.log('Sending burn transaction...');
  const sig = await connection.sendRawTransaction(tx.serialize());
  console.log('Transaction:', sig);
  
  await connection.confirmTransaction(sig);
  console.log('Confirmed! Tokens burned.');
  
  // Verify new balance
  const newBalance = await connection.getTokenAccountBalance(tokenAccount);
  console.log('New balance:', newBalance.value.uiAmountString, 'MIRROR');
}

main().catch(console.error);
