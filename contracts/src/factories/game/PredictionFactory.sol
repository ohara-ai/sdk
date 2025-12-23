// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Prediction} from "../../features/game/Prediction.sol";
import {OwnedFactory} from "../../base/OwnedFactory.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

/**
 * @title PredictionFactory
 * @notice Factory for deploying Prediction contracts using ERC-1167 minimal proxies
 */
contract PredictionFactory is OwnedFactory {
    // Implementation contract for ERC-1167 clones
    address public immutable IMPLEMENTATION;

    event PredictionDeployed(
        address indexed instance,
        address indexed owner,
        address indexed controller,
        address matchContract,
        address tournamentContract,
        address leagueContract
    );

    constructor() OwnedFactory(msg.sender) {
        // Deploy implementation contract for cloning
        IMPLEMENTATION = address(new Prediction());
    }

    /**
     * @notice Deploy a new Prediction contract using ERC-1167 minimal proxy
     * @param matchContract Address of the Match contract (optional)
     * @param tournamentContract Address of the Tournament contract (optional)
     * @param leagueContract Address of the League contract (optional)
     * @return instance Address of the deployed contract
     * @dev The caller (msg.sender) will be set as the controller of the deployed contract
     */
    function deployPrediction(
        address matchContract,
        address tournamentContract,
        address leagueContract
    ) external returns (address instance) {
        address instanceOwnerAddress = getInstanceOwner();

        // Clone the implementation contract using ERC-1167
        instance = Clones.clone(IMPLEMENTATION);

        // Initialize the clone with empty fee configuration
        address[] memory feeRecipients = new address[](0);
        uint256[] memory feeShares = new uint256[](0);

        Prediction(payable(instance)).initialize(
            instanceOwnerAddress,
            msg.sender,
            matchContract,
            tournamentContract,
            leagueContract,
            feeRecipients,
            feeShares
        );

        emit PredictionDeployed(
            instance,
            instanceOwnerAddress,
            msg.sender,
            matchContract,
            tournamentContract,
            leagueContract
        );
    }

    /**
     * @notice Deploy a new Prediction contract with fee configuration
     * @param matchContract Address of the Match contract (optional)
     * @param tournamentContract Address of the Tournament contract (optional)
     * @param leagueContract Address of the League contract (optional)
     * @param feeRecipients Fee recipient addresses
     * @param feeShares Fee shares in basis points
     * @return instance Address of the deployed contract
     */
    function deployPredictionWithFees(
        address matchContract,
        address tournamentContract,
        address leagueContract,
        address[] calldata feeRecipients,
        uint256[] calldata feeShares
    ) external returns (address instance) {
        address instanceOwnerAddress = getInstanceOwner();

        instance = Clones.clone(IMPLEMENTATION);

        Prediction(payable(instance)).initialize(
            instanceOwnerAddress,
            msg.sender,
            matchContract,
            tournamentContract,
            leagueContract,
            feeRecipients,
            feeShares
        );

        emit PredictionDeployed(
            instance,
            instanceOwnerAddress,
            msg.sender,
            matchContract,
            tournamentContract,
            leagueContract
        );
    }
}
