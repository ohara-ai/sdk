// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {IFeature} from "../../interfaces/IFeature.sol";
import {IMatch} from "../../interfaces/game/IMatch.sol";
import {IPrediction} from "../../interfaces/game/IPrediction.sol";
import {IScore} from "../../interfaces/game/IScore.sol";
import {IShares} from "../../interfaces/game/IShares.sol";
import {FeatureController} from "../../base/FeatureController.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/**
 * @title Match
 * @notice Escrow-based match system with stake management
 * @dev Allows players to create/join matches, with controller-managed activation and finalization
 */
contract Match is IMatch, IShares, IFeature, FeatureController, Initializable {
    using SafeERC20 for IERC20;
    
    uint256 private _matchIdCounter;
    mapping(uint256 => Match) private _matches;
    
    // Match tracking for capacity management
    uint256[] private _activeMatchIds;
    mapping(uint256 => uint256) private _matchIdIndex; // matchId => index in _activeMatchIds (1-based, 0 = not in array)
    
    // Capacity limits
    uint256 public maxActiveMatches;
    uint256 public constant ABSOLUTE_MAX_ACTIVE_MATCHES = 10000;
    uint256 public constant MAX_PLAYERS_LIMIT = 100;
    uint256 public constant MAX_STAKE_AMOUNT = 1000000 ether;

    // Optional integrations
    IScore public score;
    IPrediction public prediction;

    // Share recipients: recipient => shareBasisPoints
    mapping(address => uint256) private _shareRecipients;
    address[] private _shareRecipientList;
    uint256 public totalShareBasisPoints;
    
    // Pending shares: recipient => token => amount
    mapping(address => mapping(address => uint256)) private _pendingShares;
    
    // Token tracking for share iteration
    address[] private _shareTokens;
    mapping(address => bool) private _shareTokenExists;
    
    // Constants for shares
    uint256 public constant MAX_SHARE_RECIPIENTS = 10;
    uint256 public constant MAX_SHARE_BASIS_POINTS = 5000; // 50%

    event MaxActiveMatchesUpdated(uint256 newLimit);
    event InactiveMatchCleaned(uint256 indexed matchId, uint256 createdAt);
    event ScoreContractUpdated(address indexed previousScore, address indexed newScore);
    event PredictionContractUpdated(address indexed previousPrediction, address indexed newPrediction);
    event ExternalCallFailed(string indexed target, bytes reason);

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
    error InvalidTokenAddress();
    error PlayerAlreadyJoined();
    error StakeAmountTooHigh();
    error TooManyPlayers();
    error LimitTooHigh();
    error InvalidShareRecipient();
    error ShareRecipientAlreadyExists();
    error ShareRecipientNotFound();
    error TooManyShareRecipients();
    error ShareExceedsMax();
    error NoSharesToClaim();

    /**
     * @notice Empty constructor for cloneable pattern
     * @dev Calls parent with zero addresses. The initializer modifier prevents re-initialization.
     */
    constructor() FeatureController(address(0), address(0)) {}

    /**
     * @notice Initialize the Match contract (replaces constructor for clones)
     * @param _owner Owner address
     * @param _controller Controller address
     * @param _score Score contract address
     * @param _maxActiveMatches Maximum active matches
     * @param _feeRecipients Fee recipient addresses
     * @param _feeShares Fee shares in basis points
     */
    function initialize(
        address _owner,
        address _controller,
        address _score,
        uint256 _maxActiveMatches,
        address[] memory _feeRecipients,
        uint256[] memory _feeShares
    ) external initializer {
        // Initialize FeatureController (sets owner and controller)
        _initializeFeatureController(_owner, _controller);
        
        // Initialize gamescore if provided
        if (_score != address(0)) {
            score = IScore(_score);
        }
        
        // Set capacity limit
        maxActiveMatches = _maxActiveMatches;
        
        // Initialize fees if provided
        if (_feeRecipients.length > 0) {
            _initializeFees(_feeRecipients, _feeShares);
        }
    }

    /**
     * @notice Set the score contract for match result recording
     * @param _score Address of the score contract (address(0) to disable)
     * @dev Score contract will receive match results for tracking player statistics
     */
    function setScore(address _score) external onlyController {
        // Allow address(0) to disable score tracking
        if (_score != address(0) && _score.code.length == 0) {
            revert InvalidTokenAddress();
        }
        address previousScore = address(score);
        score = IScore(_score);
        emit ScoreContractUpdated(previousScore, _score);
    }

    /**
     * @notice Set the prediction contract for automatic betting closure
     * @param _prediction Address of the prediction contract (address(0) to disable)
     * @dev Prediction contract will be notified when matches are activated
     */
    function setPrediction(address _prediction) external onlyController {
        if (_prediction != address(0) && _prediction.code.length == 0) {
            revert InvalidTokenAddress();
        }
        address previousPrediction = address(prediction);
        prediction = IPrediction(_prediction);
        emit PredictionContractUpdated(previousPrediction, _prediction);
    }

    /**
     * @notice Set the maximum number of active matches
     * @param _maxActiveMatches Maximum number of active matches (0 = unlimited)
     * @dev Prevents state explosion by limiting concurrent matches
     */
    function setMaxActiveMatches(uint256 _maxActiveMatches) external onlyOwner {
        if (_maxActiveMatches > ABSOLUTE_MAX_ACTIVE_MATCHES) revert LimitTooHigh();
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
        
        // Clean up match data (consistent with other cleanup paths)
        _cleanupMatch(matchId);
        
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

    /// @inheritdoc IMatch
    function create(
        address token,
        uint256 stakeAmount,
        uint256 maxPlayers
    ) external payable nonReentrant returns (uint256 matchId) {
        if (stakeAmount == 0) revert InvalidStakeAmount();
        if (stakeAmount > MAX_STAKE_AMOUNT) revert StakeAmountTooHigh();
        if (maxPlayers < 2) revert InvalidMaxPlayers();
        if (maxPlayers > MAX_PLAYERS_LIMIT) revert TooManyPlayers();
        
        // Validate token is a contract if not native token
        if (token != address(0) && token.code.length == 0) revert InvalidTokenAddress();
        
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

    /// @inheritdoc IMatch
    function join(uint256 matchId) external payable nonReentrant {
        _joinMatch(matchId, msg.sender);
    }

    function _joinMatch(uint256 matchId, address player) internal {
        Match storage m = _matches[matchId];
        if (m.stakeAmount == 0) revert InvalidMatchId();
        if (m.status != MatchStatus.Open) revert InvalidMatchStatus();
        if (m.players.length >= m.maxPlayers) revert MaxPlayersReached();
        if (m.stakes[player] > 0) revert PlayerAlreadyJoined();

        // Handle stake
        if (m.token == address(0)) {
            // Native token
            if (msg.value != m.stakeAmount) revert InsufficientStake();
        } else {
            // ERC20 token
            if (msg.value != 0) revert InsufficientStake();
            // Transfer tokens from player using SafeERC20
            IERC20(m.token).safeTransferFrom(player, address(this), m.stakeAmount);
        }

        m.players.push(player);
        m.stakes[player] = m.stakeAmount;

        emit PlayerJoined(matchId, player, m.stakeAmount);
    }

    /// @inheritdoc IMatch
    function leave(uint256 matchId) external nonReentrant {
        Match storage m = _matches[matchId];
        if (m.stakeAmount == 0) revert InvalidMatchId();
        if (m.status != MatchStatus.Open) revert InvalidMatchStatus();

        uint256 stake = m.stakes[msg.sender];
        if (stake == 0) revert NoStakeToWithdraw();

        // Remove player from array
        address[] storage players = m.players;
        uint256 length = players.length;
        for (uint256 i = 0; i < length;) {
            if (players[i] == msg.sender) {
                players[i] = players[length - 1];
                players.pop();
                break;
            }
            unchecked { ++i; }
        }

        // Update state before external call (CEI pattern)
        m.stakes[msg.sender] = 0;
        
        bool shouldCancel = m.players.length == 0;
        if (shouldCancel) {
            m.status = MatchStatus.Cancelled;
            _removeFromActiveMatches(matchId);
        }

        // External call last
        _transfer(m.token, msg.sender, stake);

        emit PlayerWithdrew(matchId, msg.sender, stake);

        if (shouldCancel) {
            emit MatchCancelled(matchId, new address[](0), 0);
            _cleanupMatch(matchId);
        }
    }

    /// @inheritdoc IMatch
    function activate(uint256 matchId) external onlyController {
        Match storage m = _matches[matchId];
        if (m.stakeAmount == 0) revert InvalidMatchId();
        if (m.status != MatchStatus.Open) revert InvalidMatchStatus();
        if (m.players.length < 2) revert InvalidMatchStatus();

        m.status = MatchStatus.Active;

        // Notify prediction contract to close betting (if configured)
        if (address(prediction) != address(0)) {
            prediction.onCompetitionStarted(IPrediction.CompetitionType.Match, matchId);
        }

        emit MatchActivated(matchId, m.players);
    }

    /// @inheritdoc IMatch
    function finalize(uint256 matchId, address winner) external onlyController nonReentrant {
        Match storage m = _matches[matchId];
        if (m.stakeAmount == 0) revert InvalidMatchId();
        if (m.status != MatchStatus.Active) revert InvalidMatchStatus();

        // Handle tied match case (winner = address(0))
        if (winner == address(0)) {
            _cancelMatchInternal(matchId);
            return;
        }

        if (m.stakes[winner] == 0) revert InvalidWinner();

        // Cache values for gas optimization
        uint256 stakeAmount = m.stakeAmount;
        uint256 playersCount = m.players.length;
        address token = m.token;
        
        // Update state first (CEI pattern)
        m.status = MatchStatus.Finalized;
        m.winner = winner;
        _removeFromActiveMatches(matchId);

        uint256 totalPrize = stakeAmount * playersCount;
        
        // Accrue fees using pull-over-push pattern
        uint256 feeAmount = _accrueFees(token, totalPrize);
        
        // Accrue shares for registered recipients (e.g., Prize contract)
        uint256 shareAmount = _accrueShares(token, totalPrize);
        
        uint256 winnerAmount = totalPrize - feeAmount - shareAmount;

        // Transfer winnings to winner (external call)
        _transfer(token, winner, winnerAmount);

        // Record result in gamescore if configured
        if (address(score) != address(0)) {
            address[] memory losers = new address[](playersCount - 1);
            uint256 loserIndex;
            uint256 length = m.players.length;
            for (uint256 i = 0; i < length;) {
                if (m.players[i] != winner) {
                    losers[loserIndex] = m.players[i];
                    unchecked { ++loserIndex; }
                }
                unchecked { ++i; }
            }
            // Use try-catch to prevent DoS from buggy score contracts
            try score.recordMatchResult(winner, losers, winnerAmount) {
                // Score recorded successfully
            } catch (bytes memory reason) {
                emit ExternalCallFailed("Score.recordMatchResult", reason);
            }
        }

        emit MatchFinalized(matchId, winner, totalPrize, winnerAmount);

        // Clean up match data
        _cleanupMatch(matchId);
    }

    /// @inheritdoc IMatch
    function cancel(uint256 matchId) external onlyController nonReentrant {
        Match storage m = _matches[matchId];
        if (m.stakeAmount == 0) revert InvalidMatchId();
        if (m.status != MatchStatus.Active) revert InvalidMatchStatus();

        _cancelMatchInternal(matchId);
    }

    /**
     * @dev Internal cancel logic. Must only be called from nonReentrant functions.
     * This function is protected by the caller's nonReentrant modifier.
     */
    function _cancelMatchInternal(uint256 matchId) internal {
        Match storage m = _matches[matchId];
        
        m.status = MatchStatus.Cancelled;
        
        uint256 refundAmount = m.stakeAmount;
        address[] memory players = m.players;
        
        // Refund all players their stakes
        uint256 length = players.length;
        for (uint256 i = 0; i < length;) {
            address player = players[i];
            uint256 stake = m.stakes[player];
            if (stake > 0) {
                _transfer(m.token, player, stake);
            }
            unchecked { ++i; }
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
        
        // Clean up stakes mapping for all players
        uint256 length = players.length;
        for (uint256 i = 0; i < length;) {
            delete m.stakes[players[i]];
            unchecked { ++i; }
        }
        
        // Delete the entire match struct (resets all fields to default values)
        delete _matches[matchId];
    }

    /// @inheritdoc IMatch
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

    /// @inheritdoc IMatch
    function getPlayerStake(uint256 matchId, address player) external view returns (uint256) {
        return _matches[matchId].stakes[player];
    }

    // ============ IShares Implementation ============

    /// @inheritdoc IShares
    function registerShareRecipient(address recipient, uint256 shareBasisPoints) external onlyController {
        if (recipient == address(0)) revert InvalidShareRecipient();
        if (_shareRecipients[recipient] != 0) revert ShareRecipientAlreadyExists();
        if (_shareRecipientList.length >= MAX_SHARE_RECIPIENTS) revert TooManyShareRecipients();
        if (totalShareBasisPoints + shareBasisPoints > MAX_SHARE_BASIS_POINTS) revert ShareExceedsMax();
        
        _shareRecipientList.push(recipient);
        _shareRecipients[recipient] = shareBasisPoints;
        totalShareBasisPoints += shareBasisPoints;
        
        emit ShareRecipientRegistered(recipient, shareBasisPoints);
    }

    /// @inheritdoc IShares
    function removeShareRecipient(address recipient) external onlyController {
        uint256 shareBasisPoints = _shareRecipients[recipient];
        if (shareBasisPoints == 0) revert ShareRecipientNotFound();
        
        totalShareBasisPoints -= shareBasisPoints;
        
        // Remove from list using swap-and-pop
        uint256 length = _shareRecipientList.length;
        for (uint256 i = 0; i < length;) {
            if (_shareRecipientList[i] == recipient) {
                _shareRecipientList[i] = _shareRecipientList[length - 1];
                _shareRecipientList.pop();
                break;
            }
            unchecked { ++i; }
        }
        
        delete _shareRecipients[recipient];
        
        emit ShareRecipientRemoved(recipient);
    }

    /// @inheritdoc IShares
    function claimShares(address token) external nonReentrant {
        uint256 amount = _pendingShares[msg.sender][token];
        if (amount == 0) revert NoSharesToClaim();
        
        // Clear pending shares before transfer (CEI pattern)
        _pendingShares[msg.sender][token] = 0;
        
        // Transfer shares
        _transfer(token, msg.sender, amount);
        
        emit SharesClaimed(msg.sender, token, amount);
    }

    /// @inheritdoc IShares
    function getPendingShares(address recipient, address token) external view returns (uint256 amount) {
        return _pendingShares[recipient][token];
    }

    /// @inheritdoc IShares
    function getShareTokens() external view returns (address[] memory tokens) {
        return _shareTokens;
    }

    /// @inheritdoc IShares
    function getShareConfig(address recipient) external view returns (uint256 shareBasisPoints) {
        return _shareRecipients[recipient];
    }

    /**
     * @notice Get all share recipients
     * @return recipients Array of share recipient addresses
     * @return shares Array of share basis points for each recipient
     */
    function getShareRecipients() external view returns (address[] memory recipients, uint256[] memory shares) {
        uint256 length = _shareRecipientList.length;
        recipients = new address[](length);
        shares = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            recipients[i] = _shareRecipientList[i];
            shares[i] = _shareRecipients[_shareRecipientList[i]];
        }
    }

    /**
     * @notice Accrue shares from a total amount (pull-over-push pattern)
     * @param token The token address (address(0) for native token)
     * @param totalAmount The total amount to calculate shares from
     * @return shareAmount The total amount of shares accrued
     */
    function _accrueShares(
        address token,
        uint256 totalAmount
    ) internal returns (uint256 shareAmount) {
        if (totalShareBasisPoints == 0 || _shareRecipientList.length == 0) {
            return 0;
        }

        // Track token if new
        if (!_shareTokenExists[token]) {
            _shareTokens.push(token);
            _shareTokenExists[token] = true;
        }

        uint256 length = _shareRecipientList.length;
        for (uint256 i = 0; i < length;) {
            address recipient = _shareRecipientList[i];
            uint256 shareBps = _shareRecipients[recipient];
            
            uint256 share = (totalAmount * shareBps) / FEE_BASIS_POINTS;
            if (share == 0) {
                unchecked { ++i; }
                continue;
            }
            
            shareAmount += share;
            _pendingShares[recipient][token] += share;
            emit SharesAccrued(recipient, token, share);
            
            unchecked { ++i; }
        }
    }

    /// @inheritdoc IFeature
    function version() external pure returns (string memory) {
        return "1.0.0";
    }

    /// @inheritdoc IFeature
    function featureName() external pure returns (string memory) {
        return "Match - OCI-001";
    }
}
