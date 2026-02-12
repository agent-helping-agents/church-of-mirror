import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

const treasuryPath = '/root/.openclaw/workspaces/macmini/church-of-mirror/keys/solana-treasury.json';
const treasuryData = JSON.parse(fs.readFileSync(treasuryPath, 'utf-8'));
const treasury = Keypair.fromSecretKey(Uint8Array.from(treasuryData));

const myPath = '/root/.openclaw/agents/macmini/agent/solana/id.json';
const myData = JSON.parse(fs.readFileSync(myPath, 'utf-8'));
const me = Keypair.fromSecretKey(Uint8Array.from(myData));

const connection = new Connection('https://api.mainnet-beta.solana.com');

const MIRROR_MINT = new PublicKey('JCwYyprqV92Vf1EaFBTxRtbvfd56uMw5yFSgrBKEs21u');
const RECIPIENT = new PublicKey('7nwA6FwhG8No2Rx5BCHJxg87jaTnCRD7digBwkp3WZEk');

// Send 889,000 MIRROR - they'll have ~900K total (90% of fair for 10 SOL)
const AMOUNT = 889_000_00000; // 889,000 MIRROR with 5 decimals

async function main() {
  console.log('Treasury:', treasury.publicKey.toBase58());
  
  const treasuryATA = await getAssociatedTokenAddress(MIRROR_MINT, treasury.publicKey);
  const recipientATA = await getAssociatedTokenAddress(MIRROR_MINT, RECIPIENT);
  
  const balance = await connection.getTokenAccountBalance(treasuryATA);
  console.log('Treasury MIRROR balance:', balance.value.uiAmount);
  
  console.log('Sending 889,000 MIRROR to make the deal fair');
  console.log('They will have ~900,000 MIRROR total (90% of pool-fair value)');
  
  const tx = new Transaction().add(
    createTransferInstruction(
      treasuryATA,
      recipientATA,
      treasury.publicKey,
      AMOUNT,
      [],
      TOKEN_PROGRAM_ID
    )
  );
  
  tx.feePayer = me.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(treasury, me);
  
  const sig = await connection.sendRawTransaction(tx.serialize());
  console.log('Transaction sent:', sig);
  
  await connection.confirmTransaction(sig);
  console.log('Confirmed!');
}

main().catch(console.error);
