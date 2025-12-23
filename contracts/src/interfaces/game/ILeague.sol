// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title ILeague
 * @notice Interface for tracking player rankings across time-based cycles
 * @dev Receives match results and indexes by tokens won per cycle
 */
interface ILeague {
    // ============ Enums ============

    /// @notice Cycle status
    enum CycleStatus {
        Registration, // Cycle not yet started or in registration phase
        Active,       // Cycle is active, matches being played
        Finalized     // Cycle completed, rankings calculated
    }

    // ============ Structs ============

    /// @notice Cycle metadata
    struct Cycle {
        uint256 startTime;
        uint256 endTime;
        CycleStatus status;
    }

    /// @notice Player stats per cycle per token
    struct PlayerStats {
        uint256 wins;
        uint256 losses;
        uint256 tokensWon;
        uint256 rank; // Calculated on finalization
    }

    // ============ Events ============

    /// @notice Emitted when a new cycle starts
    event CycleStarted(uint256 indexed cycleId, uint256 startTime, uint256 endTime);

    /// @notice Emitted when a match result is recorded
    event MatchRecorded(
        uint256 indexed cycleId,
        address indexed winner,
        address[] losers,
        address indexed token,
        uint256 prize
    );

    /// @notice Emitted when a cycle is finalized
    event CycleFinalized(
        uint256 indexed cycleId,
        address indexed token,
        address[] topPlayers,
        uint256[] topAmounts
    );

    /// @notice Emitted when a new player is registered
    event PlayerRegistered(uint256 indexed cycleId, address indexed player);

    /// @notice Emitted when the Match contract is updated
    event MatchContractUpdated(address indexed previousMatch, address indexed newMatch);

    /// @notice Emitted when the cycle duration is updated
    event CycleDurationUpdated(uint256 previousDuration, uint256 newDuration);

    // ============ Functions ============

    /**
     * @notice Record a match result (called by Match contract only)
     * @param winner The address of the winner
     * @param losers Array of addresses of losers
     * @param token The token used for stakes
     * @param totalPrize The total prize amount
     */
    function recordMatchResult(
        address winner,
        address[] calldata losers,
        address token,
        uint256 totalPrize
    ) external;

    /**
     * @notice Force finalize the current cycle (controller only)
     * @dev Useful for manual cycle management
     */
    function finalizeCycle() external;

    /**
     * @notice Get the current cycle ID
     * @return cycleId The current cycle ID
     */
    function getCurrentCycleId() external view returns (uint256 cycleId);

    /**
     * @notice Get cycle metadata
     * @param cycleId The cycle ID
     * @return cycle The cycle data
     */
    function getCycle(uint256 cycleId) external view returns (Cycle memory cycle);

    /**
     * @notice Get player stats for a specific cycle and token
     * @param cycleId The cycle ID
     * @param player The player address
     * @param token The token address
     * @return stats The player's stats
     */
    function getPlayerStats(
        uint256 cycleId,
        address player,
        address token
    ) external view returns (PlayerStats memory stats);

    /**
     * @notice Get leaderboard for a cycle and token
     * @param cycleId The cycle ID
     * @param token The token address
     * @param count Maximum number of players to return
     * @return players Array of player addresses sorted by tokensWon descending
     * @return tokensWon Array of tokens won for each player
     */
    function getLeaderboard(
        uint256 cycleId,
        address token,
        uint256 count
    ) external view returns (address[] memory players, uint256[] memory tokensWon);

    /**
     * @notice Get a player's rank for a cycle and token
     * @param cycleId The cycle ID
     * @param player The player address
     * @param token The token address
     * @return rank The player's rank (1-indexed, 0 if not ranked)
     */
    function getPlayerRank(
        uint256 cycleId,
        address player,
        address token
    ) external view returns (uint256 rank);

    /**
     * @notice Get all tokens seen in a cycle
     * @param cycleId The cycle ID
     * @return tokens Array of token addresses
     */
    function getCycleTokens(uint256 cycleId) external view returns (address[] memory tokens);

    /**
     * @notice Get all players in a cycle
     * @param cycleId The cycle ID
     * @return players Array of player addresses
     */
    function getCyclePlayers(uint256 cycleId) external view returns (address[] memory players);

    /**
     * @notice Get the cycle duration
     * @return duration The cycle duration in seconds
     */
    function getCycleDuration() external view returns (uint256 duration);

    /**
     * @notice Get top players for a cycle (uses native token by default)
     * @param cycleId The cycle ID
     * @param count Maximum number of players to return
     * @return players Array of player addresses sorted by tokensWon descending
     * @return tokensWon Array of tokens won for each player
     */
    function getTopPlayers(
        uint256 cycleId,
        uint256 count
    ) external view returns (address[] memory players, uint256[] memory tokensWon);
}
