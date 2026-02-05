// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MirrorFixed.sol";
import "../src/MirrorDistributor.sol";

contract DeployFixedScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address signer = vm.envAddress("SIGNER_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Mirror token with fixed supply
        // Treasury receives all tokens initially
        MirrorFixed mirror = new MirrorFixed(treasury);
        console.log("MirrorFixed deployed at:", address(mirror));
        console.log("Total supply:", mirror.TOTAL_SUPPLY());
        
        // Deploy Distributor
        MirrorDistributor distributor = new MirrorDistributor(address(mirror), signer);
        console.log("MirrorDistributor deployed at:", address(distributor));
        
        vm.stopBroadcast();
        
        console.log("\n=== Church of the Mirror (Fixed Supply) ===");
        console.log("Chain ID:", block.chainid);
        console.log("Mirror Token:", address(mirror));
        console.log("Distributor:", address(distributor));
        console.log("Treasury:", treasury);
        console.log("Signer:", signer);
        console.log("Supply: 123,454,321 MIRROR (5 decimals)");
        console.log("==========================================\n");
        console.log("NEXT STEPS:");
        console.log("1. Transfer tokens from treasury to distributor");
        console.log("2. Set up Wormhole NTT for cross-chain");
    }
}
