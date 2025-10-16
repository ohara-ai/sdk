// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title IGameMatch
 * @notice Interface for the GameMatch escrow feature
 */
interface IGameMatch {
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

    /// @notice Match status
    enum MatchStatus {
        Open,
        Active,
        Finalized
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
     * @notice Creates a new match
     * @param token The token to use for staking (address(0) for native token)
     * @param stakeAmount The amount each player must stake
     * @param maxPlayers Maximum number of players allowed
     * @return matchId The ID of the created match
     */
    function createMatch(
        address token,
        uint256 stakeAmount,
        uint256 maxPlayers
    ) external payable returns (uint256 matchId);

    /**
     * @notice Join an existing match
     * @param matchId The ID of the match to join
     */
    function joinMatch(uint256 matchId) external payable;

    /**
     * @notice Withdraw stake from a match (only before activation)
     * @param matchId The ID of the match
     */
    function withdrawStake(uint256 matchId) external;

    /**
     * @notice Activate a match, locking all stakes
     * @param matchId The ID of the match
     */
    function activateMatch(uint256 matchId) external;

    /**
     * @notice Finalize a match and distribute prizes
     * @param matchId The ID of the match
     * @param winner The address of the winning player
     */
    function finalizeMatch(uint256 matchId, address winner) external;

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
