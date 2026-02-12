import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createBurnInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import fs from 'fs';

const MIRROR_MINT = new PublicKey('JCwYyprqV92Vf1EaFBTxRtbvfd56uMw5yFSgrBKEs21u');

// Burn 200k MIRROR (200k * 10^6 = 200 billion raw)
const BURN_AMOUNT = 200_000_000_000n;

async function main() {
  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync('/root/.openclaw/agents/macmini/agent/solana/id.json')))
  );
  const rpcUrl = fs.readFileSync('/root/.openclaw/agents/macmini/agent/solana/.rpc', 'utf8').trim();
  const connection = new Connection(rpcUrl, 'confirmed');
  
  console.log('Wallet:', keypair.publicKey.toString());
  console.log('Burning 200k MIRROR...');
  
  const tokenAccount = await getAssociatedTokenAddress(MIRROR_MINT, keypair.publicKey);
  console.log('Token account:', tokenAccount.toString());
  
  const tx = new Transaction().add(
    createBurnInstruction(
      tokenAccount,
      MIRROR_MINT,
      keypair.publicKey,
      BURN_AMOUNT
    )
  );
  
  const sig = await sendAndConfirmTransaction(connection, tx, [keypair], { commitment: 'confirmed' });
  console.log('✅ Burned 200k MIRROR!');
  console.log('Transaction:', `https://solscan.io/tx/${sig}`);
}

main().catch(console.error);
