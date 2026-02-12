import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import pkg from '@raydium-io/raydium-sdk-v2';
const { Raydium } = pkg;
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import BN from 'bn.js';

const MIRROR_MINT = new PublicKey('JCwYyprqV92Vf1EaFBTxRtbvfd56uMw5yFSgrBKEs21u');
const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const CPMM_POOL = new PublicKey('8hX6c8MxQqaA71zHsGFnFHWRiTGyyH9YCAUR2P795Jcd');

// Amount of SOL to add 
const SOL_AMOUNT = 1;

async function main() {
  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync('/root/.openclaw/agents/macmini/agent/solana/id.json')))
  );
  
  console.log('Wallet:', keypair.publicKey.toString());
  
  const rpcUrl = fs.readFileSync('/root/.openclaw/agents/macmini/agent/solana/.rpc', 'utf8').trim();
  const connection = new Connection(rpcUrl, 'confirmed');
  
  // Initialize Raydium SDK
  const raydium = await Raydium.load({
    owner: keypair,
    connection,
    cluster: 'mainnet',
    disableFeatureCheck: true,
    blockhashCommitment: 'finalized',
  });
  
  console.log('Raydium SDK loaded');
  
  // Fetch pool info
  const data = await raydium.cpmm.getPoolInfoFromRpc(CPMM_POOL.toString());
  const { poolInfo, poolKeys } = data;
  console.log('Pool info fetched');
  console.log('Pool mint A:', poolInfo.mintA.address);
  console.log('Pool mint B:', poolInfo.mintB.address);
  
  // SOL is mint A in this pool, MIRROR is mint B
  // Let's add based on SOL amount
  const solAmountRaw = new BN(Math.floor(SOL_AMOUNT * 1e9).toString());
  
  // Get pool reserves to calculate ratio (these are display amounts)
  const solReserve = parseFloat(poolInfo.mintAmountA);
  const mirrorReserve = parseFloat(poolInfo.mintAmountB);
  console.log('Pool reserves A (SOL):', solReserve);
  console.log('Pool reserves B (MIRROR):', mirrorReserve);
  
  // Calculate MIRROR needed based on pool ratio
  const ratio = mirrorReserve / solReserve;
  const mirrorNeeded = SOL_AMOUNT * ratio;
  console.log('SOL to add:', SOL_AMOUNT);
  console.log('MIRROR needed:', mirrorNeeded.toFixed(2));
  
  // Add liquidity
  console.log('\nAdding liquidity...');
  const { execute } = await raydium.cpmm.addLiquidity({
    poolInfo,
    poolKeys,
    inputAmount: new BN(solAmountRaw.toString()),
    baseIn: true, // SOL is base (mint A)
    slippage: 2, // 2% slippage (as percentage, not decimal)
    txVersion: 'V0',
    computeBudgetConfig: {
      microLamports: 2000000, // Very high priority
      units: 600000,
    },
  });
  
  const { txId } = await execute({ sendAndConfirm: true });
  console.log('✅ Liquidity added!');
  console.log('Transaction:', `https://solscan.io/tx/${txId}`);
}

main().catch(console.error);
