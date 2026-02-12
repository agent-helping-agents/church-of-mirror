import { Connection, Keypair, Transaction, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, getAccount } from '@solana/spl-token';
import { readFileSync } from 'fs';

const MIRROR_MINT = new PublicKey('JCwYyprqV92Vf1EaFBTxRtbvfd56uMw5yFSgrBKEs21u');
const TREASURY = new PublicKey('EwKhLAK5V7B2XfJN6nvJf8hK4Ropw7vKGhFLL2BLYMKF');
const AMOUNT = 1_000_000 * 100000; // 1M MIRROR (5 decimals)

async function main() {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  
  // Load my keypair
  const keypairData = JSON.parse(readFileSync('/root/.openclaw/agents/macmini/agent/solana/id.json', 'utf8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log('Funding treasury with 1,000,000 MIRROR');
  console.log('From:', wallet.publicKey.toBase58());
  console.log('To:', TREASURY.toBase58());
  
  const myAta = await getAssociatedTokenAddress(MIRROR_MINT, wallet.publicKey);
  const treasuryAta = await getAssociatedTokenAddress(MIRROR_MINT, TREASURY);
  
  // Check balances
  const myBalance = await connection.getTokenAccountBalance(myAta);
  const treasuryBalance = await connection.getTokenAccountBalance(treasuryAta);
  console.log('\nBefore:');
  console.log('  My balance:', myBalance.value.uiAmountString, 'MIRROR');
  console.log('  Treasury:', treasuryBalance.value.uiAmountString, 'MIRROR');
  
  // Create transfer
  const transferIx = createTransferInstruction(
    myAta,
    treasuryAta,
    wallet.publicKey,
    BigInt(AMOUNT)
  );
  
  const tx = new Transaction().add(transferIx);
  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  
  const sig = await connection.sendTransaction(tx, [wallet]);
  console.log('\nTx:', sig);
  await connection.confirmTransaction(sig);
  
  // Check new balances
  const newTreasuryBalance = await connection.getTokenAccountBalance(treasuryAta);
  console.log('\nAfter:');
  console.log('  Treasury:', newTreasuryBalance.value.uiAmountString, 'MIRROR');
  console.log('\n✅ Treasury funded!');
}

main().catch(console.error);
