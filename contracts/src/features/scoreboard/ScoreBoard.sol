// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IScoreBoard} from "../../interfaces/IScoreBoard.sol";
import {Owned} from "../../base/Owned.sol";

/**
 * @title ScoreBoard
 * @notice Tracks and stores player scores from completed matches
 * @dev Implements IScoreBoard for recording results and provides query functions
 */
contract ScoreBoard is IScoreBoard, Owned {
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

    event RecorderAuthorized(address indexed recorder, bool authorized);
    event ScoreRecorded(
        uint256 indexed matchId,
        address indexed winner,
        uint256 totalWins,
        uint256 totalPrize
    );

    error UnauthorizedRecorder();
    error MatchAlreadyRecorded();

    constructor(address _owner) Owned(_owner) {}

    /**
     * @notice Authorize or revoke a contract's ability to record scores
     * @param recorder Address of the recorder contract
     * @param authorized Whether to authorize or revoke
     */
    function setRecorderAuthorization(address recorder, bool authorized) external onlyOwner {
        authorizedRecorders[recorder] = authorized;
        emit RecorderAuthorized(recorder, authorized);
    }

    /// @inheritdoc IScoreBoard
    function recordMatchResult(
        uint256 matchId,
        address winner,
        address[] calldata losers,
        uint256 prize
    ) external {
        if (!authorizedRecorders[msg.sender]) revert UnauthorizedRecorder();
        if (_matchRecords[matchId].timestamp != 0) revert MatchAlreadyRecorded();

        // Record match
        _matchRecords[matchId] = MatchRecord({
            matchId: matchId,
            winner: winner,
            losers: losers,
            prize: prize,
            timestamp: block.timestamp
        });
        _matchIds.push(matchId);

        // Update winner score
        PlayerScore storage winnerScore = _scores[winner];
        if (winnerScore.totalWins == 0 && _playerIndex[winner] == 0) {
            _players.push(winner);
            _playerIndex[winner] = _players.length;
        }
        winnerScore.player = winner;
        winnerScore.totalWins++;
        winnerScore.totalPrize += prize;
        winnerScore.lastMatchId = matchId;
        winnerScore.lastWinTimestamp = block.timestamp;

        // Track losers (for participation tracking)
        for (uint256 i = 0; i < losers.length; i++) {
            if (_scores[losers[i]].totalWins == 0 && _playerIndex[losers[i]] == 0) {
                _players.push(losers[i]);
                _playerIndex[losers[i]] = _players.length;
                _scores[losers[i]].player = losers[i];
            }
        }

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
}
