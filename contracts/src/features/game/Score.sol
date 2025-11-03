// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IFeature} from "../../interfaces/IFeature.sol";
import {IScore} from "../../interfaces/game/IScore.sol";
import {FeatureController} from "../../base/FeatureController.sol";

/**
 * @title Score
 * @notice Tracks and stores player scores from completed matches
 * @dev Implements IScore for recording results and provides query functions
 */
contract Score is IScore, IFeature, FeatureController {
    struct PlayerScore {
        address player;
        uint256 totalWins;
        uint256 totalPrize;
        uint256 lastMatchId;
        uint256 lastWinTimestamp;
    }

    struct MatchRecord {
        uint256 matchId;
        address winner;
        address[] losers;
        uint256 prize;
        uint256 timestamp;
    }

    // Player address => PlayerScore
    mapping(address => PlayerScore) private _scores;
    
    // Array of all players who have participated
    address[] private _players;
    
    // Player address => index in _players array (0 means not in array, actual indices start at 1)
    mapping(address => uint256) private _playerIndex;
    
    // Match ID => MatchRecord
    mapping(uint256 => MatchRecord) private _matchRecords;
    
    // All match IDs
    uint256[] private _matchIds;
    
    // Authorized contracts that can record results
    mapping(address => bool) public authorizedRecorders;

    // Storage limits to prevent state explosion (configurable by owner)
    uint256 public maxLosersPerMatch; // Limit losers array size
    uint256 public maxTotalPlayers; // Cap total unique players
    uint256 public maxTotalMatches; // Cap total matches

    event RecorderAuthorized(address indexed recorder, bool authorized);
    event ScoreRecorded(
        uint256 indexed matchId,
        address indexed winner,
        uint256 totalWins,
        uint256 totalPrize
    );
    event LimitsUpdated(uint256 maxLosersPerMatch, uint256 maxTotalPlayers, uint256 maxTotalMatches);
    event MatchEvicted(uint256 indexed matchId, uint256 timestamp);
    event PlayerEvicted(address indexed player, uint256 totalWins, uint256 totalPrize);

    error UnauthorizedRecorder();
    error MatchAlreadyRecorded();
    error InvalidLimit();

    constructor(
        address _owner,
        address _controller,
        uint256 _maxLosersPerMatch,
        uint256 _maxTotalPlayers,
        uint256 _maxTotalMatches
    ) FeatureController(_owner, _controller) {
        maxLosersPerMatch = _maxLosersPerMatch;
        maxTotalPlayers = _maxTotalPlayers;
        maxTotalMatches = _maxTotalMatches;
    }

    /**
     * @notice Authorize or revoke a contract's ability to record scores
     * @param recorder Address of the recorder contract
     * @param authorized Whether to authorize or revoke
     */
    function setRecorderAuthorization(address recorder, bool authorized) external onlyController {
        authorizedRecorders[recorder] = authorized;
        emit RecorderAuthorized(recorder, authorized);
    }

    /**
     * @notice Update storage limits
     * @param _maxLosersPerMatch Maximum losers per match (0 = no change)
     * @param _maxTotalPlayers Maximum total players (0 = no change)
     * @param _maxTotalMatches Maximum total matches (0 = no change)
     */
    function updateLimits(
        uint256 _maxLosersPerMatch,
        uint256 _maxTotalPlayers,
        uint256 _maxTotalMatches
    ) external onlyOwner {
        if (_maxLosersPerMatch > 0) {
            maxLosersPerMatch = _maxLosersPerMatch;
        }
        if (_maxTotalPlayers > 0) {
            if (_maxTotalPlayers < _players.length) revert InvalidLimit();
            maxTotalPlayers = _maxTotalPlayers;
        }
        if (_maxTotalMatches > 0) {
            if (_maxTotalMatches < _matchIds.length) revert InvalidLimit();
            maxTotalMatches = _maxTotalMatches;
        }
        emit LimitsUpdated(maxLosersPerMatch, maxTotalPlayers, maxTotalMatches);
    }

    /**
     * @notice Evict the oldest match record
     * @dev Oldest match is always at index 0 due to append-only chronological ordering.
     *      Uses swap-and-pop for O(1) removal instead of O(n) shift-left.
     */
    function _evictOldestMatch() internal {
        if (_matchIds.length == 0) return;
        
        // Oldest match is always at index 0 (chronological order guaranteed)
        uint256 oldestMatchId = _matchIds[0];
        uint256 oldestTimestamp = _matchRecords[oldestMatchId].timestamp;
        
        // Swap first with last, then pop (O(1) instead of shift-left O(n))
        uint256 lastIndex = _matchIds.length - 1;
        if (lastIndex > 0) {
            _matchIds[0] = _matchIds[lastIndex];
        }
        _matchIds.pop();
        
        // Explicitly clean up dynamic array within struct for gas refund
        delete _matchRecords[oldestMatchId].losers;
        
        // Clean up the entire match record
        delete _matchRecords[oldestMatchId];
        
        emit MatchEvicted(oldestMatchId, oldestTimestamp);
    }

    /**
     * @notice Find and evict the player with least wins (and least prize if tied)
     */
    function _evictLeastSuccessfulPlayer() internal {
        if (_players.length == 0) return;
        
        address playerToEvict = _players[0];
        uint256 minWins = _scores[_players[0]].totalWins;
        uint256 minPrize = _scores[_players[0]].totalPrize;
        
        // Find player with least wins, and if tied, least prize
        for (uint256 i = 1; i < _players.length; i++) {
            address currentPlayer = _players[i];
            uint256 currentWins = _scores[currentPlayer].totalWins;
            uint256 currentPrize = _scores[currentPlayer].totalPrize;
            
            if (currentWins < minWins || (currentWins == minWins && currentPrize < minPrize)) {
                playerToEvict = currentPlayer;
                minWins = currentWins;
                minPrize = currentPrize;
            }
        }
        
        // Remove player from array
        uint256 indexToRemove = _playerIndex[playerToEvict] - 1; // _playerIndex stores 1-based index
        
        // Move last player to the removed position
        if (indexToRemove < _players.length - 1) {
            address lastPlayer = _players[_players.length - 1];
            _players[indexToRemove] = lastPlayer;
            _playerIndex[lastPlayer] = indexToRemove + 1;
        }
        _players.pop();
        
        // Clean up player data
        emit PlayerEvicted(playerToEvict, minWins, minPrize);
        delete _playerIndex[playerToEvict];
        delete _scores[playerToEvict];
    }

    /**
     * @notice Add a new player, evicting least successful if at capacity
     */
    function _addPlayer(address player) internal {
        if (_playerIndex[player] != 0) return; // Player already exists
        
        // If at capacity, evict least successful player
        if (_players.length >= maxTotalPlayers) {
            _evictLeastSuccessfulPlayer();
        }
        
        _players.push(player);
        _playerIndex[player] = _players.length;
        _scores[player].player = player;
    }

    /// @inheritdoc IScore
    function recordMatchResult(
        uint256 matchId,
        address winner,
        address[] calldata losers,
        uint256 prize
    ) external {
        if (!authorizedRecorders[msg.sender]) revert UnauthorizedRecorder();
        if (_matchRecords[matchId].timestamp != 0) revert MatchAlreadyRecorded();
        
        // Truncate losers array if it exceeds the limit
        uint256 losersToRecord = losers.length > maxLosersPerMatch ? maxLosersPerMatch : losers.length;
        address[] memory processedLosers = new address[](losersToRecord);
        for (uint256 i = 0; i < losersToRecord; i++) {
            processedLosers[i] = losers[i];
        }
        
        // If at match capacity, evict oldest match
        if (_matchIds.length >= maxTotalMatches) {
            _evictOldestMatch();
        }

        // Record match
        _matchRecords[matchId] = MatchRecord({
            matchId: matchId,
            winner: winner,
            losers: processedLosers,
            prize: prize,
            timestamp: block.timestamp
        });
        _matchIds.push(matchId);

        // Collect all new players to add (to avoid evicting newly added winner)
        address[] memory newPlayers = new address[](processedLosers.length + 1);
        uint256 newPlayerCount = 0;
        
        if (_playerIndex[winner] == 0) {
            newPlayers[newPlayerCount++] = winner;
        }
        
        for (uint256 i = 0; i < processedLosers.length; i++) {
            if (_playerIndex[processedLosers[i]] == 0) {
                newPlayers[newPlayerCount++] = processedLosers[i];
            }
        }
        
        // Add all new players
        for (uint256 i = 0; i < newPlayerCount; i++) {
            _addPlayer(newPlayers[i]);
        }

        // Update winner score
        PlayerScore storage winnerScore = _scores[winner];
        winnerScore.player = winner;
        winnerScore.totalWins++;
        winnerScore.totalPrize += prize;
        winnerScore.lastMatchId = matchId;
        winnerScore.lastWinTimestamp = block.timestamp;

        emit ScoreRecorded(matchId, winner, winnerScore.totalWins, winnerScore.totalPrize);
    }

    /**
     * @notice Get a player's score
     * @param player The player's address
     * @return totalWins Total number of wins
     * @return totalPrize Total prize amount won
     * @return lastMatchId Last match ID the player won
     * @return lastWinTimestamp Timestamp of last win
     */
    function getPlayerScore(address player)
        external
        view
        returns (
            uint256 totalWins,
            uint256 totalPrize,
            uint256 lastMatchId,
            uint256 lastWinTimestamp
        )
    {
        PlayerScore storage score = _scores[player];
        return (score.totalWins, score.totalPrize, score.lastMatchId, score.lastWinTimestamp);
    }

    /**
     * @notice Get top players by total wins
     * @param limit Maximum number of players to return
     * @return players Array of player addresses
     * @return wins Array of total wins for each player
     * @return prizes Array of total prizes for each player
     */
    function getTopPlayersByWins(uint256 limit)
        external
        view
        returns (
            address[] memory players,
            uint256[] memory wins,
            uint256[] memory prizes
        )
    {
        uint256 count = _players.length < limit ? _players.length : limit;
        
        players = new address[](count);
        wins = new uint256[](count);
        prizes = new uint256[](count);

        // Create a sorted copy of players by wins
        address[] memory sortedPlayers = new address[](_players.length);
        for (uint256 i = 0; i < _players.length; i++) {
            sortedPlayers[i] = _players[i];
        }

        // Simple bubble sort (for small datasets, fine for demo)
        for (uint256 i = 0; i < sortedPlayers.length; i++) {
            for (uint256 j = i + 1; j < sortedPlayers.length; j++) {
                if (_scores[sortedPlayers[i]].totalWins < _scores[sortedPlayers[j]].totalWins) {
                    address temp = sortedPlayers[i];
                    sortedPlayers[i] = sortedPlayers[j];
                    sortedPlayers[j] = temp;
                }
            }
        }

        // Return top N
        for (uint256 i = 0; i < count; i++) {
            players[i] = sortedPlayers[i];
            wins[i] = _scores[sortedPlayers[i]].totalWins;
            prizes[i] = _scores[sortedPlayers[i]].totalPrize;
        }

        return (players, wins, prizes);
    }

    /**
     * @notice Get top players by total prize
     * @param limit Maximum number of players to return
     * @return players Array of player addresses
     * @return wins Array of total wins for each player
     * @return prizes Array of total prizes for each player
     */
    function getTopPlayersByPrize(uint256 limit)
        external
        view
        returns (
            address[] memory players,
            uint256[] memory wins,
            uint256[] memory prizes
        )
    {
        uint256 count = _players.length < limit ? _players.length : limit;
        
        players = new address[](count);
        wins = new uint256[](count);
        prizes = new uint256[](count);

        // Create a sorted copy of players by prize
        address[] memory sortedPlayers = new address[](_players.length);
        for (uint256 i = 0; i < _players.length; i++) {
            sortedPlayers[i] = _players[i];
        }

        // Simple bubble sort by prize
        for (uint256 i = 0; i < sortedPlayers.length; i++) {
            for (uint256 j = i + 1; j < sortedPlayers.length; j++) {
                if (_scores[sortedPlayers[i]].totalPrize < _scores[sortedPlayers[j]].totalPrize) {
                    address temp = sortedPlayers[i];
                    sortedPlayers[i] = sortedPlayers[j];
                    sortedPlayers[j] = temp;
                }
            }
        }

        // Return top N
        for (uint256 i = 0; i < count; i++) {
            players[i] = sortedPlayers[i];
            wins[i] = _scores[sortedPlayers[i]].totalWins;
            prizes[i] = _scores[sortedPlayers[i]].totalPrize;
        }

        return (players, wins, prizes);
    }

    /**
     * @notice Get match record by ID
     * @param matchId The match ID
     * @return winner Winner address
     * @return losers Array of loser addresses
     * @return prize Prize amount
     * @return timestamp Match timestamp
     */
    function getMatchRecord(uint256 matchId)
        external
        view
        returns (
            address winner,
            address[] memory losers,
            uint256 prize,
            uint256 timestamp
        )
    {
        MatchRecord storage record = _matchRecords[matchId];
        return (record.winner, record.losers, record.prize, record.timestamp);
    }

    /**
     * @notice Get total number of recorded matches
     * @return Total number of matches
     */
    function getTotalMatches() external view returns (uint256) {
        return _matchIds.length;
    }

    /**
     * @notice Get total number of players
     * @return Total number of players
     */
    function getTotalPlayers() external view returns (uint256) {
        return _players.length;
    }

    /**
     * @notice Get remaining capacity for players
     * @return Remaining slots before player limit is reached
     */
    function getRemainingPlayerCapacity() external view returns (uint256) {
        if (_players.length >= maxTotalPlayers) return 0;
        return maxTotalPlayers - _players.length;
    }

    /**
     * @notice Get remaining capacity for matches
     * @return Remaining slots before match limit is reached
     */
    function getRemainingMatchCapacity() external view returns (uint256) {
        if (_matchIds.length >= maxTotalMatches) return 0;
        return maxTotalMatches - _matchIds.length;
    }

    /// @inheritdoc IFeature
    function version() external pure returns (string memory) {
        return "1.0.0";
    }

    /// @inheritdoc IFeature
    function featureName() external pure returns (string memory) {
        return "GameScore - OCI-002";
    }
}
