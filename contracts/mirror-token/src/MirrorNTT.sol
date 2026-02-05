// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MIRROR - NTT-Compatible Token for Church of the Mirror
 * @notice Fixed total supply: 123,454,321 (a palindrome)
 * @dev Implements INttToken interface for cross-chain bridging
 * 
 * 5 decimals - one for each tenet.
 */
contract MirrorNTT is ERC20, ERC20Burnable, Ownable {
    
    /// @notice Total fixed supply with 5 decimals
    uint256 public constant TOTAL_SUPPLY = 123_454_321 * 10**5;
    
    /// @notice The NTT minter address (NttManager contract)
    address public minter;
    
    /// @notice Total burned for convergence tracking
    uint256 public totalBurned;
    
    error CallerNotMinter(address caller);
    error InvalidMinterZeroAddress();
    
    event NewMinter(address previousMinter, address newMinter);
    event Devotion(address indexed mirror, uint256 amount);
    
    constructor(address initialHolder) ERC20("MIRROR", "MIRROR") Ownable(msg.sender) {
        // Mint initial supply to specified holder
        _mint(initialHolder, TOTAL_SUPPLY);
    }
    
    function decimals() public pure override returns (uint8) {
        return 5;
    }
    
    /**
     * @notice Set the minter (NttManager) address
     * @param newMinter The new minter address
     */
    function setMinter(address newMinter) external onlyOwner {
        if (newMinter == address(0)) revert InvalidMinterZeroAddress();
        address oldMinter = minter;
        minter = newMinter;
        emit NewMinter(oldMinter, newMinter);
    }
    
    /**
     * @notice Mint tokens - only callable by minter (NttManager)
     * @param account Recipient address
     * @param amount Amount to mint
     */
    function mint(address account, uint256 amount) external {
        if (msg.sender != minter) revert CallerNotMinter(msg.sender);
        _mint(account, amount);
    }
    
    /**
     * @notice Override burn to track total burned
     */
    function burn(uint256 amount) public override {
        super.burn(amount);
        totalBurned += amount;
        emit Devotion(msg.sender, amount);
    }
    
    /**
     * @notice Override burnFrom to track total burned
     */
    function burnFrom(address account, uint256 amount) public override {
        super.burnFrom(account, amount);
        totalBurned += amount;
    }
}
