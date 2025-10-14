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

    // Optional integrations
    IScoreBoard public scoreBoard;

    error InvalidStakeAmount();
    error InvalidMaxPlayers();
    error InvalidMatchId();
    error InvalidMatchStatus();
    error MaxPlayersReached();
    error InsufficientStake();
    error NotAPlayer();
    error NoStakeToWithdraw();
    error InvalidWinner();

    constructor(
        address _owner,
        address _controller
    ) FeatureController(_owner, _controller) {}

    /**
     * @notice Set the scoreboard contract
     * @param _scoreBoard Address of the scoreboard contract
     */
    function setScoreBoard(address _scoreBoard) external onlyOwner {
        scoreBoard = IScoreBoard(_scoreBoard);
    }

    /// @inheritdoc IGameMatch
    function createMatch(
        address token,
        uint256 stakeAmount,
        uint256 maxPlayers
    ) external payable returns (uint256 matchId) {
        if (stakeAmount == 0) revert InvalidStakeAmount();
        if (maxPlayers < 2) revert InvalidMaxPlayers();

        matchId = _matchIdCounter++;
        Match storage newMatch = _matches[matchId];
        newMatch.token = token;
        newMatch.stakeAmount = stakeAmount;
        newMatch.maxPlayers = maxPlayers;
        newMatch.status = MatchStatus.Open;

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
            address winner
        )
    {
        Match storage m = _matches[matchId];
        return (m.token, m.stakeAmount, m.maxPlayers, m.players, m.status, m.winner);
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
