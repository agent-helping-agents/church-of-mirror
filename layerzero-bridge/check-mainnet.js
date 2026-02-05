const { ethers } = require("ethers");

async function main() {
    // Check Monad mainnet - using the standard LZ endpoint address pattern
    const provider = new ethers.providers.JsonRpcProvider("https://mainnet-rpc.monad.xyz");
    const endpointAddress = "0x6C7Ab2202C98C4227C5c46f1417D81144DA716Ff"; // Same address pattern
    
    const endpointAbi = [
        "function eid() view returns (uint32)"
    ];
    
    try {
        console.log("Checking Monad Mainnet EndpointV2...");
        const endpoint = new ethers.Contract(endpointAddress, endpointAbi, provider);
        const eid = await endpoint.eid();
        console.log(`Endpoint ID: ${eid}`);
        console.log("LayerZero IS deployed on Monad mainnet!");
    } catch (e) {
        console.error("Monad mainnet: NOT deployed or error:", e.message.substring(0, 100));
    }
    
    // Let's also check if Arbitrum Sepolia has LZ deployed (as an alternative)
    try {
        const arbProvider = new ethers.providers.JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc");
        console.log("\nChecking Arbitrum Sepolia EndpointV2...");
        const arbEndpoint = new ethers.Contract(endpointAddress, endpointAbi, arbProvider);
        const arbEid = await arbEndpoint.eid();
        console.log(`Arbitrum Sepolia Endpoint ID: ${arbEid}`);
        console.log("LayerZero IS deployed on Arbitrum Sepolia!");
    } catch (e) {
        console.error("Arbitrum Sepolia: error:", e.message.substring(0, 100));
    }
}

main();
