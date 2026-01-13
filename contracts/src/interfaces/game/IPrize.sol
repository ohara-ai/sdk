// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title IPrize
 * @notice Interface for prize pools based on match wins with multi-winner support
 * @dev Prize pools are token-specific and distribute to top N winners using configurable strategies
 */
interface IPrize {
    /// @notice Distribution strategies for prize allocation among winners
    enum DistributionStrategy {
        Equal,              // Equal split among all winners
        Linear,             // Linear decrease (1st: N shares, 2nd: N-1, etc.)
        Exponential,        // Exponential decrease (50%, 25%, 12.5%, etc.)
        WinnerTakeAll,      // 100% to first place only
        ProportionalToWins  // Proportional to number of wins in the pool
    }

    /// @notice Emitted when a new prize pool is created for a token
    event PrizePoolCreated(uint256 indexed poolId, address indexed token, uint256 matchesPerPool);
    
    /// @notice Emitted when a match result is recorded in a pool
    event MatchRecorded(uint256 indexed poolId, address indexed token, address indexed winner, uint256 matchNumber);
    
    /// @notice Emitted when a prize pool is finalized
    event PrizePoolFinalized(uint256 indexed poolId, address indexed token, address[] winners, uint256[] winCounts);
    
    /// @notice Emitted when a prize is claimed by a winner
    event PrizeClaimed(uint256 indexed poolId, address indexed winner, address indexed token, uint256 amount, uint256 rank);
    
    /// @notice Emitted when shares are collected from the match contract
    event SharesCollected(address indexed token, uint256 amount);

    /// @notice Emitted when configuration is updated
    event ConfigUpdated(uint256 winnersCount, DistributionStrategy strategy);

    /**
     * @notice Record a match result with token context for automatic pool routing
     * @param winner Address of the match winner
     * @param token Token address of the match reward (address(0) for native)
     * @dev Routes to the appropriate token-specific pool automatically
     */
    function recordMatchResult(address winner, address token) external;

    /**
     * @notice Claim prize for a won pool (caller must be in top N winners)
     * @param poolId Pool ID to claim prize from
     */
    function claimPrize(uint256 poolId) external;

    /**
     * @notice Get pool information
     * @param poolId Pool ID to query
     * @return token Token address for this pool
     * @return matchesCompleted Number of matches completed in this pool
     * @return finalized Whether the pool has been finalized
     * @return prizeAmount Total prize amount in the pool
     */
    function getPool(uint256 poolId) external view returns (
        address token,
        uint256 matchesCompleted,
        bool finalized,
        uint256 prizeAmount
    );

    /**
     * @notice Get winners and their stats for a finalized pool
     * @param poolId Pool ID to query
     * @return winners Array of winner addresses (sorted by rank)
     * @return winCounts Array of win counts for each winner
     * @return claimed Array indicating if each winner has claimed
     */
    function getPoolWinners(uint256 poolId) external view returns (
        address[] memory winners,
        uint256[] memory winCounts,
        bool[] memory claimed
    );

    /**
     * @notice Get win count for an address in a specific pool
     * @param poolId Pool ID to query
     * @param player Player address to check
     * @return wins Number of wins in this pool
     */
    function getPoolWins(uint256 poolId, address player) external view returns (uint256 wins);

    /**
     * @notice Get prize amount for a specific winner rank
     * @param poolId Pool ID to query
     * @param rank Winner rank (0 = 1st place)
     * @return amount Prize amount for this rank
     */
    function getPrizeForRank(uint256 poolId, uint256 rank) external view returns (uint256 amount);

    /**
     * @notice Get current active pool ID for a specific token
     * @param token Token address (address(0) for native)
     * @return poolId Current pool ID for this token
     */
    function getCurrentPoolId(address token) external view returns (uint256 poolId);

    /**
     * @notice Get matches per pool configuration
     * @return matchesPerPool Number of matches per prize pool
     */
    function getMatchesPerPool() external view returns (uint256 matchesPerPool);

    /**
     * @notice Get number of winners per pool
     * @return winnersCount Number of top winners that receive prizes
     */
    function getWinnersCount() external view returns (uint256 winnersCount);

    /**
     * @notice Get the distribution strategy
     * @return strategy Current distribution strategy
     */
    function getDistributionStrategy() external view returns (DistributionStrategy strategy);
}
