// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IFeature} from "../../interfaces/IFeature.sol";
import {IGameMatch} from "../../interfaces/IGameMatch.sol";
import {IScoreBoard} from "../../interfaces/IScoreBoard.sol";
import {FeatureController} from "../../base/FeatureController.sol";

/**
 * @title GameMatch
 * @notice Escrow-based match system with stake management
 * @dev Allows players to create/join matches, with controller-managed activation and finalization
 */
contract GameMatch is IGameMatch, IFeature, FeatureController {
    uint256 private _matchIdCounter;
    mapping(uint256 => Match) private _matches;
    
    // Match tracking for capacity management
    uint256[] private _activeMatchIds;
    mapping(uint256 => uint256) private _matchIdIndex; // matchId => index in _activeMatchIds (1-based, 0 = not in array)
    
    // Capacity limits
    uint256 public maxActiveMatches;

    // Optional integrations
    IScoreBoard public scoreBoard;

    event MaxActiveMatchesUpdated(uint256 newLimit);
    event InactiveMatchCleaned(uint256 indexed matchId, uint256 createdAt);

    error InvalidStakeAmount();
    error InvalidMaxPlayers();
    error InvalidMatchId();
    error InvalidMatchStatus();
    error MaxPlayersReached();
    error InsufficientStake();
    error NotAPlayer();
    error NoStakeToWithdraw();
    error InvalidWinner();
    error MaxActiveMatchesReached();
    error MatchNotInactive();

    constructor(
        address _owner,
        address _controller,
        address _scoreBoard,
        uint256 _maxActiveMatches,
        address[] memory _feeRecipients,
        uint256[] memory _feeShares
    ) FeatureController(_owner, _controller) {
        // Initialize scoreboard if provided
        if (_scoreBoard != address(0)) {
            scoreBoard = IScoreBoard(_scoreBoard);
        }
        
        // Set capacity limit
        maxActiveMatches = _maxActiveMatches;
        
        // Initialize fees if provided
        if (_feeRecipients.length > 0) {
            _initializeFees(_feeRecipients, _feeShares);
        }
    }

    /**
     * @notice Set the scoreboard contract
     * @param _scoreBoard Address of the scoreboard contract
     */
    function setScoreBoard(address _scoreBoard) external onlyOwner {
        scoreBoard = IScoreBoard(_scoreBoard);
    }

    /**
     * @notice Set the maximum number of active matches
     * @param _maxActiveMatches Maximum number of active matches (0 = unlimited)
     */
    function setMaxActiveMatches(uint256 _maxActiveMatches) external onlyOwner {
        maxActiveMatches = _maxActiveMatches;
        emit MaxActiveMatchesUpdated(_maxActiveMatches);
    }

    /**
     * @notice Clean up old inactive (Open status) matches
     * @param matchId The ID of the match to clean up
     * @dev Can only clean up matches that are still in Open status and have no players
     */
    function cleanupInactiveMatch(uint256 matchId) external onlyOwner {
        Match storage m = _matches[matchId];
        if (m.stakeAmount == 0) revert InvalidMatchId();
        if (m.status != MatchStatus.Open) revert MatchNotInactive();
        if (m.players.length > 0) revert MatchNotInactive(); // Has players with stakes
        
        uint256 createdAt = m.createdAt;
        
        // Remove from active tracking
        _removeFromActiveMatches(matchId);
        
        // Delete match data
        delete _matches[matchId];
        
        emit InactiveMatchCleaned(matchId, createdAt);
    }

    /**
     * @notice Get current number of active matches
     * @return Number of matches being tracked (Open or Active status)
     */
    function getActiveMatchCount() external view returns (uint256) {
        return _activeMatchIds.length;
    }

    /**
     * @notice Get list of active match IDs
     * @param offset Starting index
     * @param limit Maximum number of IDs to return
     * @return matchIds Array of match IDs
     */
    function getActiveMatchIds(uint256 offset, uint256 limit) external view returns (uint256[] memory matchIds) {
        uint256 total = _activeMatchIds.length;
        if (offset >= total) {
            return new uint256[](0);
        }
        
        uint256 count = limit;
        if (offset + limit > total) {
            count = total - offset;
        }
        
        matchIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            matchIds[i] = _activeMatchIds[offset + i];
        }
    }

    function _addToActiveMatches(uint256 matchId) internal {
        _activeMatchIds.push(matchId);
        _matchIdIndex[matchId] = _activeMatchIds.length; // 1-based index
    }

    function _removeFromActiveMatches(uint256 matchId) internal {
        uint256 index = _matchIdIndex[matchId];
        if (index == 0) return; // Not in array
        
        uint256 arrayIndex = index - 1; // Convert to 0-based
        uint256 lastMatchId = _activeMatchIds[_activeMatchIds.length - 1];
        
        // Move last element to the position of element to remove
        _activeMatchIds[arrayIndex] = lastMatchId;
        _matchIdIndex[lastMatchId] = index; // Update index of moved element
        
        // Remove last element
        _activeMatchIds.pop();
        delete _matchIdIndex[matchId];
    }

    /// @inheritdoc IGameMatch
    function createMatch(
        address token,
        uint256 stakeAmount,
        uint256 maxPlayers
    ) external payable returns (uint256 matchId) {
        if (stakeAmount == 0) revert InvalidStakeAmount();
        if (maxPlayers < 2) revert InvalidMaxPlayers();
        
        // Check capacity limit
        if (maxActiveMatches > 0 && _activeMatchIds.length >= maxActiveMatches) {
            revert MaxActiveMatchesReached();
        }

        matchId = _matchIdCounter++;
        Match storage newMatch = _matches[matchId];
        newMatch.token = token;
        newMatch.stakeAmount = stakeAmount;
        newMatch.maxPlayers = maxPlayers;
        newMatch.status = MatchStatus.Open;
        newMatch.createdAt = block.timestamp;
        
        // Add to active matches tracking
        _addToActiveMatches(matchId);

        emit MatchCreated(matchId, msg.sender, token, stakeAmount, maxPlayers);

        // Creator joins the match
        _joinMatch(matchId, msg.sender);
    }

    /// @inheritdoc IGameMatch
    function joinMatch(uint256 matchId) external payable {
        _joinMatch(matchId, msg.sender);
    }

    function _joinMatch(uint256 matchId, address player) internal {
        Match storage m = _matches[matchId];
        if (m.stakeAmount == 0) revert InvalidMatchId();
        if (m.status != MatchStatus.Open) revert InvalidMatchStatus();
        if (m.players.length >= m.maxPlayers) revert MaxPlayersReached();
        if (m.stakes[player] > 0) revert InvalidMatchStatus(); // Already joined

        // Handle stake
        if (m.token == address(0)) {
            // Native token
            if (msg.value != m.stakeAmount) revert InsufficientStake();
        } else {
            // ERC20 token
            if (msg.value != 0) revert InsufficientStake();
            // Transfer tokens from player
            (bool success, bytes memory data) = m.token.call(
                abi.encodeWithSignature(
                    "transferFrom(address,address,uint256)",
                    player,
                    address(this),
                    m.stakeAmount
                )
            );
            if (!success || (data.length > 0 && !abi.decode(data, (bool)))) {
                revert TransferFailed();
            }
        }

        m.players.push(player);
        m.stakes[player] = m.stakeAmount;

        emit PlayerJoined(matchId, player, m.stakeAmount);
    }

    /// @inheritdoc IGameMatch
    function withdrawStake(uint256 matchId) external {
        Match storage m = _matches[matchId];
        if (m.stakeAmount == 0) revert InvalidMatchId();
        if (m.status != MatchStatus.Open) revert InvalidMatchStatus();

        uint256 stake = m.stakes[msg.sender];
        if (stake == 0) revert NoStakeToWithdraw();

        // Remove player from array
        address[] storage players = m.players;
        for (uint256 i = 0; i < players.length; i++) {
            if (players[i] == msg.sender) {
                players[i] = players[players.length - 1];
                players.pop();
                break;
            }
        }

        m.stakes[msg.sender] = 0;

        // Return stake
        _transfer(m.token, msg.sender, stake);

        emit PlayerWithdrew(matchId, msg.sender, stake);
    }

    /// @inheritdoc IGameMatch
    function activateMatch(uint256 matchId) external onlyController {
        Match storage m = _matches[matchId];
        if (m.stakeAmount == 0) revert InvalidMatchId();
        if (m.status != MatchStatus.Open) revert InvalidMatchStatus();
        if (m.players.length < 2) revert InvalidMatchStatus();

        m.status = MatchStatus.Active;

        emit MatchActivated(matchId, m.players);
    }

    /// @inheritdoc IGameMatch
    function finalizeMatch(uint256 matchId, address winner) external onlyController {
        Match storage m = _matches[matchId];
        if (m.stakeAmount == 0) revert InvalidMatchId();
        if (m.status != MatchStatus.Active) revert InvalidMatchStatus();

        // Handle tied match case (winner = address(0))
        if (winner == address(0)) {
            _cancelMatchInternal(matchId);
            return;
        }

        if (m.stakes[winner] == 0) revert InvalidWinner();

        m.status = MatchStatus.Finalized;
        m.winner = winner;

        uint256 totalPrize = m.stakeAmount * m.players.length;
        
        // Distribute fees using inherited FeeCollector functionality
        uint256 feeAmount = _distributeFees(m.token, totalPrize);
        uint256 winnerAmount = totalPrize - feeAmount;

        // Transfer winnings to winner
        _transfer(m.token, winner, winnerAmount);

        // Record result in scoreboard if configured
        if (address(scoreBoard) != address(0)) {
            address[] memory losers = new address[](m.players.length - 1);
            uint256 loserIndex = 0;
            for (uint256 i = 0; i < m.players.length; i++) {
                if (m.players[i] != winner) {
                    losers[loserIndex++] = m.players[i];
                }
            }
            scoreBoard.recordMatchResult(matchId, winner, losers, totalPrize);
        }

        emit MatchFinalized(matchId, winner, totalPrize, winnerAmount);
        
        // Remove from active matches tracking
        _removeFromActiveMatches(matchId);

        // Clean up match data to save gas
        _cleanupMatch(matchId);
    }

    /// @inheritdoc IGameMatch
    function cancelMatch(uint256 matchId) external onlyController {
        Match storage m = _matches[matchId];
        if (m.stakeAmount == 0) revert InvalidMatchId();
        if (m.status != MatchStatus.Active) revert InvalidMatchStatus();

        _cancelMatchInternal(matchId);
    }

    function _cancelMatchInternal(uint256 matchId) internal {
        Match storage m = _matches[matchId];
        
        m.status = MatchStatus.Cancelled;
        
        uint256 refundAmount = m.stakeAmount;
        address[] memory players = m.players;
        
        // Refund all players their stakes
        for (uint256 i = 0; i < players.length; i++) {
            address player = players[i];
            uint256 stake = m.stakes[player];
            if (stake > 0) {
                _transfer(m.token, player, stake);
            }
        }
        
        emit MatchCancelled(matchId, players, refundAmount);
        
        // Remove from active matches tracking
        _removeFromActiveMatches(matchId);
        
        // Clean up match data to save gas
        _cleanupMatch(matchId);
    }

    function _cleanupMatch(uint256 matchId) internal {
        Match storage m = _matches[matchId];
        address[] memory players = m.players;
        for (uint256 i = 0; i < players.length; i++) {
            delete m.stakes[players[i]];
        }
        delete m.players;
    }

    /// @inheritdoc IGameMatch
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
        )
    {
        Match storage m = _matches[matchId];
        return (m.token, m.stakeAmount, m.maxPlayers, m.players, m.status, m.winner, m.createdAt);
    }

    /// @inheritdoc IGameMatch
    function getPlayerStake(uint256 matchId, address player) external view returns (uint256) {
        return _matches[matchId].stakes[player];
    }

    /// @inheritdoc IFeature
    function version() external pure returns (string memory) {
        return "1.0.0";
    }

    /// @inheritdoc IFeature
    function featureName() external pure returns (string memory) {
        return "GameMatch - OCI-001";
    }
}
