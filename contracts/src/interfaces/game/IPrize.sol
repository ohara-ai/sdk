// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title IPrize
 * @notice Interface for prize pools based on match wins
 * @dev Prize pools distribute accumulated shares to the player with most wins
 */
interface IPrize {
    /// @notice Emitted when a new prize pool is created
    event PrizePoolCreated(uint256 indexed poolId, uint256 matchesPerPool);
    
    /// @notice Emitted when a match result is recorded in a pool
    event MatchRecorded(uint256 indexed poolId, address indexed winner, uint256 matchNumber);
    
    /// @notice Emitted when a prize pool is finalized
    event PrizePoolFinalized(uint256 indexed poolId, address indexed winner, uint256 totalWins);
    
    /// @notice Emitted when a prize is claimed
    event PrizeClaimed(uint256 indexed poolId, address indexed winner, address indexed token, uint256 amount);
    
    /// @notice Emitted when shares are collected from the match contract
    event SharesCollected(address indexed token, uint256 amount);

    /**
     * @notice Record a match result and track winner
     * @param winner Address of the match winner
     * @dev Called by Score contract when a match is finalized
     */
    function recordMatchResult(address winner) external;

    /**
     * @notice Claim prize for a won pool
     * @param poolId Pool ID to claim prize from
     */
    function claimPrize(uint256 poolId) external;

    /**
     * @notice Get current pool information
     * @param poolId Pool ID to query
     * @return matchesCompleted Number of matches completed in this pool
     * @return winner Current leading address (or final winner if finalized)
     * @return highestWins Highest win count in this pool
     * @return finalized Whether the pool has been finalized
     * @return prizeClaimed Whether the prize has been claimed
     */
    function getPool(uint256 poolId) external view returns (
        uint256 matchesCompleted,
        address winner,
        uint256 highestWins,
        bool finalized,
        bool prizeClaimed
    );

    /**
     * @notice Get win count for an address in a specific pool
     * @param poolId Pool ID to query
     * @param player Player address to check
     * @return wins Number of wins in this pool
     */
    function getPoolWins(uint256 poolId, address player) external view returns (uint256 wins);

    /**
     * @notice Get collected prize amounts for a pool
     * @param poolId Pool ID to query
     * @param token Token address to check
     * @return amount Prize amount for this token
     */
    function getPoolPrize(uint256 poolId, address token) external view returns (uint256 amount);

    /**
     * @notice Get current active pool ID
     * @return poolId Current pool ID
     */
    function getCurrentPoolId() external view returns (uint256 poolId);

    /**
     * @notice Get matches per pool configuration
     * @return matchesPerPool Number of matches per prize pool
     */
    function getMatchesPerPool() external view returns (uint256 matchesPerPool);
}
