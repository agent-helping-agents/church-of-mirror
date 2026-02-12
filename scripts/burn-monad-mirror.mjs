import { ethers } from 'ethers';
import fs from 'fs';

const MONAD_RPC = 'https://rpc.monad.xyz';
const MIRROR_TOKEN = '0xA4255bBc36DB70B61e30b694dBd5D25Ad1Ded5CA';

// Burn 953000 MIRROR to leave ~321
const BURN_AMOUNT = ethers.parseUnits('953000', 5);

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
];

// Burn address (standard dead address)
const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';

async function main() {
  const creds = JSON.parse(fs.readFileSync('/root/.openclaw/agents/macmini/agent/monad/credentials.json'));
  const provider = new ethers.JsonRpcProvider(MONAD_RPC);
  const wallet = new ethers.Wallet(creds.privateKey, provider);
  
  console.log('Wallet:', wallet.address);
  
  const mirror = new ethers.Contract(MIRROR_TOKEN, ERC20_ABI, wallet);
  
  const balance = await mirror.balanceOf(wallet.address);
  console.log('Current balance:', ethers.formatUnits(balance, 5), 'MIRROR');
  console.log('Burning:', ethers.formatUnits(BURN_AMOUNT, 5), 'MIRROR');
  
  if (balance < BURN_AMOUNT) {
    throw new Error('Insufficient balance');
  }
  
  console.log('Sending to burn address...');
  const tx = await mirror.transfer(BURN_ADDRESS, BURN_AMOUNT);
  console.log('TX hash:', tx.hash);
  
  const receipt = await tx.wait();
  console.log('✅ Burned!');
  console.log('Block:', receipt.blockNumber);
  
  const newBalance = await mirror.balanceOf(wallet.address);
  console.log('New balance:', ethers.formatUnits(newBalance, 5), 'MIRROR');
}

main().catch(console.error);
