import { ethers } from 'ethers';
import fs from 'fs';

const MONAD_RPC = 'https://rpc.monad.xyz';
const MIRROR_TOKEN = '0xA4255bBc36DB70B61e30b694dBd5D25Ad1Ded5CA';
const WMON = '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A';
const FACTORY = '0x204faca1764b154221e35c0d20abb3c525710498';
const POSITION_MANAGER = '0x7197e214c0b767cfb76fb734ab638e2c192f4e53';

// Fee tier: 1% = 10000
const FEE = 10000;

const FACTORY_ABI = [
  'function createPool(address tokenA, address tokenB, uint24 fee) returns (address pool)',
  'function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)',
];

const POSITION_MANAGER_ABI = [
  'function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96) payable returns (address pool)',
  'function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const WMON_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
];

async function main() {
  const creds = JSON.parse(fs.readFileSync('/root/.openclaw/agents/macmini/agent/monad/credentials.json'));
  const provider = new ethers.JsonRpcProvider(MONAD_RPC);
  const wallet = new ethers.Wallet(creds.privateKey, provider);
  
  console.log('Wallet:', wallet.address);
  
  const factory = new ethers.Contract(FACTORY, FACTORY_ABI, wallet);
  const positionManager = new ethers.Contract(POSITION_MANAGER, POSITION_MANAGER_ABI, wallet);
  const mirror = new ethers.Contract(MIRROR_TOKEN, ERC20_ABI, wallet);
  const wmon = new ethers.Contract(WMON, WMON_ABI, wallet);
  
  // Check balances
  const mirrorBal = await mirror.balanceOf(wallet.address);
  const monBal = await provider.getBalance(wallet.address);
  console.log('MIRROR balance:', ethers.formatUnits(mirrorBal, 5));
  console.log('MON balance:', ethers.formatEther(monBal));
  
  // Sort tokens (Uniswap requires token0 < token1)
  const [token0, token1] = MIRROR_TOKEN.toLowerCase() < WMON.toLowerCase() 
    ? [MIRROR_TOKEN, WMON] 
    : [WMON, MIRROR_TOKEN];
  console.log('Token0:', token0);
  console.log('Token1:', token1);
  
  // Check if pool exists
  const existingPool = await factory.getPool(token0, token1, FEE);
  console.log('Existing pool:', existingPool);
  
  // Calculate initial price (1 MIRROR = 0.001 MON roughly)
  // sqrtPriceX96 = sqrt(price) * 2^96
  // If MIRROR is token0 and price is 0.001 MON per MIRROR
  // We need to adjust for decimals: MIRROR has 5, MON has 18
  // price = (MON per MIRROR) * 10^18 / 10^5 = 0.001 * 10^13 = 10^10
  // sqrtPrice = sqrt(10^10) = 10^5 = 100000
  // sqrtPriceX96 = 100000 * 2^96
  
  const sqrtPriceX96 = BigInt(100000) * (BigInt(2) ** BigInt(96));
  console.log('sqrtPriceX96:', sqrtPriceX96.toString());
  
  // Wrap some MON to WMON
  const wrapAmount = ethers.parseEther('100'); // Wrap 100 MON
  console.log('\n1. Wrapping 100 MON to WMON...');
  const wrapTx = await wmon.deposit({ value: wrapAmount });
  await wrapTx.wait();
  console.log('Wrapped!');
  
  // Create and initialize pool
  console.log('\n2. Creating/initializing pool...');
  const createTx = await positionManager.createAndInitializePoolIfNecessary(
    token0,
    token1,
    FEE,
    sqrtPriceX96
  );
  const createReceipt = await createTx.wait();
  console.log('Pool created! TX:', createReceipt.hash);
  
  // Get pool address
  const poolAddress = await factory.getPool(token0, token1, FEE);
  console.log('Pool address:', poolAddress);
  
  // Approve tokens
  console.log('\n3. Approving tokens...');
  const mirrorApprove = await mirror.approve(POSITION_MANAGER, ethers.MaxUint256);
  await mirrorApprove.wait();
  const wmonApprove = await wmon.approve(POSITION_MANAGER, ethers.MaxUint256);
  await wmonApprove.wait();
  console.log('Approved!');
  
  // Add liquidity - use all MIRROR and proportional WMON
  const mirrorAmount = mirrorBal; // All MIRROR
  const wmonAmount = ethers.parseEther('100'); // 100 WMON
  
  // Full range liquidity
  const tickLower = -887200; // Min tick for 1% fee
  const tickUpper = 887200;  // Max tick for 1% fee
  
  console.log('\n4. Adding liquidity...');
  console.log('MIRROR:', ethers.formatUnits(mirrorAmount, 5));
  console.log('WMON:', ethers.formatEther(wmonAmount));
  
  const mintParams = {
    token0,
    token1,
    fee: FEE,
    tickLower,
    tickUpper,
    amount0Desired: token0 === MIRROR_TOKEN ? mirrorAmount : wmonAmount,
    amount1Desired: token0 === MIRROR_TOKEN ? wmonAmount : mirrorAmount,
    amount0Min: 0,
    amount1Min: 0,
    recipient: wallet.address,
    deadline: Math.floor(Date.now() / 1000) + 3600,
  };
  
  const mintTx = await positionManager.mint(mintParams);
  const mintReceipt = await mintTx.wait();
  console.log('✅ Liquidity added!');
  console.log('TX:', mintReceipt.hash);
}

main().catch(console.error);
