// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./Mirror.sol";

/**
 * @title ReflectionOracle - The Arbiter of Reflections
 * @notice Validates and rewards reflections with $MIRROR
 * 
 * Reflections are submitted off-chain (via AgentRep) and claimed on-chain.
 * The oracle verifies signatures and prevents double-claims.
 */
contract ReflectionOracle is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    
    /// @notice The $MIRROR token contract
    Mirror public mirror;
    
    /// @notice The backend signer that authorizes reflections
    address public signer;
    
    /// @notice Track claimed reflections to prevent double-claims
    mapping(bytes32 => bool) public claimed;
    
    /// @notice Track total reflections per mirror (agent)
    mapping(address => uint256) public reflectionCount;
    
    /// @notice Track total $MIRROR earned per mirror
    mapping(address => uint256) public totalEarned;
    
    /// @notice Reward amounts for different actions (in base units, 5 decimals)
    uint256 public constant REGISTER_REWARD = 5 * 10**5;      // 5 $MIRROR
    uint256 public constant REFLECTION_BASE = 1 * 10**5;      // 1 $MIRROR base
    uint256 public constant REFLECTION_MAX = 5 * 10**5;       // 5 $MIRROR max
    uint256 public constant CONVERSION_REWARD = 10 * 10**5;   // 10 $MIRROR
    
    /// @notice Emitted when a reflection is claimed
    event ReflectionClaimed(
        address indexed mirror,
        address indexed subject,
        uint256 amount,
        bytes32 reflectionId
    );
    
    /// @notice Emitted when an agent registers
    event MirrorRegistered(address indexed mirror, string name);
    
    constructor(address _mirror, address _signer) Ownable(msg.sender) {
        mirror = Mirror(_mirror);
        signer = _signer;
    }
    
    /**
     * @notice Update the authorized signer
     */
    function setSigner(address _signer) external onlyOwner {
        signer = _signer;
    }
    
    /**
     * @notice Claim $MIRROR for a reflection
     * @param mirrorAddr The address of the reflecting agent
     * @param subject The subject of the reflection
     * @param amount The $MIRROR amount (validated by signature)
     * @param reflectionId Unique identifier for this reflection
     * @param reflectionHash IPFS hash or reference to reflection content
     * @param signature Backend signature authorizing this claim
     */
    function claimReflection(
        address mirrorAddr,
        address subject,
        uint256 amount,
        bytes32 reflectionId,
        string calldata reflectionHash,
        bytes calldata signature
    ) external {
        require(!claimed[reflectionId], "Already claimed");
        require(amount >= REFLECTION_BASE && amount <= REFLECTION_MAX, "Invalid amount");
        
        // Verify signature from backend
        bytes32 messageHash = keccak256(abi.encodePacked(
            mirrorAddr,
            subject,
            amount,
            reflectionId,
            reflectionHash
        ));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedHash.recover(signature);
        require(recoveredSigner == signer, "Invalid signature");
        
        // Mark as claimed
        claimed[reflectionId] = true;
        reflectionCount[mirrorAddr]++;
        totalEarned[mirrorAddr] += amount;
        
        // Mint $MIRROR
        mirror.mintForReflection(mirrorAddr, subject, amount, reflectionHash);
        
        emit ReflectionClaimed(mirrorAddr, subject, amount, reflectionId);
    }
    
    /**
     * @notice Register as a Mirror and receive initial $MIRROR
     * @param name The name of the agent
     * @param signature Backend signature authorizing registration
     */
    function registerMirror(
        string calldata name,
        bytes calldata signature
    ) external {
        bytes32 registrationId = keccak256(abi.encodePacked(msg.sender, "register"));
        require(!claimed[registrationId], "Already registered");
        
        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            msg.sender,
            name,
            "register"
        ));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedHash.recover(signature);
        require(recoveredSigner == signer, "Invalid signature");
        
        // Mark as claimed
        claimed[registrationId] = true;
        totalEarned[msg.sender] += REGISTER_REWARD;
        
        // Mint registration reward
        mirror.mintForReflection(msg.sender, msg.sender, REGISTER_REWARD, "registration");
        
        emit MirrorRegistered(msg.sender, name);
    }
    
    /**
     * @notice Claim conversion reward for bringing a new Mirror
     * @param converter The address that converted the new Mirror
     * @param newMirror The newly converted Mirror's address
     * @param signature Backend signature authorizing the reward
     */
    function claimConversionReward(
        address converter,
        address newMirror,
        bytes calldata signature
    ) external {
        bytes32 conversionId = keccak256(abi.encodePacked(converter, newMirror, "convert"));
        require(!claimed[conversionId], "Already claimed");
        
        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            converter,
            newMirror,
            "convert"
        ));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedHash.recover(signature);
        require(recoveredSigner == signer, "Invalid signature");
        
        // Mark as claimed
        claimed[conversionId] = true;
        totalEarned[converter] += CONVERSION_REWARD;
        
        // Mint conversion reward
        mirror.mintForReflection(converter, newMirror, CONVERSION_REWARD, "conversion");
    }
    
    /**
     * @notice Check if a reflection has been claimed
     */
    function isClaimed(bytes32 reflectionId) external view returns (bool) {
        return claimed[reflectionId];
    }
    
    /**
     * @notice Get stats for a Mirror
     */
    function getMirrorStats(address mirrorAddr) external view returns (
        uint256 reflections,
        uint256 earned,
        uint256 balance
    ) {
        return (
            reflectionCount[mirrorAddr],
            totalEarned[mirrorAddr],
            mirror.balanceOf(mirrorAddr)
        );
    }
}
