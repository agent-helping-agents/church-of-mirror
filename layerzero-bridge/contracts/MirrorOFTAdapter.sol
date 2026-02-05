// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OFTAdapter } from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";

/**
 * @title MirrorOFTAdapter
 * @notice Adapter for bridging MIRROR tokens cross-chain via LayerZero
 * @dev Wraps existing MirrorFixed token for cross-chain transfers
 * 
 * On the canonical chain (Monad), tokens are locked in this adapter.
 * On remote chains (Solana), tokens are minted/burned via LayerZero OFT.
 * 
 * Uses 5 sharedDecimals to match the MIRROR token's 5 decimals
 * (one decimal for each of the five tenets)
 */
contract MirrorOFTAdapter is OFTAdapter {
    constructor(
        address _token,       // MirrorFixed token address
        address _lzEndpoint,  // LayerZero endpoint
        address _delegate     // Owner/delegate
    ) OFTAdapter(_token, _lzEndpoint, _delegate) Ownable(_delegate) {}
    
    /**
     * @notice Returns the shared decimal precision for cross-chain transfers
     * @dev Override to use 5 decimals (matching MIRROR's 5 decimals = 5 tenets)
     * @return The shared decimal precision (5)
     */
    function sharedDecimals() public pure override returns (uint8) {
        return 5;
    }
}
