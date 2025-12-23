// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title ITournament
 * @notice Interface for single elimination tournament bracket management
 * @dev Tracks bracket progression via Score contract notifications
 */
interface ITournament {
    // ============ Enums ============

    /// @notice Tournament lifecycle status
    enum TournamentStatus {
        Pending, // Tournament created, waiting for activation
        Active, // Tournament in progress
        Finalized, // Winner determined
        Cancelled // Cancelled by controller
    }

    // ============ Structs ============

    /// @notice Bracket match - a pending match between two participants
    struct BracketMatch {
        address player1;
        address player2;
        address winner; // address(0) until resolved
        bool resolved;
    }

    /// @notice Tournament view data
    struct TournamentView {
        uint256 participantCount;
        uint256 currentRound;
        uint256 totalRounds;
        TournamentStatus status;
        address winner;
        uint256 createdAt;
    }

    // ============ Events ============

    /// @notice Emitted when a new tournament is created
    event TournamentCreated(
        uint256 indexed tournamentId,
        address[] participants,
        uint256 totalRounds
    );

    /// @notice Emitted when a tournament is activated
    event TournamentActivated(uint256 indexed tournamentId);

    /// @notice Emitted when a bracket match is resolved
    event BracketMatchResolved(
        uint256 indexed tournamentId,
        uint256 indexed round,
        uint256 indexed matchIndex,
        address winner,
        address loser
    );

    /// @notice Emitted when a round completes
    event RoundCompleted(uint256 indexed tournamentId, uint256 round, address[] advancingPlayers);

    /// @notice Emitted when a tournament is finalized
    event TournamentFinalized(uint256 indexed tournamentId, address indexed winner);

    /// @notice Emitted when a tournament is cancelled
    event TournamentCancelled(uint256 indexed tournamentId);

    /// @notice Emitted when Score contract is updated
    event ScoreContractUpdated(address indexed previousScore, address indexed newScore);

    // ============ Functions ============

    /**
     * @notice Create a new single elimination tournament
     * @param participants Ordered array of participant addresses (must be power of 2)
     * @return tournamentId The ID of the created tournament
     */
    function createTournament(address[] calldata participants) external returns (uint256 tournamentId);

    /**
     * @notice Activate a tournament to start (controller only)
     * @param tournamentId The ID of the tournament
     */
    function activate(uint256 tournamentId) external;

    /**
     * @notice Called by Score contract when a match result is recorded
     * @dev Checks if winner/loser pair matches any pending bracket match
     * @param winner The match winner
     * @param loser The match loser (first from losers array)
     */
    function onMatchResult(address winner, address loser) external;

    /**
     * @notice Manually resolve a bracket match (controller only, for edge cases)
     * @param tournamentId The ID of the tournament
     * @param round The round number (0-indexed)
     * @param matchIndex The match index within the round
     * @param winner The winner (must be player1 or player2 of the match)
     */
    function resolveMatch(
        uint256 tournamentId,
        uint256 round,
        uint256 matchIndex,
        address winner
    ) external;

    /**
     * @notice Cancel a tournament (controller only)
     * @param tournamentId The ID of the tournament
     */
    function cancel(uint256 tournamentId) external;

    /**
     * @notice Get tournament details
     * @param tournamentId The ID of the tournament
     * @return tournament The tournament view data
     */
    function getTournament(uint256 tournamentId) external view returns (TournamentView memory tournament);

    /**
     * @notice Get participants in a tournament
     * @param tournamentId The ID of the tournament
     * @return participants Array of participant addresses
     */
    function getParticipants(uint256 tournamentId) external view returns (address[] memory participants);

    /**
     * @notice Get a specific bracket match
     * @param tournamentId The ID of the tournament
     * @param round The round number (0-indexed)
     * @param matchIndex The match index within the round
     * @return bracketMatch The bracket match data
     */
    function getBracketMatch(
        uint256 tournamentId,
        uint256 round,
        uint256 matchIndex
    ) external view returns (BracketMatch memory bracketMatch);

    /**
     * @notice Get all matches for a round
     * @param tournamentId The ID of the tournament
     * @param round The round number (0-indexed)
     * @return matches Array of bracket matches
     */
    function getRoundMatches(
        uint256 tournamentId,
        uint256 round
    ) external view returns (BracketMatch[] memory matches);

    /**
     * @notice Check if a tournament has a pending match for given players
     * @param tournamentId The ID of the tournament
     * @param player1 First player
     * @param player2 Second player
     * @return hasPending True if there's a pending match
     * @return round The round number if found
     * @return matchIndex The match index if found
     */
    function hasPendingMatch(
        uint256 tournamentId,
        address player1,
        address player2
    ) external view returns (bool hasPending, uint256 round, uint256 matchIndex);
}
