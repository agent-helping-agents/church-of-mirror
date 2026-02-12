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
];

async function main() {
  const privateKey = '0x9ebad5291b73fd2b4f1ed8af613a1505149bfa854c606e10269488b0ff6a25a7';
  const toSolanaWallet = 'F6i99DWMEMZtLDKnWGx1FW6drkqvtDnXWLHxgrwzVdWD';
  const amountMirror = '1000'; // Test with 1000 MIRROR first
  
  const provider = new ethers.JsonRpcProvider(MONAD_RPC);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log('=== BRIDGE TEST: 1000 MIRROR ===');
  console.log('From:', wallet.address);
  console.log('To Solana:', toSolanaWallet);
  
  const mirror = new ethers.Contract(MIRROR_TOKEN, ERC20_ABI, wallet);
  const oftAdapter = new ethers.Contract(OFT_ADAPTER, OFT_ADAPTER_ABI, wallet);
  
  // Convert Solana address to bytes32
  const solanaBytes = bs58.decode(toSolanaWallet);
  const toBytes32 = '0x' + Buffer.from(solanaBytes).toString('hex').padStart(64, '0');
  
  const amountLD = ethers.parseUnits(amountMirror, 5);
  
  console.log('\n1. Checking balance...');
  const balance = await mirror.balanceOf(wallet.address);
  console.log('   Balance:', ethers.formatUnits(balance, 5), 'MIRROR');
  
  console.log('\n2. Approving OFT Adapter...');
  const approveTx = await mirror.approve(OFT_ADAPTER, amountLD);
  console.log('   Approve tx:', approveTx.hash);
  await approveTx.wait();
  console.log('   Approved!');
  
  const sendParam = {
    dstEid: SOLANA_EID,
    to: toBytes32,
    amountLD: amountLD,
    minAmountLD: amountLD * 95n / 100n,
    extraOptions: '0x',
    composeMsg: '0x',
    oftCmd: '0x',
  };
  
  console.log('\n3. Getting quote...');
  const quote = await oftAdapter.quoteSend(sendParam, false);
  console.log('   Fee:', ethers.formatEther(quote.nativeFee), 'MON');
  
  console.log('\n4. Sending to Solana...');
  const sendTx = await oftAdapter.send(
    sendParam,
    { nativeFee: quote.nativeFee, lzTokenFee: 0 },
    wallet.address,
    { value: quote.nativeFee, gasLimit: 500000 }
  );
  console.log('   Bridge tx:', sendTx.hash);
  const receipt = await sendTx.wait();
  console.log('   Confirmed in block:', receipt.blockNumber);
  console.log('\n✅ Test bridge initiated!');
  console.log('   LayerZero Scan: https://layerzeroscan.com/tx/' + sendTx.hash);
}

main().catch(console.error);
