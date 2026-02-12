import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import fs from 'fs';

const MIRROR_MINT = 'JCwYyprqV92Vf1EaFBTxRtbvfd56uMw5yFSgrBKEs21u';
const WSOL_MINT = 'So11111111111111111111111111111111111111112';
const CPMM_POOL_ID = '8hX6c8MxQqaA71zHsGFnFHWRiTGyyH9YCAUR2P795Jcd';

// 2 SOL in lamports
const SOL_AMOUNT = 2_000_000_000;

async function main() {
  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync('/root/.openclaw/agents/macmini/agent/solana/id.json')))
  );
  const rpcUrl = fs.readFileSync('/root/.openclaw/agents/macmini/agent/solana/.rpc', 'utf8').trim();
  const connection = new Connection(rpcUrl, 'confirmed');
  
  console.log('Wallet:', keypair.publicKey.toString());
  
  // Get priority fee
  const priorityFeeRes = await fetch('https://api-v3.raydium.io/main/auto-fee');
  const priorityFeeData = await priorityFeeRes.json();
  const priorityFee = priorityFeeData.data?.default?.h || 100000;
  console.log('Priority fee:', priorityFee);
  
  // Build add liquidity transaction via Raydium API
  const url = new URL('https://api-v3.raydium.io/cpmm/add-liquidity');
  url.searchParams.append('poolId', CPMM_POOL_ID);
  url.searchParams.append('inputAmount', SOL_AMOUNT.toString());
  url.searchParams.append('baseIn', 'true'); // SOL is base
  url.searchParams.append('slippage', '0.02'); // 2%
  url.searchParams.append('txVersion', 'V0');
  url.searchParams.append('wallet', keypair.publicKey.toString());
  url.searchParams.append('computeUnitPriceMicroLamports', priorityFee.toString());
  
  console.log('Fetching transaction from Raydium API...');
  const res = await fetch(url.toString());
  const data = await res.json();
  
  if (!data.success) {
    console.error('API error:', data);
    return;
  }
  
  console.log('Got transaction data');
  
  // Decode and sign transaction
  const txData = data.data.transaction;
  const tx = VersionedTransaction.deserialize(Buffer.from(txData, 'base64'));
  
  // Get fresh blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
  tx.message.recentBlockhash = blockhash;
  
  tx.sign([keypair]);
  
  console.log('Sending transaction...');
  const sig = await connection.sendTransaction(tx, {
    skipPreflight: true,
    maxRetries: 5,
  });
  
  console.log('Signature:', sig);
  console.log('Solscan:', `https://solscan.io/tx/${sig}`);
  
  // Wait for confirmation
  console.log('Waiting for confirmation...');
  const confirmation = await connection.confirmTransaction({
    signature: sig,
    blockhash,
    lastValidBlockHeight,
  }, 'confirmed');
  
  if (confirmation.value.err) {
    console.error('Transaction failed:', confirmation.value.err);
  } else {
    console.log('✅ Liquidity added successfully!');
  }
}

main().catch(console.error);
