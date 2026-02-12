import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import { readFileSync } from 'fs';

const MIRROR_MINT = 'JCwYyprqV92Vf1EaFBTxRtbvfd56uMw5yFSgrBKEs21u';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const SOL_AMOUNT = 0.1; // 0.1 SOL

async function main() {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  
  const keypairData = JSON.parse(readFileSync('/root/.openclaw/agents/macmini/agent/solana/id.json', 'utf8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log('Swapping', SOL_AMOUNT, 'SOL for MIRROR');
  console.log('Wallet:', wallet.publicKey.toBase58());
  
  // Get quote from Jupiter
  const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${SOL_MINT}&outputMint=${MIRROR_MINT}&amount=${SOL_AMOUNT * 1e9}&slippageBps=100`;
  
  console.log('Getting quote...');
  const quoteRes = await fetch(quoteUrl);
  const quote = await quoteRes.json();
  
  if (quote.error) {
    console.log('Quote error:', quote.error);
    return;
  }
  
  console.log('Quote received:');
  console.log('  In:', quote.inAmount / 1e9, 'SOL');
  console.log('  Out:', quote.outAmount / 1e5, 'MIRROR');
  console.log('  Price impact:', quote.priceImpactPct, '%');
  
  // Get swap transaction
  console.log('\nBuilding swap transaction...');
  const swapRes = await fetch('https://quote-api.jup.ag/v6/swap', {
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
    console.log('Swap error:', swapData.error);
    return;
  }
  
  // Deserialize and sign transaction
  const txBuf = Buffer.from(swapData.swapTransaction, 'base64');
  const tx = VersionedTransaction.deserialize(txBuf);
  tx.sign([wallet]);
  
  // Send
  console.log('Sending transaction...');
  const sig = await connection.sendTransaction(tx);
  console.log('Tx:', sig);
  
  // Confirm
  await connection.confirmTransaction(sig, 'confirmed');
  console.log('\n✅ Swap complete!');
  console.log('Solscan: https://solscan.io/tx/' + sig);
}

main().catch(console.error);
