// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Prize} from "../../features/game/Prize.sol";
import {IPrize} from "../../interfaces/game/IPrize.sol";
import {OwnedFactory} from "../../base/OwnedFactory.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

/**
 * @title PrizeFactory
 * @notice Factory for deploying Prize contracts with multi-winner support
 */
contract PrizeFactory is OwnedFactory {
    // Implementation contract for ERC-1167 clones
    address public immutable IMPLEMENTATION;
    
    // Default configuration for new deployments
    uint256 public defaultMatchesPerPool;
    uint256 public defaultWinnersCount;
    IPrize.DistributionStrategy public defaultDistributionStrategy;

    event PrizeDeployed(
        address indexed instance,
        address indexed owner,
        address indexed controller,
        address matchContract,
        uint256 matchesPerPool,
        uint256 winnersCount,
        IPrize.DistributionStrategy strategy
    );
    event DefaultMatchesPerPoolUpdated(uint256 newDefault);
    event DefaultWinnersCountUpdated(uint256 newDefault);
    event DefaultDistributionStrategyUpdated(IPrize.DistributionStrategy newDefault);

    error InvalidMatchesPerPool();
    error InvalidWinnersCount();

    constructor() OwnedFactory(msg.sender) {
        // Deploy implementation contract for cloning
        IMPLEMENTATION = address(new Prize());
        
        // Initialize with default configuration
        defaultMatchesPerPool = 10;
        defaultWinnersCount = 10;
        defaultDistributionStrategy = IPrize.DistributionStrategy.Linear;
    }

    /**
     * @notice Update the default matches per pool for new deployments
     * @param _defaultMatchesPerPool Default matches per prize pool
     */
    function setDefaultMatchesPerPool(uint256 _defaultMatchesPerPool) external onlyOwner {
        if (_defaultMatchesPerPool == 0) revert InvalidMatchesPerPool();
        defaultMatchesPerPool = _defaultMatchesPerPool;
        emit DefaultMatchesPerPoolUpdated(_defaultMatchesPerPool);
    }

    /**
     * @notice Update the default winners count for new deployments
     * @param _defaultWinnersCount Default number of winners per pool
     */
    function setDefaultWinnersCount(uint256 _defaultWinnersCount) external onlyOwner {
        if (_defaultWinnersCount == 0 || _defaultWinnersCount > 100) revert InvalidWinnersCount();
        defaultWinnersCount = _defaultWinnersCount;
        emit DefaultWinnersCountUpdated(_defaultWinnersCount);
    }

    /**
     * @notice Update the default distribution strategy for new deployments
     * @param _defaultStrategy Default distribution strategy
     */
    function setDefaultDistributionStrategy(IPrize.DistributionStrategy _defaultStrategy) external onlyOwner {
        defaultDistributionStrategy = _defaultStrategy;
        emit DefaultDistributionStrategyUpdated(_defaultStrategy);
    }

    /**
     * @notice Deploy a new Prize contract using ERC-1167 minimal proxy
     * @param _matchContract Address of the match contract implementing IShares
     * @return instance Address of the deployed contract
     * @dev The caller (msg.sender) will be set as the controller of the deployed contract
     */
    function deployPrize(
        address _matchContract
    ) external returns (address instance) {
        address instanceOwnerAddress = getInstanceOwner();
        
        // Clone the implementation contract using ERC-1167
        instance = Clones.clone(IMPLEMENTATION);
        
        // Initialize the clone with full config
        Prize(payable(instance)).initializeWithConfig(
            instanceOwnerAddress,
            msg.sender,
            _matchContract,
            defaultMatchesPerPool,
            defaultWinnersCount,
            defaultDistributionStrategy
        );
        
        emit PrizeDeployed(
            instance,
            instanceOwnerAddress,
            msg.sender,
            _matchContract,
            defaultMatchesPerPool,
            defaultWinnersCount,
            defaultDistributionStrategy
        );
    }

    /**
     * @notice Deploy a new Prize contract with custom configuration
     * @param _matchContract Address of the match contract implementing IShares
     * @param _matchesPerPool Custom matches per prize pool
     * @param _winnersCount Number of top winners to reward
     * @param _strategy Distribution strategy for prize allocation
     * @return instance Address of the deployed contract
     */
    function deployPrizeWithConfig(
        address _matchContract,
        uint256 _matchesPerPool,
        uint256 _winnersCount,
        IPrize.DistributionStrategy _strategy
    ) external returns (address instance) {
        if (_matchesPerPool == 0) revert InvalidMatchesPerPool();
        if (_winnersCount == 0 || _winnersCount > 100) revert InvalidWinnersCount();
        
        address instanceOwnerAddress = getInstanceOwner();
        
        // Clone the implementation contract using ERC-1167
        instance = Clones.clone(IMPLEMENTATION);
        
        // Initialize the clone
        Prize(payable(instance)).initializeWithConfig(
            instanceOwnerAddress,
            msg.sender,
            _matchContract,
            _matchesPerPool,
            _winnersCount,
            _strategy
        );
        
        emit PrizeDeployed(
            instance,
            instanceOwnerAddress,
            msg.sender,
            _matchContract,
            _matchesPerPool,
            _winnersCount,
            _strategy
        );
    }
}
