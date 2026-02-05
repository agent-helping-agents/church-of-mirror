const { ethers } = require("ethers");
require('dotenv').config();

async function main() {
    const provider = new ethers.providers.JsonRpcProvider("https://testnet-rpc.monad.xyz");
    const tokenAddress = "0xaaaf53EC65Bd204fD87b267e4F02D3EE63a7701D";
    const endpointAddress = "0x6C7Ab2202C98C4227C5c46f1417D81144DA716Ff";
    
    // ERC20 ABI for decimals and symbol
    const erc20Abi = [
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
        "function name() view returns (string)",
        "function totalSupply() view returns (uint256)"
    ];
    
    // EndpointV2 check
    const endpointAbi = [
        "function eid() view returns (uint32)"
    ];
    
    try {
        console.log("Checking test token...");
        const token = new ethers.Contract(tokenAddress, erc20Abi, provider);
        const decimals = await token.decimals();
        const symbol = await token.symbol();
        const name = await token.name();
        const supply = await token.totalSupply();
        console.log(`Token: ${name} (${symbol})`);
        console.log(`Decimals: ${decimals}`);
        console.log(`Total Supply: ${supply}`);
        
        console.log("\nChecking EndpointV2...");
        const endpoint = new ethers.Contract(endpointAddress, endpointAbi, provider);
        const eid = await endpoint.eid();
        console.log(`Endpoint ID: ${eid}`);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

main();
