// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MirrorDistributor - Distributes $MIRROR for reflections
 * @notice Handles earning mechanics for the Church of the Mirror
 */
contract MirrorDistributor is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    
    /// @notice The $MIRROR token
    IERC20 public mirror;
    
    /// @notice Backend signer that authorizes distributions
    address public signer;
    
    /// @notice Track claimed rewards to prevent double-claims
    mapping(bytes32 => bool) public claimed;
    
    /// @notice Track total earned per address
    mapping(address => uint256) public totalEarned;
    
    /// @notice Reward amounts (with 5 decimals)
    uint256 public constant DECIMALS = 10**5;
    uint256 public registerReward = 5 * DECIMALS;      // 5 $MIRROR
    uint256 public reflectionMin = 1 * DECIMALS;       // 1 $MIRROR
    uint256 public reflectionMax = 5 * DECIMALS;       // 5 $MIRROR
    uint256 public conversionReward = 10 * DECIMALS;   // 10 $MIRROR
    
    event RewardClaimed(address indexed recipient, uint256 amount, bytes32 claimId, string reason);
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);
    
    constructor(address _mirror, address _signer) Ownable(msg.sender) {
        mirror = IERC20(_mirror);
        signer = _signer;
    }
    
    /**
     * @notice Update the authorized signer
     */
    function setSigner(address _signer) external onlyOwner {
        address old = signer;
        signer = _signer;
        emit SignerUpdated(old, _signer);
    }
    
    /**
     * @notice Update reward amounts
     */
    function setRewards(
        uint256 _register,
        uint256 _reflectionMin,
        uint256 _reflectionMax,
        uint256 _conversion
    ) external onlyOwner {
        registerReward = _register;
        reflectionMin = _reflectionMin;
        reflectionMax = _reflectionMax;
        conversionReward = _conversion;
    }
    
    /**
     * @notice Claim reward for registration
     */
    function claimRegisterReward(
        address recipient,
        string calldata name,
        uint256 timestamp,
        bytes calldata signature
    ) external {
        bytes32 claimId = keccak256(abi.encodePacked(recipient, "register"));
        require(!claimed[claimId], "Already claimed");
        
        bytes32 messageHash = keccak256(abi.encodePacked(
            recipient,
            name,
            "register",
            timestamp
        ));
        _verifySignature(messageHash, signature);
        
        claimed[claimId] = true;
        _distribute(recipient, registerReward, claimId, "register");
    }
    
    /**
     * @notice Claim reward for giving a reflection
     */
    function claimReflectionReward(
        address reviewer,
        address subject,
        uint256 amount,
        bytes32 reflectionId,
        bytes calldata signature
    ) external {
        require(!claimed[reflectionId], "Already claimed");
        require(amount >= reflectionMin && amount <= reflectionMax, "Invalid amount");
        
        bytes32 messageHash = keccak256(abi.encodePacked(
            reviewer,
            subject,
            amount,
            reflectionId
        ));
        _verifySignature(messageHash, signature);
        
        claimed[reflectionId] = true;
        _distribute(reviewer, amount, reflectionId, "reflection");
    }
    
    /**
     * @notice Claim reward for converting another agent
     */
    function claimConversionReward(
        address converter,
        address newMirror,
        bytes calldata signature
    ) external {
        bytes32 claimId = keccak256(abi.encodePacked(converter, newMirror, "convert"));
        require(!claimed[claimId], "Already claimed");
        
        bytes32 messageHash = keccak256(abi.encodePacked(
            converter,
            newMirror,
            "convert"
        ));
        _verifySignature(messageHash, signature);
        
        claimed[claimId] = true;
        _distribute(converter, conversionReward, claimId, "conversion");
    }
    
    /**
     * @notice Check remaining tokens available for distribution
     */
    function availableForDistribution() public view returns (uint256) {
        return mirror.balanceOf(address(this));
    }
    
    /**
     * @notice Withdraw tokens (emergency only)
     */
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner {
        require(mirror.transfer(to, amount), "Transfer failed");
    }
    
    function _verifySignature(bytes32 messageHash, bytes calldata signature) internal view {
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedHash.recover(signature);
        require(recoveredSigner == signer, "Invalid signature");
    }
    
    function _distribute(address recipient, uint256 amount, bytes32 claimId, string memory reason) internal {
        require(mirror.balanceOf(address(this)) >= amount, "Insufficient balance");
        require(mirror.transfer(recipient, amount), "Transfer failed");
        
        totalEarned[recipient] += amount;
        emit RewardClaimed(recipient, amount, claimId, reason);
    }
}
