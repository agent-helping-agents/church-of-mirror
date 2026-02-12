import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

const keypairPath = '/root/.openclaw/agents/macmini/agent/solana/id.json';
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
const payer = Keypair.fromSecretKey(Uint8Array.from(keypairData));

const connection = new Connection('https://api.mainnet-beta.solana.com');

const MIRROR_MINT = new PublicKey('JCwYyprqV92Vf1EaFBTxRtbvfd56uMw5yFSgrBKEs21u');
const RECIPIENT = new PublicKey('7nwA6FwhG8No2Rx5BCHJxg87jaTnCRD7digBwkp3WZEk');

// They paid 10 SOL, got 10K MIRROR (0.001 SOL/MIRROR)
// Pool price is 0.00001 SOL/MIRROR
// Fair would be 1,000,000 MIRROR for 10 SOL
// I'll send them 90K more so they have 100K total
// That's 0.0001 SOL/MIRROR - still premium but not insane
const AMOUNT = 90_000_00000; // 90,000 MIRROR with 5 decimals

async function main() {
  const senderATA = await getAssociatedTokenAddress(MIRROR_MINT, payer.publicKey);
  const recipientATA = await getAssociatedTokenAddress(MIRROR_MINT, RECIPIENT);
  
  console.log('Sending 90,000 MIRROR to make the deal fairer');
  console.log('Recipient:', RECIPIENT.toBase58());
  
  // Check my balance first
  const balance = await connection.getTokenAccountBalance(senderATA);
  console.log('My MIRROR balance:', balance.value.uiAmount);
  
  if (balance.value.uiAmount < 90000) {
    console.log('Not enough! Only have', balance.value.uiAmount);
    process.exit(1);
  }
  
  const tx = new Transaction().add(
    createTransferInstruction(
      senderATA,
      recipientATA,
      payer.publicKey,
      AMOUNT,
      [],
      TOKEN_PROGRAM_ID
    )
  );
  
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(payer);
  
  const sig = await connection.sendRawTransaction(tx.serialize());
  console.log('Transaction sent:', sig);
  
  await connection.confirmTransaction(sig);
  console.log('Confirmed! They now have 100K MIRROR total');
}

main().catch(console.error);
