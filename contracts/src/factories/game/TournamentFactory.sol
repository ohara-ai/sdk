// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Tournament} from "../../features/game/Tournament.sol";
import {OwnedFactory} from "../../base/OwnedFactory.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

/**
 * @title TournamentFactory
 * @notice Factory for deploying Tournament contracts using ERC-1167 minimal proxies
 */
contract TournamentFactory is OwnedFactory {
    // Implementation contract for ERC-1167 clones
    address public immutable IMPLEMENTATION;

    // Default deployment parameters
    uint256 public defaultMaxActiveTournaments;

    event TournamentDeployed(
        address indexed instance,
        address indexed owner,
        address indexed controller,
        address scoreContract,
        uint256 maxActiveTournaments
    );
    event DefaultMaxActiveTournamentsUpdated(uint256 previousValue, uint256 newValue);

    constructor() OwnedFactory(msg.sender) {
        // Deploy implementation contract for cloning
        IMPLEMENTATION = address(new Tournament());
        
        // Default max active tournaments
        defaultMaxActiveTournaments = 100;
    }

    /**
     * @notice Update the default max active tournaments for new deployments
     * @param _maxActive Default max active tournaments
     */
    function setDefaultMaxActiveTournaments(uint256 _maxActive) external onlyOwner {
        uint256 previous = defaultMaxActiveTournaments;
        defaultMaxActiveTournaments = _maxActive;
        emit DefaultMaxActiveTournamentsUpdated(previous, _maxActive);
    }

    /**
     * @notice Deploy a new Tournament contract using ERC-1167 minimal proxy
     * @param scoreContract Address of the Score contract (optional)
     * @return instance Address of the deployed contract
     * @dev The caller (msg.sender) will be set as the controller of the deployed contract
     */
    function deployTournament(address scoreContract) external returns (address instance) {
        address instanceOwnerAddress = getInstanceOwner();

        // Clone the implementation contract using ERC-1167
        instance = Clones.clone(IMPLEMENTATION);

        // Initialize the clone
        Tournament(instance).initialize(
            instanceOwnerAddress,
            msg.sender,
            scoreContract,
            defaultMaxActiveTournaments
        );

        emit TournamentDeployed(
            instance,
            instanceOwnerAddress,
            msg.sender,
            scoreContract,
            defaultMaxActiveTournaments
        );
    }

    /**
     * @notice Deploy a new Tournament contract with custom max active
     * @param scoreContract Address of the Score contract (optional)
     * @param maxActive Maximum active tournaments
     * @return instance Address of the deployed contract
     */
    function deployTournamentWithMaxActive(
        address scoreContract,
        uint256 maxActive
    ) external returns (address instance) {
        address instanceOwnerAddress = getInstanceOwner();

        instance = Clones.clone(IMPLEMENTATION);

        Tournament(instance).initialize(
            instanceOwnerAddress,
            msg.sender,
            scoreContract,
            maxActive
        );

        emit TournamentDeployed(
            instance,
            instanceOwnerAddress,
            msg.sender,
            scoreContract,
            maxActive
        );
    }
}
