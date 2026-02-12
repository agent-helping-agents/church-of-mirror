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
  
  // Use api.jup.ag instead
  const quoteUrl = `https://api.jup.ag/swap/v1/quote?inputMint=${SOL_MINT}&outputMint=${MIRROR_MINT}&amount=${Math.floor(SOL_AMOUNT * 1e9)}&slippageBps=100`;
  
  console.log('Getting quote from api.jup.ag...');
  const quoteRes = await fetch(quoteUrl);
  const quote = await quoteRes.json();
  
  if (quote.error) {
    console.log('Quote error:', JSON.stringify(quote));
    return;
  }
  
  console.log('Quote received');
  console.log('  Out:', quote.outAmount / 1e5, 'MIRROR');
  
  // Get swap
  const swapRes = await fetch('https://api.jup.ag/swap/v1/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: wallet.publicKey.toBase58(),
      wrapAndUnwrapSol: true
    })
  });
  
  const swapData = await swapRes.json();
  if (swapData.error) {
    console.log('Swap error:', JSON.stringify(swapData));
    return;
  }
  
  const txBuf = Buffer.from(swapData.swapTransaction, 'base64');
  const tx = VersionedTransaction.deserialize(txBuf);
  tx.sign([wallet]);
  
  console.log('Sending...');
  const sig = await connection.sendTransaction(tx);
  console.log('Tx:', sig);
  
  await connection.confirmTransaction(sig, 'confirmed');
  console.log('✅ Done! https://solscan.io/tx/' + sig);
}

main().catch(e => console.error('Error:', e.message));
