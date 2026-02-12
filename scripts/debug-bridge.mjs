import { ethers } from 'ethers';
import bs58 from 'bs58';

const MONAD_RPC = 'https://rpc.monad.xyz';
const MIRROR_TOKEN = '0xA4255bBc36DB70B61e30b694dBd5D25Ad1Ded5CA';
const OFT_ADAPTER = '0xd7c5b7F9B0AbdFF068a4c6F414cA7fa5C4F556BD';
const SOLANA_EID = 30168;

const OFT_ADAPTER_ABI = [
  'function quoteSend((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd), bool payInLzToken) view returns ((uint256 nativeFee, uint256 lzTokenFee) msgFee)',
  'function enforcedOptions(uint32 eid, uint16 msgType) view returns (bytes)',
  'function peers(uint32 eid) view returns (bytes32)',
  'function token() view returns (address)',
  'function approvalRequired() view returns (bool)',
];

async function main() {
  const provider = new ethers.JsonRpcProvider(MONAD_RPC);
  const oftAdapter = new ethers.Contract(OFT_ADAPTER, OFT_ADAPTER_ABI, provider);
  
  console.log('=== DEBUG OFT ADAPTER ===\n');
  
  // Check basic config
  console.log('1. Token:', await oftAdapter.token());
  console.log('2. Approval required:', await oftAdapter.approvalRequired());
  console.log('3. Solana peer:', await oftAdapter.peers(SOLANA_EID));
  console.log('4. Enforced options (msg type 1):', await oftAdapter.enforcedOptions(SOLANA_EID, 1));
  
  // Try a simple quote
  const toSolanaWallet = 'F6i99DWMEMZtLDKnWGx1FW6drkqvtDnXWLHxgrwzVdWD';
  const solanaBytes = bs58.decode(toSolanaWallet);
  const toBytes32 = '0x' + Buffer.from(solanaBytes).toString('hex').padStart(64, '0');
  
  console.log('\n5. Solana address as bytes32:', toBytes32);
  
  // Simple test with minimal params
  const sendParam = {
    dstEid: SOLANA_EID,
    to: toBytes32,
    amountLD: ethers.parseUnits('100', 5), // Just 100 MIRROR
    minAmountLD: ethers.parseUnits('95', 5),
    extraOptions: '0x', // Let enforced options apply
    composeMsg: '0x',
    oftCmd: '0x',
  };
  
  console.log('\n6. Attempting quote with empty extraOptions...');
  try {
    const quote = await oftAdapter.quoteSend(sendParam, false);
    console.log('   SUCCESS! Fee:', ethers.formatEther(quote.nativeFee), 'MON');
  } catch (e) {
    console.log('   FAILED:', e.message.slice(0, 200));
    
    // Try decoding the error
    if (e.data) {
      console.log('   Error data:', e.data);
    }
  }
}

main().catch(console.error);
