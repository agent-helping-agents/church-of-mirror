// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MirrorTestToken
 * @notice Test token for cross-chain bridge testing
 * @dev Matches MirrorFixed specs: 123,454,321 supply, 5 decimals
 */
contract MirrorTestToken is ERC20, Ownable {
    uint256 public constant TOTAL_SUPPLY = 123_454_321 * 10**5;
    
    constructor(address _treasury) ERC20("MIRROR", "MIRROR") Ownable(msg.sender) {
        _mint(_treasury, TOTAL_SUPPLY);
    }
    
    function decimals() public pure override returns (uint8) {
        return 5;
    }
}
