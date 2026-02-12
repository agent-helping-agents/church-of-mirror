import { ethers } from 'ethers';
import bs58 from 'bs58';

const MONAD_RPC = 'https://rpc.monad.xyz';
const MIRROR_TOKEN = '0xA4255bBc36DB70B61e30b694dBd5D25Ad1Ded5CA';
const OFT_ADAPTER = '0xd7c5b7F9B0AbdFF068a4c6F414cA7fa5C4F556BD';
const SOLANA_EID = 30168;

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
];

const OFT_ADAPTER_ABI = [
  'function quoteSend((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd), bool payInLzToken) view returns ((uint256 nativeFee, uint256 lzTokenFee) msgFee)',
  'function send((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd), (uint256 nativeFee, uint256 lzTokenFee) fee, address refundAddress) payable returns ((bytes32 guid, uint64 nonce, (uint256 amountSentLD, uint256 amountReceivedLD) oftReceipt))',
  'function enforcedOptions(uint32 eid, uint16 msgType) view returns (bytes)',
];

// Encode executor options for Solana
// Format: 0x0003 (options type 3) + option data
// LZ_RECEIVE option: type 1, gas (uint128), value (uint128)
function encodeExecutorOptions(gas, value) {
  // Options type 3 = executor options
  // Option type 1 = LZ_RECEIVE
  const optionType = 1;
  
  // Encode: 0x0003 || 0x01 || length (2 bytes) || gas (16 bytes) || value (16 bytes)
  // Total option length = 1 (type) + 16 (gas) + 16 (value) = 33 bytes
  const gasHex = gas.toString(16).padStart(32, '0');
  const valueHex = value.toString(16).padStart(32, '0');
  
  // Worker ID (1) + option type (1 byte) + option data
  return '0x00030100210000000000000000000000000000030d40000000000000000000000000001f1e50';
  // This encodes: gas=200000 (0x30d40), value=2039280 (0x1f1e50)
}

async function main() {
  const privateKey = '0x9ebad5291b73fd2b4f1ed8af613a1505149bfa854c606e10269488b0ff6a25a7';
  const toSolanaWallet = 'F6i99DWMEMZtLDKnWGx1FW6drkqvtDnXWLHxgrwzVdWD';
  const amountMirror = '1000'; // Test amount
  
  const provider = new ethers.JsonRpcProvider(MONAD_RPC);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log('=== BRIDGE TEST WITH OPTIONS ===');
  console.log('From:', wallet.address);
  console.log('To Solana:', toSolanaWallet);
  
  const mirror = new ethers.Contract(MIRROR_TOKEN, ERC20_ABI, wallet);
  const oftAdapter = new ethers.Contract(OFT_ADAPTER, OFT_ADAPTER_ABI, wallet);
  
  // Check enforced options
  try {
    const enforced = await oftAdapter.enforcedOptions(SOLANA_EID, 1);
    console.log('Enforced options:', enforced);
  } catch(e) {
    console.log('Could not get enforced options:', e.message);
  }
  
  // Convert Solana address to bytes32
  const solanaBytes = bs58.decode(toSolanaWallet);
  const toBytes32 = '0x' + Buffer.from(solanaBytes).toString('hex').padStart(64, '0');
  
  const amountLD = ethers.parseUnits(amountMirror, 5);
  
  // Use encoded options for Solana
  const extraOptions = encodeExecutorOptions(200000, 2039280);
  console.log('Extra options:', extraOptions);
  
  const sendParam = {
    dstEid: SOLANA_EID,
    to: toBytes32,
    amountLD: amountLD,
    minAmountLD: amountLD * 95n / 100n,
    extraOptions: extraOptions,
    composeMsg: '0x',
    oftCmd: '0x',
  };
  
  console.log('\n1. Getting quote with options...');
  try {
    const quote = await oftAdapter.quoteSend(sendParam, false);
    console.log('   Fee:', ethers.formatEther(quote.nativeFee), 'MON');
    
    console.log('\n2. Checking allowance...');
    const allowance = await mirror.allowance(wallet.address, OFT_ADAPTER);
    if (allowance < amountLD) {
      console.log('   Need to approve...');
      const approveTx = await mirror.approve(OFT_ADAPTER, ethers.parseUnits('100000000', 5));
      await approveTx.wait();
      console.log('   Approved!');
    }
    
    console.log('\n3. Sending...');
    const sendTx = await oftAdapter.send(
      sendParam,
      { nativeFee: quote.nativeFee, lzTokenFee: 0 },
      wallet.address,
      { value: quote.nativeFee, gasLimit: 500000 }
    );
    console.log('   Tx:', sendTx.hash);
    const receipt = await sendTx.wait();
    console.log('   Status:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
    console.log('\n✅ https://layerzeroscan.com/tx/' + sendTx.hash);
  } catch (e) {
    console.log('Error:', e.message);
  }
}

main().catch(console.error);
