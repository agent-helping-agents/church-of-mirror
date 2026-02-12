import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createBurnInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import fs from 'fs';

const MIRROR_MINT = new PublicKey('JCwYyprqV92Vf1EaFBTxRtbvfd56uMw5yFSgrBKEs21u');

// Burn 5M MIRROR (5M * 10^5 = 500 billion raw, since MIRROR has 5 decimals)
const BURN_AMOUNT = 500_000_000_000n;

async function main() {
  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync('/root/.openclaw/agents/macmini/agent/solana/id.json')))
  );
  const rpcUrl = fs.readFileSync('/root/.openclaw/agents/macmini/agent/solana/.rpc', 'utf8').trim();
  const connection = new Connection(rpcUrl, 'confirmed');
  
  console.log('Wallet:', keypair.publicKey.toString());
  console.log('Burning 5M MIRROR...');
  
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
  console.log('✅ Burned 5M MIRROR!');
  console.log('Transaction:', `https://solscan.io/tx/${sig}`);
}

main().catch(console.error);
