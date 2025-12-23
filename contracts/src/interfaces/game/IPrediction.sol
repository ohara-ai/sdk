// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title IPrediction
 * @notice Interface for winner prediction markets on Matches, Tournaments, and League cycles
 */
interface IPrediction {
    /// @notice Type of competition being predicted
    enum CompetitionType {
        Match,       // Predict winner of a match (uses matchId from Match contract)
        Tournament,  // Predict winner of a tournament
        LeagueCycle  // Predict winner of a league cycle
    }

    /// @notice Emitted when a new prediction market is created
    event MarketCreated(
        uint256 indexed marketId,
        CompetitionType competitionType,
        uint256 indexed competitionId,
        address token
    );

    /// @notice Emitted when a prediction is placed
    event PredictionPlaced(
        uint256 indexed marketId,
        address indexed predictor,
        address indexed predictedPlayer,
        uint256 amount
    );

    /// @notice Emitted when betting closes for a market
    event BettingClosed(uint256 indexed marketId);

    /// @notice Emitted when a market is resolved with a winner
    event MarketResolved(uint256 indexed marketId, address winner);

    /// @notice Emitted when a market is voided (cancelled/no winner)
    event MarketVoided(uint256 indexed marketId);

    /// @notice Emitted when winnings are claimed
    event Claimed(uint256 indexed marketId, address indexed predictor, uint256 payout);

    /// @notice Market data structure
    struct Market {
        CompetitionType competitionType;
        uint256 competitionId;    // matchId, tournamentId, or cycleId
        address token;            // Token for predictions (address(0) for native)
        uint256 totalPool;
        bool bettingClosed;
        bool resolved;
        bool voided;
        address resolvedWinner;
    }

    /// @notice Individual prediction data
    struct Prediction {
        address predictedPlayer;
        uint256 amount;
        bool claimed;
    }

    /// @notice Player odds data for UI
    struct PlayerOdds {
        address player;
        uint256 totalStaked;
        uint256 odds;
    }

    /**
     * @notice Create a winner prediction market
     * @param competitionType Type of competition (Match, Tournament, or LeagueCycle)
     * @param competitionId ID of the match, tournament, or cycle
     * @param token Token address for predictions (address(0) for native coin)
     * @return marketId The created market ID
     */
    function createMarket(
        CompetitionType competitionType,
        uint256 competitionId,
        address token
    ) external returns (uint256 marketId);

    /**
     * @notice Callback from source contracts when a competition starts (betting should close)
     * @param competitionType Type of competition that started
     * @param competitionId ID of the competition
     * @dev Called by Match.activate(), Tournament.activate(), or League.startCycle()
     */
    function onCompetitionStarted(
        CompetitionType competitionType,
        uint256 competitionId
    ) external;

    /**
     * @notice Place a prediction on a market
     * @param marketId Market ID to bet on
     * @param predictedPlayer Player address to bet on
     * @param amount Amount to stake (only used for ERC20, ignored for native)
     */
    function predict(uint256 marketId, address predictedPlayer, uint256 amount) external payable;

    /**
     * @notice Resolve a market after competition ends
     * @param marketId Market ID to resolve
     */
    function resolve(uint256 marketId) external;

    /**
     * @notice Claim winnings from a resolved market
     * @param marketId Market ID to claim from
     */
    function claim(uint256 marketId) external;

    /**
     * @notice Check if betting is open for a market
     * @param marketId Market ID to check
     */
    function isBettingOpen(uint256 marketId) external view returns (bool);

    /**
     * @notice Get market data
     * @param marketId Market ID
     */
    function getMarket(uint256 marketId) external view returns (Market memory);

    /**
     * @notice Get a user's prediction
     * @param marketId Market ID
     * @param predictor User address
     */
    function getPrediction(
        uint256 marketId,
        address predictor
    ) external view returns (Prediction memory);

    /**
     * @notice Get total staked on a player
     * @param marketId Market ID
     * @param player Player address
     */
    function getStakeForPlayer(
        uint256 marketId,
        address player
    ) external view returns (uint256);

    /**
     * @notice Get odds for a specific player
     * @param marketId Market ID
     * @param player Player address
     * @return odds Odds in basis points (10000 = 1x, 20000 = 2x)
     */
    function getOddsForPlayer(
        uint256 marketId,
        address player
    ) external view returns (uint256 odds);

    /**
     * @notice Get odds for all predicted players
     * @param marketId Market ID
     */
    function getAllOdds(uint256 marketId) external view returns (PlayerOdds[] memory);

    /**
     * @notice Get all players that have been predicted
     * @param marketId Market ID
     */
    function getPredictedPlayers(uint256 marketId) external view returns (address[] memory);
}