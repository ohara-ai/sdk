// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {IFeature} from "../../interfaces/IFeature.sol";
import {IPrediction} from "../../interfaces/game/IPrediction.sol";
import {ITournament} from "../../interfaces/game/ITournament.sol";
import {FeatureController} from "../../base/FeatureController.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/**
 * @title Tournament
 * @notice Single elimination bracket management
 * @dev Receives match results from Score and advances winners through rounds
 */
contract Tournament is ITournament, IFeature, FeatureController, Initializable {
    uint256 private _idCounter;

    struct TournamentData {
        address[] participants;
        uint256 currentRound;
        uint256 totalRounds;
        TournamentStatus status;
        address winner;
        uint256 createdAt;
    }

    mapping(uint256 => TournamentData) private _tournaments;
    mapping(uint256 => mapping(uint256 => mapping(uint256 => BracketMatch))) private _bracket;
    mapping(uint256 => mapping(uint256 => uint256)) private _matchesPerRound;

    struct PendingMatch {
        uint256 tournamentId;
        uint256 round;
        uint256 matchIndex;
    }
    mapping(bytes32 => PendingMatch[]) private _pendingMatches;

    address public scoreContract;
    IPrediction public prediction;
    uint256 public maxActiveTournaments;

    uint256 public constant MAX_ACTIVE = 1000;
    uint256 public constant MAX_PARTICIPANTS = 64;

    uint256[] private _activeIds;
    mapping(uint256 => uint256) private _activeIndex;

    error InvalidParticipantCount();
    error InvalidTournamentId();
    error InvalidStatus();
    error InvalidRound();
    error InvalidMatchIndex();
    error InvalidWinner();
    error MatchAlreadyResolved();
    error UnauthorizedCaller();
    error MaxTournamentsReached();
    error LimitTooHigh();

    constructor() FeatureController(address(0), address(0)) {}

    function initialize(
        address _owner,
        address _controller,
        address _scoreContract,
        uint256 _maxActive
    ) external initializer {
        _initializeFeatureController(_owner, _controller);
        scoreContract = _scoreContract;
        maxActiveTournaments = _maxActive;
    }

    /**
     * @notice Set the score contract for match result tracking
     * @param _score Address of the score contract
     */
    function setScoreContract(address _score) external onlyController {
        address previousScore = scoreContract;
        scoreContract = _score;
        emit ScoreContractUpdated(previousScore, _score);
    }

    /**
     * @notice Set the prediction contract for automatic betting closure
     * @param _prediction Address of the prediction contract (address(0) to disable)
     */
    function setPrediction(address _prediction) external onlyController {
        prediction = IPrediction(_prediction);
    }

    /**
     * @notice Set the maximum number of active tournaments
     * @param _max Maximum number of active tournaments
     */
    function setMaxActiveTournaments(uint256 _max) external onlyOwner {
        if (_max > MAX_ACTIVE) revert LimitTooHigh();
        maxActiveTournaments = _max;
    }

    /// @inheritdoc ITournament
    function createTournament(
        address[] calldata participants
    ) external onlyController returns (uint256 id) {
        uint256 count = participants.length;
        if (count < 2 || count > MAX_PARTICIPANTS || !_isPowerOfTwo(count)) {
            revert InvalidParticipantCount();
        }
        if (maxActiveTournaments > 0 && _activeIds.length >= maxActiveTournaments) {
            revert MaxTournamentsReached();
        }

        id = _idCounter++;
        TournamentData storage t = _tournaments[id];
        t.participants = participants;
        t.totalRounds = _log2(count);
        t.status = TournamentStatus.Pending;
        t.createdAt = block.timestamp;

        _activeIds.push(id);
        _activeIndex[id] = _activeIds.length;

        emit TournamentCreated(id, participants, t.totalRounds);
    }

    /// @inheritdoc ITournament
    function activate(uint256 id) external onlyController {
        TournamentData storage t = _tournaments[id];
        if (t.participants.length == 0) revert InvalidTournamentId();
        if (t.status != TournamentStatus.Pending) revert InvalidStatus();

        t.status = TournamentStatus.Active;
        _initRound(id, 0, t.participants);

        // Notify prediction contract to close betting (if configured)
        if (address(prediction) != address(0)) {
            prediction.onCompetitionStarted(IPrediction.CompetitionType.Tournament, id);
        }

        emit TournamentActivated(id);
    }

    /// @inheritdoc ITournament
    function onMatchResult(address winner, address loser) external {
        if (msg.sender != scoreContract) revert UnauthorizedCaller();

        bytes32 key = _matchKey(winner, loser);
        PendingMatch[] storage pending = _pendingMatches[key];

        uint256 i = 0;
        while (i < pending.length) {
            PendingMatch memory p = pending[i];
            TournamentData storage t = _tournaments[p.tournamentId];

            if (t.status == TournamentStatus.Active) {
                BracketMatch storage m = _bracket[p.tournamentId][p.round][p.matchIndex];
                if (!m.resolved && _isParticipant(m, winner, loser)) {
                    _resolve(p.tournamentId, p.round, p.matchIndex, winner);
                    pending[i] = pending[pending.length - 1];
                    pending.pop();
                    continue;
                }
            }
            i++;
        }
    }

    /// @inheritdoc ITournament
    function resolveMatch(
        uint256 id,
        uint256 round,
        uint256 matchIndex,
        address winner
    ) external onlyController {
        TournamentData storage t = _tournaments[id];
        if (t.participants.length == 0) revert InvalidTournamentId();
        if (t.status != TournamentStatus.Active) revert InvalidStatus();
        if (round != t.currentRound) revert InvalidRound();
        if (matchIndex >= _matchesPerRound[id][round]) revert InvalidMatchIndex();

        BracketMatch storage m = _bracket[id][round][matchIndex];
        if (m.resolved) revert MatchAlreadyResolved();
        if (winner != m.player1 && winner != m.player2) revert InvalidWinner();

        _removePending(m.player1, m.player2, id, round, matchIndex);
        _resolve(id, round, matchIndex, winner);
    }

    /// @inheritdoc ITournament
    function cancel(uint256 id) external onlyController {
        TournamentData storage t = _tournaments[id];
        if (t.participants.length == 0) revert InvalidTournamentId();
        if (t.status != TournamentStatus.Pending && t.status != TournamentStatus.Active) {
            revert InvalidStatus();
        }

        if (t.status == TournamentStatus.Active) {
            _cleanupPending(id);
        }

        t.status = TournamentStatus.Cancelled;
        _removeActive(id);
        emit TournamentCancelled(id);
    }

    /// @inheritdoc ITournament
    function getTournament(uint256 id) external view returns (TournamentView memory) {
        TournamentData storage t = _tournaments[id];
        return TournamentView({
            participantCount: t.participants.length,
            currentRound: t.currentRound,
            totalRounds: t.totalRounds,
            status: t.status,
            winner: t.winner,
            createdAt: t.createdAt
        });
    }

    /// @inheritdoc ITournament
    function getParticipants(uint256 id) external view returns (address[] memory) {
        return _tournaments[id].participants;
    }

    /// @inheritdoc ITournament
    function getBracketMatch(
        uint256 id,
        uint256 round,
        uint256 matchIndex
    ) external view returns (BracketMatch memory) {
        return _bracket[id][round][matchIndex];
    }

    /// @inheritdoc ITournament
    function getRoundMatches(
        uint256 id,
        uint256 round
    ) external view returns (BracketMatch[] memory matches) {
        uint256 count = _matchesPerRound[id][round];
        matches = new BracketMatch[](count);
        for (uint256 i = 0; i < count; i++) {
            matches[i] = _bracket[id][round][i];
        }
    }

    /// @inheritdoc ITournament
    function hasPendingMatch(
        uint256 id,
        address p1,
        address p2
    ) external view returns (bool exists, uint256 round, uint256 matchIndex) {
        PendingMatch[] storage pending = _pendingMatches[_matchKey(p1, p2)];
        for (uint256 i = 0; i < pending.length; i++) {
            if (pending[i].tournamentId == id) {
                return (true, pending[i].round, pending[i].matchIndex);
            }
        }
    }

    function getActiveTournamentCount() external view returns (uint256) {
        return _activeIds.length;
    }

    // ============ Internal ============

    function _initRound(uint256 id, uint256 round, address[] memory players) internal {
        uint256 count = players.length / 2;
        _matchesPerRound[id][round] = count;

        for (uint256 i = 0; i < count; i++) {
            address p1 = players[i];
            address p2 = players[players.length - 1 - i];

            _bracket[id][round][i] = BracketMatch({
                player1: p1,
                player2: p2,
                winner: address(0),
                resolved: false
            });
            _addPending(p1, p2, id, round, i);
        }
    }

    function _resolve(uint256 id, uint256 round, uint256 matchIndex, address winner) internal {
        BracketMatch storage m = _bracket[id][round][matchIndex];
        address loser = m.player1 == winner ? m.player2 : m.player1;

        m.winner = winner;
        m.resolved = true;
        emit BracketMatchResolved(id, round, matchIndex, winner, loser);

        _checkRoundComplete(id, round);
    }

    function _checkRoundComplete(uint256 id, uint256 round) internal {
        uint256 count = _matchesPerRound[id][round];

        for (uint256 i = 0; i < count; i++) {
            if (!_bracket[id][round][i].resolved) return;
        }

        address[] memory winners = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            winners[i] = _bracket[id][round][i].winner;
        }

        emit RoundCompleted(id, round, winners);

        if (winners.length == 1) {
            TournamentData storage t = _tournaments[id];
            t.status = TournamentStatus.Finalized;
            t.winner = winners[0];
            _removeActive(id);
            emit TournamentFinalized(id, winners[0]);
        } else {
            _tournaments[id].currentRound = round + 1;
            _initRound(id, round + 1, winners);
        }
    }

    function _addPending(address p1, address p2, uint256 id, uint256 round, uint256 idx) internal {
        _pendingMatches[_matchKey(p1, p2)].push(PendingMatch({
            tournamentId: id,
            round: round,
            matchIndex: idx
        }));
    }

    function _removePending(address p1, address p2, uint256 id, uint256 round, uint256 idx) internal {
        bytes32 key = _matchKey(p1, p2);
        PendingMatch[] storage arr = _pendingMatches[key];
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i].tournamentId == id && arr[i].round == round && arr[i].matchIndex == idx) {
                arr[i] = arr[arr.length - 1];
                arr.pop();
                break;
            }
        }
    }

    function _cleanupPending(uint256 id) internal {
        TournamentData storage t = _tournaments[id];
        for (uint256 r = 0; r <= t.currentRound; r++) {
            uint256 count = _matchesPerRound[id][r];
            for (uint256 i = 0; i < count; i++) {
                BracketMatch storage m = _bracket[id][r][i];
                if (!m.resolved) {
                    _removePending(m.player1, m.player2, id, r, i);
                }
            }
        }
    }

    function _removeActive(uint256 id) internal {
        uint256 idx = _activeIndex[id];
        if (idx == 0) return;
        uint256 arrIdx = idx - 1;
        uint256 lastId = _activeIds[_activeIds.length - 1];
        _activeIds[arrIdx] = lastId;
        _activeIndex[lastId] = idx;
        _activeIds.pop();
        delete _activeIndex[id];
    }

    function _matchKey(address a, address b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }

    function _isParticipant(BracketMatch storage m, address a, address b) internal view returns (bool) {
        return (m.player1 == a && m.player2 == b) || (m.player1 == b && m.player2 == a);
    }

    function _isPowerOfTwo(uint256 n) internal pure returns (bool) {
        return n > 0 && (n & (n - 1)) == 0;
    }

    function _log2(uint256 n) internal pure returns (uint256 r) {
        while (n > 1) { n >>= 1; r++; }
    }

    /// @inheritdoc IFeature
    function version() external pure override returns (string memory) {
        return "2.0.0";
    }

    /// @inheritdoc IFeature
    function featureName() external pure override returns (string memory) {
        return "Tournament - OCI-005";
    }
}
