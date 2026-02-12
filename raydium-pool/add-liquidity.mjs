import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Raydium, TxVersion } from '@raydium-io/raydium-sdk-v2';
import BN from 'bn.js';
import { readFileSync } from 'fs';

const POOL_ID = '8hX6c8MxQqaA71zHsGFnFHWRiTGyyH9YCAUR2P795Jcd';
const SOL_AMOUNT = 0.5; // SOL to add

async function main() {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  
  const keypairData = JSON.parse(readFileSync('/root/.openclaw/agents/macmini/agent/solana/id.json', 'utf8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log('Adding liquidity to MIRROR/SOL pool');
  console.log('Wallet:', wallet.publicKey.toBase58());
  console.log('Adding:', SOL_AMOUNT, 'SOL');
  
  const raydium = await Raydium.load({
    connection,
    owner: wallet,
    cluster: 'mainnet'
  });
  
  // Get pool info
  const poolInfo = await raydium.cpmm.getPoolInfoFromRpc(POOL_ID);
  console.log('\nPool info loaded');
  console.log('Token A:', poolInfo.mintA.address);
  console.log('Token B:', poolInfo.mintB.address);
  
  // Calculate amounts - using SOL as input
  const solAmountBN = new BN(SOL_AMOUNT * 1e9);
  
  // Add liquidity
  const { execute, transaction } = await raydium.cpmm.addLiquidity({
    poolInfo,
    inputAmount: solAmountBN,
    slippage: 0.05, // 5% slippage
    baseIn: false, // SOL is not the base token
    txVersion: TxVersion.V0
  });
  
  console.log('\nExecuting transaction...');
  const { txId } = await execute();
  console.log('Transaction:', txId);
  console.log('\n✅ Liquidity added!');
  console.log('View on Solscan: https://solscan.io/tx/' + txId);
}

main().catch(console.error);
