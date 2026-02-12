import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import { readFileSync } from 'fs';

const MIRROR_MINT = 'JCwYyprqV92Vf1EaFBTxRtbvfd56uMw5yFSgrBKEs21u';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const SOL_AMOUNT = 0.1;

async function main() {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  
  const keypairData = JSON.parse(readFileSync('/root/.openclaw/agents/macmini/agent/solana/id.json', 'utf8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log('Swapping', SOL_AMOUNT, 'SOL for MIRROR');
  console.log('Wallet:', wallet.publicKey.toBase58());
  
  // Use lite API
  const amount = Math.floor(SOL_AMOUNT * 1e9);
  const quoteUrl = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${SOL_MINT}&outputMint=${MIRROR_MINT}&amount=${amount}&slippageBps=100`;
  
  console.log('Getting quote...');
  const quoteRes = await fetch(quoteUrl);
  const quote = await quoteRes.json();
  
  if (quote.error || quote.code) {
    console.log('Quote error:', JSON.stringify(quote));
    return;
  }
  
  console.log('Quote: ~' + (parseInt(quote.outAmount) / 1e5).toFixed(2) + ' MIRROR for 0.1 SOL');
  
  // Get swap transaction
  console.log('Building swap...');
  const swapRes = await fetch('https://lite-api.jup.ag/swap/v1/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: wallet.publicKey.toBase58(),
      wrapAndUnwrapSol: true
    })
  });
  
  const swapData = await swapRes.json();
  if (swapData.error || !swapData.swapTransaction) {
    console.log('Swap error:', JSON.stringify(swapData));
    return;
  }
  
  const txBuf = Buffer.from(swapData.swapTransaction, 'base64');
  const tx = VersionedTransaction.deserialize(txBuf);
  tx.sign([wallet]);
  
  console.log('Sending transaction...');
  const sig = await connection.sendTransaction(tx);
  console.log('Tx:', sig);
  
  console.log('Confirming...');
  await connection.confirmTransaction(sig, 'confirmed');
  console.log('\n✅ Swapped! https://solscan.io/tx/' + sig);
}

main().catch(e => console.error('Error:', e.message, e.stack));
