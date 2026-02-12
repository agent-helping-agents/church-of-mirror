import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import fs from 'fs';

const MIRROR_MINT = 'JCwYyprqV92Vf1EaFBTxRtbvfd56uMw5yFSgrBKEs21u';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// Swap 5M MIRROR for SOL (5M * 10^6 = 5 trillion raw)
const MIRROR_AMOUNT = 5_000_000_000_000n; // 5M MIRROR in raw (6 decimals)

async function main() {
  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync('/root/.openclaw/agents/macmini/agent/solana/id.json')))
  );
  const rpcUrl = fs.readFileSync('/root/.openclaw/agents/macmini/agent/solana/.rpc', 'utf8').trim();
  const connection = new Connection(rpcUrl, 'confirmed');
  
  console.log('Wallet:', keypair.publicKey.toString());
  console.log('Swapping 5M MIRROR for SOL...');
  
  // Get quote from Jupiter lite API
  const quoteUrl = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${MIRROR_MINT}&outputMint=${SOL_MINT}&amount=${MIRROR_AMOUNT}&slippageBps=1000`;
  console.log('Getting quote...');
  const quoteRes = await fetch(quoteUrl);
  const quote = await quoteRes.json();
  
  if (quote.error) {
    console.error('Quote error:', quote);
    return;
  }
  
  const outAmount = parseInt(quote.outAmount) / 1e9;
  console.log('Will receive:', outAmount.toFixed(4), 'SOL');
  console.log('Price impact:', quote.priceImpactPct, '%');
  
  if (parseFloat(quote.priceImpactPct) > 99) {
    console.log('WARNING: Massive price impact!');
  }
  
  // Get swap transaction
  console.log('Building transaction...');
  const swapRes = await fetch('https://lite-api.jup.ag/swap/v1/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: keypair.publicKey.toString(),
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  });
  
  const swapData = await swapRes.json();
  if (swapData.error) {
    console.error('Swap error:', swapData);
    return;
  }
  
  // Sign and send
  const tx = VersionedTransaction.deserialize(Buffer.from(swapData.swapTransaction, 'base64'));
  tx.sign([keypair]);
  
  console.log('Sending transaction...');
  const sig = await connection.sendTransaction(tx, { skipPreflight: true, maxRetries: 3 });
  console.log('Signature:', sig);
  console.log('Solscan:', `https://solscan.io/tx/${sig}`);
  
  // Wait for confirmation
  console.log('Waiting for confirmation...');
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const conf = await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
  
  if (conf.value.err) {
    console.error('Transaction failed:', conf.value.err);
  } else {
    console.log('✅ Swap confirmed!');
  }
}

main().catch(console.error);
