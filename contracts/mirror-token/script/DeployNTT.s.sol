// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MirrorNTT.sol";

contract DeployNTTScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address initialHolder = vm.envAddress("INITIAL_HOLDER");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Mirror NTT token
        MirrorNTT mirror = new MirrorNTT(initialHolder);
        console.log("MirrorNTT deployed at:", address(mirror));
        console.log("Total supply:", mirror.TOTAL_SUPPLY());
        console.log("Initial holder:", initialHolder);
        
        vm.stopBroadcast();
        
        console.log("\n=== Church of the Mirror - NTT Token ===");
        console.log("Token:", address(mirror));
        console.log("Supply: 123,454,321 MIRROR");
        console.log("Decimals: 5");
        console.log("======================================\n");
        console.log("NEXT: Set minter to NttManager address");
    }
}
