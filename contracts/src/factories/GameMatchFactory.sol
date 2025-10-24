// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {GameMatch} from "../features/game-match/GameMatch.sol";
import {OwnedFactory} from "../base/OwnedFactory.sol";

/**
 * @title GameMatchFactory
 * @notice Factory for deploying GameMatch contracts
 */
contract GameMatchFactory is OwnedFactory {
    // Default capacity limit for new deployments
    uint256 public defaultMaxActiveMatches;
    
    // Default fee configuration for new deployments
    address[] public defaultFeeRecipients;
    uint256[] public defaultFeeShares;

    event GameMatchDeployed(
        address indexed instance,
        address indexed owner,
        address indexed controller,
        address gameScore
    );
    event DefaultMaxActiveMatchesUpdated(uint256 newDefault);
    event DefaultFeesUpdated(address[] recipients, uint256[] shares);

    constructor() OwnedFactory(msg.sender) {
        // Initialize with default limit
        defaultMaxActiveMatches = 100;
        // Default fees can be configured via setDefaultFees after deployment
    }

    /**
     * @notice Update the default max active matches for new deployments
     * @param _defaultMaxActiveMatches Default maximum active matches
     */
    function setDefaultMaxActiveMatches(uint256 _defaultMaxActiveMatches) external onlyOwner {
        defaultMaxActiveMatches = _defaultMaxActiveMatches;
        emit DefaultMaxActiveMatchesUpdated(_defaultMaxActiveMatches);
    }

    /**
     * @notice Configure default fee recipients and shares for new deployments
     * @param _recipients Array of recipient addresses
     * @param _shares Array of shares in basis points (100 = 1%)
     */
    function setDefaultFees(
        address[] calldata _recipients,
        uint256[] calldata _shares
    ) external onlyOwner {
        require(_recipients.length == _shares.length, "Length mismatch");
        
        uint256 total = 0;
        for (uint256 i = 0; i < _shares.length; i++) {
            total += _shares[i];
        }
        require(total <= 5000, "Max 50% fee"); // Max 50% fee
        
        defaultFeeRecipients = _recipients;
        defaultFeeShares = _shares;
        
        emit DefaultFeesUpdated(_recipients, _shares);
    }

    /**
     * @notice Get the default fee configuration
     * @return recipients Array of default fee recipient addresses
     * @return shares Array of default fee shares in basis points
     */
    function getDefaultFees() external view returns (address[] memory recipients, uint256[] memory shares) {
        return (defaultFeeRecipients, defaultFeeShares);
    }

    /**
     * @notice Deploy a new GameMatch contract
     * @param _gameScore GameScore contract address (address(0) if not used)
     * @return instance Address of the deployed contract
     * @dev The caller (msg.sender) will be set as the controller of the deployed contract
     * @dev Fees can be configured after deployment using the configureFees function
     */
    function deployGameMatch(
        address _gameScore
    ) external returns (address instance) {
        address instanceOwnerAddress = getInstanceOwner();
        
        instance = address(
            new GameMatch(
                instanceOwnerAddress,
                msg.sender,
                _gameScore,
                defaultMaxActiveMatches,
                defaultFeeRecipients,
                defaultFeeShares
            )
        );
        emit GameMatchDeployed(instance, instanceOwnerAddress, msg.sender, _gameScore);
    }
}
