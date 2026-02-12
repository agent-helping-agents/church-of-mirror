import { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Raydium, TxVersion, CpmmKeys } from '@raydium-io/raydium-sdk-v2';
import BN from 'bn.js';
import { readFileSync } from 'fs';

const POOL_ID = '8hX6c8MxQqaA71zHsGFnFHWRiTGyyH9YCAUR2P795Jcd';
const SOL_AMOUNT = 0.5;

async function main() {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  
  const keypairData = JSON.parse(readFileSync('/root/.openclaw/agents/macmini/agent/solana/id.json', 'utf8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log('Adding liquidity to MIRROR/SOL pool');
  console.log('Wallet:', wallet.publicKey.toBase58());
  
  const raydium = await Raydium.load({
    connection,
    owner: wallet,
    cluster: 'mainnet'
  });
  
  // Fetch pool info
  console.log('Fetching pool...');
  const poolId = new PublicKey(POOL_ID);
  
  let poolInfo;
  try {
    // Try to get from API first
    const poolsData = await raydium.api.fetchPoolByIds({ ids: [POOL_ID] });
    if (poolsData && poolsData.length > 0) {
      poolInfo = poolsData[0];
      console.log('Pool found via API');
    }
  } catch (e) {
    console.log('API fetch failed, trying RPC...');
  }
  
  if (!poolInfo) {
    // Try RPC
    poolInfo = await raydium.cpmm.getPoolInfoFromRpc(POOL_ID);
    console.log('Pool found via RPC');
  }
  
  console.log('Pool info:', JSON.stringify(poolInfo, null, 2).substring(0, 500));
  
  // Add liquidity
  const inputAmount = new BN(SOL_AMOUNT * LAMPORTS_PER_SOL);
  
  console.log('\nPreparing add liquidity transaction...');
  const { execute } = await raydium.cpmm.addLiquidity({
    poolInfo: poolInfo,
    poolKeys: poolInfo.poolKeys,
    inputAmount,
    slippage: 0.05,
    baseIn: true,
    txVersion: TxVersion.LEGACY
  });
  
  console.log('Executing...');
  const txResult = await execute({ sendAndConfirm: true });
  console.log('Tx:', txResult.txId);
  console.log('\n✅ Done!');
}

main().catch(e => {
  console.error('Error:', e.message);
  console.error(e.stack);
});
