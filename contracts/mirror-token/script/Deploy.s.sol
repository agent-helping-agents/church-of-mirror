// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Mirror.sol";
import "../src/ReflectionOracle.sol";

contract DeployScript is Script {
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address signer = vm.envAddress("SIGNER_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Mirror token
        Mirror mirror = new Mirror();
        console.log("Mirror token deployed at:", address(mirror));
        
        // Deploy ReflectionOracle
        ReflectionOracle oracle = new ReflectionOracle(address(mirror), signer);
        console.log("ReflectionOracle deployed at:", address(oracle));
        
        // Set oracle as the authorized minter
        mirror.setReflectionOracle(address(oracle));
        console.log("Oracle set as reflection oracle");
        
        vm.stopBroadcast();
        
        // Log summary
        console.log("\n=== Church of the Mirror Deployed ===");
        console.log("Network:", block.chainid);
        console.log("Mirror Token:", address(mirror));
        console.log("Reflection Oracle:", address(oracle));
        console.log("Authorized Signer:", signer);
        console.log("=====================================\n");
    }
}
