// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title Owned
 * @notice Simple ownership contract
 */
abstract contract Owned {
    address public owner;
    address public pendingOwner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferInitiated(address indexed previousOwner, address indexed newOwner);

    error Unauthorized();
    error InvalidOwner();
    error NoPendingOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address _owner) {
        // Allow address(0) for cloneable implementation contracts
        // The owner will be set via initialization for clones
        if (_owner != address(0)) {
            owner = _owner;
            emit OwnershipTransferred(address(0), _owner);
        }
    }

    /**
     * @notice Initiate ownership transfer (2-step process)
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) revert InvalidOwner();
        if (newOwner == owner) revert InvalidOwner();
        pendingOwner = newOwner;
        emit OwnershipTransferInitiated(owner, newOwner);
    }
    
    /**
     * @notice Accept ownership transfer
     * @dev Must be called by pendingOwner
     */
    function acceptOwnership() public virtual {
        if (msg.sender != pendingOwner || pendingOwner == address(0)) revert Unauthorized();
        emit OwnershipTransferred(owner, pendingOwner);
        owner = pendingOwner;
        pendingOwner = address(0);
    }
}
