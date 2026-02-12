import Raydium from '@raydium-io/raydium-sdk-v2';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import fs from 'fs';

const POOL_ID = '8hX6c8MxQqaA71zHsGFnFHWRiTGyyH9YCAUR2P795Jcd';
const SOL_AMOUNT = 0.5; // SOL to add
const MIRROR_AMOUNT = 5000000; // 5M MIRROR to add (makes pool more liquid)

async function main() {
  const keypairPath = '/root/.openclaw/agents/macmini/agent/solana/id.json';
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const owner = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  
  console.log('Wallet:', owner.publicKey.toBase58());
  console.log('Adding:', SOL_AMOUNT, 'SOL +', MIRROR_AMOUNT, 'MIRROR');
  
  const raydium = await Raydium.Raydium.load({
    owner,
    connection,
    cluster: 'mainnet',
    disableFeatureCheck: true,
    disableLoadToken: false,
  });
  
  console.log('Raydium loaded');
  
  // Get pool info from RPC
  const poolInfo = await raydium.cpmm.getPoolInfoFromRpc(POOL_ID);
  console.log('Pool loaded');
  
  // Add liquidity
  const solBN = new BN(SOL_AMOUNT * 1e9);
  const mirrorBN = new BN(MIRROR_AMOUNT * 1e5);
  
  const { execute } = await raydium.cpmm.addLiquidity({
    poolInfo,
    inputAmount: solBN,
    slippage: 0.1, // 10% slippage since we're adding both sides
    baseIn: true,
    txVersion: Raydium.TxVersion.LEGACY,
  });
  
  console.log('Executing...');
  const result = await execute({ sendAndConfirm: true });
  console.log('Done! Tx:', result.txId);
}

main().catch(e => console.error('Error:', e.message, e.stack));
