import {
  Raydium,
  TxVersion,
  CREATE_CPMM_POOL_PROGRAM,
  CREATE_CPMM_POOL_FEE_ACC,
  printSimulate,
} from '@raydium-io/raydium-sdk-v2';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import bs58 from 'bs58';
import fs from 'fs';

// Load keypair from file
const keypairPath = '/root/.openclaw/agents/macmini/agent/solana/id.json';
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
const owner = Keypair.fromSecretKey(Uint8Array.from(keypairData));

console.log('Wallet:', owner.publicKey.toBase58());

// RPC
const connection = new Connection('https://api.mainnet-beta.solana.com');

// MIRROR token on Solana
const MIRROR_MINT = 'JCwYyprqV92Vf1EaFBTxRtbvfd56uMw5yFSgrBKEs21u';
const SOL_MINT = 'So11111111111111111111111111111111111111112'; // Wrapped SOL

async function createPool() {
  console.log('Initializing Raydium SDK...');
  
  const raydium = await Raydium.load({
    owner,
    connection,
    cluster: 'mainnet',
    disableFeatureCheck: true,
    disableLoadToken: false,
    blockhashCommitment: 'finalized',
  });

  console.log('Getting token info...');
  
  // Get token info
  const mintA = await raydium.token.getTokenInfo(SOL_MINT);
  const mintB = await raydium.token.getTokenInfo(MIRROR_MINT);
  
  console.log('SOL:', mintA);
  console.log('MIRROR:', mintB);
  
  // Get fee configs
  console.log('Getting fee configs...');
  const feeConfigs = await raydium.api.getCpmmConfigs();
  console.log('Fee configs:', feeConfigs);
  
  // Use the 1% fee tier (good for volatile pairs)
  // feeConfigs are usually: 0.01% (0), 0.05% (1), 0.25% (2), 1% (3)
  const feeConfig = feeConfigs.find(f => f.tradeFeeRate === 10000) || feeConfigs[feeConfigs.length - 1];
  console.log('Using fee config:', feeConfig);
  
  // Initial liquidity:
  // 0.5 SOL = 50,000 MIRROR (price: 0.00001 SOL per MIRROR)
  // This gives ~$0.0008 per MIRROR at SOL=$80
  // FDV at 123M tokens = ~$100k
  // Starting small - can add more liquidity later
  const solAmount = new BN(500_000_000); // 0.5 SOL (in lamports)
  const mirrorAmount = new BN(50_000_00000); // 50,000 MIRROR (5 decimals)
  
  console.log(`Creating pool with:`);
  console.log(`  SOL: 0.5 SOL`);
  console.log(`  MIRROR: 50,000 MIRROR`);
  console.log(`  Initial price: 1 MIRROR = 0.00001 SOL (~$0.0008)`);
  
  const { execute, extInfo, transaction } = await raydium.cpmm.createPool({
    programId: CREATE_CPMM_POOL_PROGRAM,
    poolFeeAccount: CREATE_CPMM_POOL_FEE_ACC,
    mintA, // SOL
    mintB, // MIRROR
    mintAAmount: solAmount,
    mintBAmount: mirrorAmount,
    startTime: new BN(0), // start immediately
    feeConfig,
    associatedOnly: false,
    ownerInfo: {
      useSOLBalance: true,
    },
    txVersion: TxVersion.V0,
    computeBudgetConfig: {
      units: 600000,
      microLamports: 100000, // priority fee
    },
  });

  console.log('Pool creation transaction built');
  console.log('Pool address:', extInfo.address.poolId?.toString());
  
  // Print simulation first
  printSimulate([transaction]);
  
  // Execute
  console.log('Executing transaction...');
  const { txId } = await execute({ sendAndConfirm: true });
  
  console.log('Pool created!');
  console.log('Transaction:', txId);
  console.log('Pool keys:', Object.keys(extInfo.address).reduce(
    (acc, cur) => ({
      ...acc,
      [cur]: extInfo.address[cur]?.toString(),
    }),
    {}
  ));
  
  return { txId, poolKeys: extInfo.address };
}

createPool()
  .then(result => {
    console.log('Success!', result);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
