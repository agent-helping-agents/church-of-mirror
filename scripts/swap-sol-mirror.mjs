import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import fs from 'fs';

const MIRROR_MINT = 'JCwYyprqV92Vf1EaFBTxRtbvfd56uMw5yFSgrBKEs21u';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// Swap 4 SOL for MIRROR
const SOL_AMOUNT = 4_000_000_000n; // 4 SOL in lamports

async function main() {
  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync('/root/.openclaw/agents/macmini/agent/solana/id.json')))
  );
  const rpcUrl = fs.readFileSync('/root/.openclaw/agents/macmini/agent/solana/.rpc', 'utf8').trim();
  const connection = new Connection(rpcUrl, 'confirmed');
  
  console.log('Wallet:', keypair.publicKey.toString());
  console.log('Swapping 25 SOL for MIRROR...');
  
  // Get quote from Jupiter lite API
  const quoteUrl = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${SOL_MINT}&outputMint=${MIRROR_MINT}&amount=${SOL_AMOUNT}&slippageBps=2000`;
  console.log('Getting quote...');
  const quoteRes = await fetch(quoteUrl);
  const quote = await quoteRes.json();
  
  if (quote.error) {
    console.error('Quote error:', quote);
    return;
  }
  
  const outAmount = parseInt(quote.outAmount) / 1e6;
  console.log('Will receive:', outAmount.toLocaleString(), 'MIRROR');
  console.log('Price impact:', quote.priceImpactPct, '%');
  
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
