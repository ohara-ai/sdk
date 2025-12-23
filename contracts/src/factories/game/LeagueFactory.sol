// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {League} from "../../features/game/League.sol";
import {OwnedFactory} from "../../base/OwnedFactory.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

/**
 * @title LeagueFactory
 * @notice Factory for deploying League contracts using ERC-1167 minimal proxies
 */
contract LeagueFactory is OwnedFactory {
    // Implementation contract for ERC-1167 clones
    address public immutable IMPLEMENTATION;

    // Default deployment parameters
    uint256 public defaultCycleDuration;

    event LeagueDeployed(
        address indexed instance,
        address indexed owner,
        address indexed controller,
        address matchContract,
        uint256 cycleDuration
    );
    event DefaultCycleDurationUpdated(uint256 previousValue, uint256 newValue);

    constructor() OwnedFactory(msg.sender) {
        // Deploy implementation contract for cloning
        IMPLEMENTATION = address(new League());
        
        // Default to 1 week cycle duration (0 uses contract default)
        defaultCycleDuration = 0;
    }

    /**
     * @notice Update the default cycle duration for new deployments
     * @param _cycleDuration Default cycle duration in seconds (0 for contract default)
     */
    function setDefaultCycleDuration(uint256 _cycleDuration) external onlyOwner {
        uint256 previous = defaultCycleDuration;
        defaultCycleDuration = _cycleDuration;
        emit DefaultCycleDurationUpdated(previous, _cycleDuration);
    }

    /**
     * @notice Deploy a new League contract using ERC-1167 minimal proxy
     * @param matchContract Address of the Match contract (optional)
     * @return instance Address of the deployed contract
     * @dev The caller (msg.sender) will be set as the controller of the deployed contract
     */
    function deployLeague(address matchContract) external returns (address instance) {
        address instanceOwnerAddress = getInstanceOwner();

        // Clone the implementation contract using ERC-1167
        instance = Clones.clone(IMPLEMENTATION);

        // Initialize the clone
        League(instance).initialize(
            instanceOwnerAddress,
            msg.sender,
            matchContract,
            defaultCycleDuration
        );

        emit LeagueDeployed(
            instance,
            instanceOwnerAddress,
            msg.sender,
            matchContract,
            defaultCycleDuration
        );
    }

    /**
     * @notice Deploy a new League contract with custom cycle duration
     * @param matchContract Address of the Match contract (optional)
     * @param cycleDuration Cycle duration in seconds
     * @return instance Address of the deployed contract
     */
    function deployLeagueWithDuration(
        address matchContract,
        uint256 cycleDuration
    ) external returns (address instance) {
        address instanceOwnerAddress = getInstanceOwner();

        instance = Clones.clone(IMPLEMENTATION);

        League(instance).initialize(
            instanceOwnerAddress,
            msg.sender,
            matchContract,
            cycleDuration
        );

        emit LeagueDeployed(
            instance,
            instanceOwnerAddress,
            msg.sender,
            matchContract,
            cycleDuration
        );
    }
}
