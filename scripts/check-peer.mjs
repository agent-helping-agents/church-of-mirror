import { ethers } from 'ethers';

const MONAD_RPC = 'https://rpc.monad.xyz';
const OFT_ADAPTER = '0xd7c5b7F9B0AbdFF068a4c6F414cA7fa5C4F556BD';
const SOLANA_EID = 30168;

const OFT_ADAPTER_ABI = [
  'function peers(uint32 eid) view returns (bytes32)',
  'function endpoint() view returns (address)',
  'function owner() view returns (address)',
];

async function main() {
  const provider = new ethers.JsonRpcProvider(MONAD_RPC);
  const oftAdapter = new ethers.Contract(OFT_ADAPTER, OFT_ADAPTER_ABI, provider);
  
  console.log('=== OFT Adapter Status ===');
  
  try {
    const peer = await oftAdapter.peers(SOLANA_EID);
    console.log('Solana peer (EID 30168):', peer);
    
    if (peer === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      console.log('⚠️  NO PEER SET - Bridge not configured!');
    } else {
      console.log('✅ Peer is set');
    }
  } catch (e) {
    console.log('Error checking peer:', e.message);
  }
  
  try {
    const endpoint = await oftAdapter.endpoint();
    console.log('LayerZero Endpoint:', endpoint);
  } catch (e) {
    console.log('Error getting endpoint:', e.message);
  }
  
  try {
    const owner = await oftAdapter.owner();
    console.log('Owner:', owner);
  } catch (e) {
    console.log('Error getting owner:', e.message);
  }
}

main().catch(console.error);
