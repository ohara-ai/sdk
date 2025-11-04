// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title IMatch
 * @notice Interface for the GameMatch escrow feature
 */
interface IMatch {
    /// @notice Emitted when a new match is created
    event MatchCreated(
        uint256 indexed matchId,
        address indexed creator,
        address token,
        uint256 stakeAmount,
        uint256 maxPlayers
    );

    /// @notice Emitted when a player joins a match
    event PlayerJoined(uint256 indexed matchId, address indexed player, uint256 stakeAmount);

    /// @notice Emitted when a player withdraws from a match
    event PlayerWithdrew(uint256 indexed matchId, address indexed player, uint256 amount);

    /// @notice Emitted when a match is activated
    event MatchActivated(uint256 indexed matchId, address[] players);

    /// @notice Emitted when a match is finalized
    event MatchFinalized(
        uint256 indexed matchId,
        address indexed winner,
        uint256 totalPrize,
        uint256 winnerAmount
    );

    /// @notice Emitted when a match is cancelled (e.g., tied match)
    event MatchCancelled(uint256 indexed matchId, address[] players, uint256 refundAmount);

    /// @notice Match status
    enum MatchStatus {
        Open,
        Active,
        Finalized,
        Cancelled
    }

    /// @notice Match data structure
    struct Match {
        address token;
        uint256 stakeAmount;
        uint256 maxPlayers;
        address[] players;
        mapping(address => uint256) stakes;
        MatchStatus status;
        address winner;
        uint256 createdAt;
    }

    /**
     * @notice Create a new match with specified parameters
     * @param token Token address for stakes (address(0) for native token)
     * @param stakeAmount Required stake amount per player
     * @param maxPlayers Maximum number of players allowed
     * @return matchId The ID of the created match
     */
    function create(
        address token,
        uint256 stakeAmount,
        uint256 maxPlayers
    ) external payable returns (uint256 matchId);

    /**
     * @notice Join an existing open match
     * @param matchId The ID of the match to join
     */
    function join(uint256 matchId) external payable;

    /**
     * @notice Leave an open match and withdraw stake before activation
     * @param matchId The ID of the match to leave
     */
    function leave(uint256 matchId) external;

    /**
     * @notice Activate a match (controller only)
     * @param matchId The ID of the match to activate
     */
    function activate(uint256 matchId) external;

    /**
     * @notice Finalize a match with a winner (controller only)
     * @param matchId The ID of the match to finalize
     * @param winner Address of the winning player (address(0) for tie/refund)
     */
    function finalize(uint256 matchId, address winner) external;

    /**
     * @notice Cancel an active match and refund all players (controller only)
     * @param matchId The ID of the match to cancel
     */
    function cancel(uint256 matchId) external;

    /**
     * @notice Get match details
     * @param matchId The ID of the match
     */
    function getMatch(
        uint256 matchId
    )
        external
        view
        returns (
            address token,
            uint256 stakeAmount,
            uint256 maxPlayers,
            address[] memory players,
            MatchStatus status,
            address winner,
            uint256 createdAt
        );

    /**
     * @notice Get a player's stake in a match
     * @param matchId The ID of the match
     * @param player The player's address
     */
    function getPlayerStake(uint256 matchId, address player) external view returns (uint256);
}
