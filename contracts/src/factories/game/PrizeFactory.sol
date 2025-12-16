// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Prize} from "../../features/game/Prize.sol";
import {OwnedFactory} from "../../base/OwnedFactory.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

/**
 * @title PrizeFactory
 * @notice Factory for deploying Prize contracts
 */
contract PrizeFactory is OwnedFactory {
    // Implementation contract for ERC-1167 clones
    address public immutable IMPLEMENTATION;
    
    // Default configuration for new deployments
    uint256 public defaultMatchesPerPool;

    event PrizeDeployed(
        address indexed instance,
        address indexed owner,
        address indexed controller,
        address matchContract,
        uint256 matchesPerPool
    );
    event DefaultMatchesPerPoolUpdated(uint256 newDefault);

    error InvalidMatchesPerPool();

    constructor() OwnedFactory(msg.sender) {
        // Deploy implementation contract for cloning
        IMPLEMENTATION = address(new Prize());
        
        // Initialize with default configuration
        defaultMatchesPerPool = 42;
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
        
        // Initialize the clone
        Prize(payable(instance)).initialize(
            instanceOwnerAddress,
            msg.sender,
            _matchContract,
            defaultMatchesPerPool
        );
        
        emit PrizeDeployed(
            instance,
            instanceOwnerAddress,
            msg.sender,
            _matchContract,
            defaultMatchesPerPool
        );
    }

    /**
     * @notice Deploy a new Prize contract with custom matches per pool
     * @param _matchContract Address of the match contract implementing IShares
     * @param _matchesPerPool Custom matches per prize pool
     * @return instance Address of the deployed contract
     */
    function deployPrizeWithConfig(
        address _matchContract,
        uint256 _matchesPerPool
    ) external returns (address instance) {
        if (_matchesPerPool == 0) revert InvalidMatchesPerPool();
        
        address instanceOwnerAddress = getInstanceOwner();
        
        // Clone the implementation contract using ERC-1167
        instance = Clones.clone(IMPLEMENTATION);
        
        // Initialize the clone
        Prize(payable(instance)).initialize(
            instanceOwnerAddress,
            msg.sender,
            _matchContract,
            _matchesPerPool
        );
        
        emit PrizeDeployed(
            instance,
            instanceOwnerAddress,
            msg.sender,
            _matchContract,
            _matchesPerPool
        );
    }
}
