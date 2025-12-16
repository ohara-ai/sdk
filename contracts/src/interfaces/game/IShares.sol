// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title IShares
 * @notice Interface for share accrual and claiming from wagers
 * @dev Implemented by Match contract to allow prize contracts to receive shares
 */
interface IShares {
    /// @notice Emitted when shares are accrued for an address
    event SharesAccrued(address indexed recipient, address indexed token, uint256 amount);
    
    /// @notice Emitted when shares are claimed by an address
    event SharesClaimed(address indexed recipient, address indexed token, uint256 amount);
    
    /// @notice Emitted when a share recipient is registered
    event ShareRecipientRegistered(address indexed recipient, uint256 shareBasisPoints);
    
    /// @notice Emitted when a share recipient is removed
    event ShareRecipientRemoved(address indexed recipient);

    /**
     * @notice Register an address to receive a share of wagers
     * @param recipient Address to receive shares
     * @param shareBasisPoints Share amount in basis points (100 = 1%)
     */
    function registerShareRecipient(address recipient, uint256 shareBasisPoints) external;

    /**
     * @notice Remove a share recipient
     * @param recipient Address to remove from share recipients
     */
    function removeShareRecipient(address recipient) external;

    /**
     * @notice Claim accrued shares for a specific token
     * @param token Token address (address(0) for native token)
     */
    function claimShares(address token) external;

    /**
     * @notice Get pending shares for an address
     * @param recipient Address to check
     * @param token Token address (address(0) for native token)
     * @return amount Pending share amount
     */
    function getPendingShares(address recipient, address token) external view returns (uint256 amount);

    /**
     * @notice Get all token addresses that have been used for share accrual
     * @return tokens Array of token addresses
     */
    function getShareTokens() external view returns (address[] memory tokens);

    /**
     * @notice Get share configuration for a recipient
     * @param recipient Address to check
     * @return shareBasisPoints Share amount in basis points (0 if not registered)
     */
    function getShareConfig(address recipient) external view returns (uint256 shareBasisPoints);
}
