import { Raydium } from '@raydium-io/raydium-sdk-v2';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import fs from 'fs';

const keypairPath = '/root/.openclaw/agents/macmini/agent/solana/id.json';
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
const owner = Keypair.fromSecretKey(Uint8Array.from(keypairData));

const connection = new Connection('https://api.mainnet-beta.solana.com');

const POOL_ID = '8hX6c8MxQqaA71zHsGFnFHWRiTGyyH9YCAUR2P795Jcd';

async function main() {
  console.log('Checking creator fees for pool:', POOL_ID);
  
  const raydium = await Raydium.load({
    owner,
    connection,
    cluster: 'mainnet',
    disableFeatureCheck: true,
    disableLoadToken: true,
  });
  
  // Get pool info
  const poolInfo = await raydium.cpmm.getPoolInfoFromRpc(POOL_ID);
  console.log('Pool creator:', poolInfo.creator?.toBase58());
  console.log('My wallet:', owner.publicKey.toBase58());
  
  // Check if we're the creator
  if (poolInfo.creator?.toBase58() === owner.publicKey.toBase58()) {
    console.log('We ARE the pool creator!');
    // Try to get claimable fees
    console.log('Creator fee rate:', poolInfo.poolInfo?.creatorFeeRate || 'unknown');
  } else {
    console.log('We are NOT the pool creator');
  }
}

main().catch(console.error);
