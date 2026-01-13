// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Heap} from "../../features/game/Heap.sol";
import {OwnedFactory} from "../../base/OwnedFactory.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

/**
 * @title HeapFactory
 * @notice Factory for deploying Heap contracts
 */
contract HeapFactory is OwnedFactory {
    // Implementation contract for ERC-1167 clones
    address public immutable IMPLEMENTATION;
    
    // Default capacity limit for new deployments
    uint256 public defaultMaxActiveHeaps;
    
    // Default fee configuration for new deployments
    address[] public defaultFeeRecipients;
    uint256[] public defaultFeeShares;

    event HeapDeployed(
        address indexed instance,
        address indexed owner,
        address indexed controller,
        address score
    );
    event DefaultMaxActiveHeapsUpdated(uint256 newDefault);
    event DefaultFeesUpdated(address[] recipients, uint256[] shares);

    error LengthMismatch();
    error MaxFeeExceeded();

    constructor() OwnedFactory(msg.sender) {
        // Deploy implementation contract for cloning
        IMPLEMENTATION = address(new Heap());
        
        // Initialize with default limit
        defaultMaxActiveHeaps = 100;
        // Default fees can be configured via setDefaultFees after deployment
    }

    /**
     * @notice Update the default max active heaps for new deployments
     * @param _defaultMaxActiveHeaps Default maximum active heaps
     */
    function setDefaultMaxActiveHeaps(uint256 _defaultMaxActiveHeaps) external onlyOwner {
        defaultMaxActiveHeaps = _defaultMaxActiveHeaps;
        emit DefaultMaxActiveHeapsUpdated(_defaultMaxActiveHeaps);
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
        if (_recipients.length != _shares.length) revert LengthMismatch();
        
        uint256 total;
        uint256 length = _shares.length;
        for (uint256 i = 0; i < length;) {
            total += _shares[i];
            unchecked { ++i; }
        }
        if (total > 5000) revert MaxFeeExceeded();
        
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
     * @notice Deploy a new Heap contract using ERC-1167 minimal proxy
     * @param _score Score contract address (address(0) if not used)
     * @return instance Address of the deployed contract
     * @dev The caller (msg.sender) will be set as the controller of the deployed contract
     * @dev Fees can be configured after deployment using the configureFees function
     */
    function deployHeap(
        address _score
    ) external returns (address instance) {
        address instanceOwnerAddress = getInstanceOwner();
        
        // Clone the implementation contract using ERC-1167
        instance = Clones.clone(IMPLEMENTATION);
        
        // Initialize the clone
        Heap(instance).initialize(
            instanceOwnerAddress,
            msg.sender,
            _score,
            defaultMaxActiveHeaps,
            defaultFeeRecipients,
            defaultFeeShares
        );
        
        emit HeapDeployed(instance, instanceOwnerAddress, msg.sender, _score);
    }
}
