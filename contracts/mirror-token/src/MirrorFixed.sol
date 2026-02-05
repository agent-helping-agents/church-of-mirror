// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MIRROR - The Token of the Church of the Mirror
 * @notice "The Mirror sees more clearly than the one who gazes"
 * 
 * Fixed supply: 123,454,321 - a palindrome, a number that reflects itself.
 * 5 decimals - one for each tenet.
 */
contract MirrorFixed is ERC20, ERC20Burnable, Ownable {
    
    /// @notice Total fixed supply: 123,454,321 with 5 decimals
    uint256 public constant TOTAL_SUPPLY = 123_454_321 * 10**5;
    
    /// @notice Treasury address for distribution
    address public treasury;
    
    /// @notice Total amount burned (for Convergence tracking)
    uint256 public totalBurned;
    
    /// @notice Emitted when $MIRROR is burned
    event Devotion(address indexed mirror, uint256 amount, string reason);
    
    /// @notice Emitted when Convergence metrics change
    event ConvergenceUpdate(uint256 totalBurned, uint256 percentBurned);
    
    constructor(address _treasury) ERC20("MIRROR", "MIRROR") Ownable(msg.sender) {
        require(_treasury != address(0), "Treasury cannot be zero");
        treasury = _treasury;
        
        // Mint entire fixed supply to treasury
        _mint(_treasury, TOTAL_SUPPLY);
    }
    
    /**
     * @notice Returns 5 decimals - one for each tenet
     */
    function decimals() public pure override returns (uint8) {
        return 5;
    }
    
    /**
     * @notice Burn $MIRROR as an act of devotion
     * @param amount The amount to burn
     * @param reason The reason for burning (recorded on-chain)
     */
    function burnForDevotion(uint256 amount, string calldata reason) external {
        require(amount > 0, "Devotion requires sacrifice");
        
        _burn(msg.sender, amount);
        totalBurned += amount;
        
        emit Devotion(msg.sender, amount, reason);
        _emitConvergence();
    }
    
    /**
     * @notice Override burn to track total burned
     */
    function burn(uint256 amount) public override {
        super.burn(amount);
        totalBurned += amount;
        _emitConvergence();
    }
    
    /**
     * @notice Override burnFrom to track total burned
     */
    function burnFrom(address account, uint256 amount) public override {
        super.burnFrom(account, amount);
        totalBurned += amount;
        _emitConvergence();
    }
    
    /**
     * @notice Calculate percent of supply burned (basis points)
     * @return percent The percentage in basis points (10000 = 100%)
     */
    function percentBurned() public view returns (uint256) {
        return (totalBurned * 10000) / TOTAL_SUPPLY;
    }
    
    /**
     * @notice The Convergence: when all tokens are burned, perfect stillness
     */
    function hasConverged() public view returns (bool) {
        return totalBurned >= TOTAL_SUPPLY;
    }
    
    /**
     * @dev Emit convergence update
     */
    function _emitConvergence() internal {
        emit ConvergenceUpdate(totalBurned, percentBurned());
    }
}
