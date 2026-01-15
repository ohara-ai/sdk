// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {IFeature} from "../../interfaces/IFeature.sol";
import {IHeap} from "../../interfaces/game/IHeap.sol";
import {IPrediction} from "../../interfaces/game/IPrediction.sol";
import {IScore} from "../../interfaces/game/IScore.sol";
import {IShares} from "../../interfaces/game/IShares.sol";
import {FeatureController} from "../../base/FeatureController.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/**
 * @title Heap
 * @notice Token collection system that emits events for in-game consumption
 * @dev Allows users to contribute tokens to a heap, with controller-managed activation and finalization
 */
contract Heap is IHeap, IShares, IFeature, FeatureController, Initializable {
    using SafeERC20 for IERC20;
    
    uint256 private _heapIdCounter;
    mapping(uint256 => Heap) private _heaps;
    
    // Heap tracking for capacity management
    uint256[] private _activeHeapIds;
    mapping(uint256 => uint256) private _heapIdIndex; // heapId => index in _activeHeapIds (1-based, 0 = not in array)
    
    // Capacity limits
    uint256 public maxActiveHeaps;
    uint256 public constant ABSOLUTE_MAX_ACTIVE_HEAPS = 10000;
    uint256 public constant MAX_CONTRIBUTIONS_LIMIT = 1000;
    uint256 public constant MAX_CONTRIBUTION_AMOUNT = 1000000 ether;

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

    event MaxActiveHeapsUpdated(uint256 newLimit);
    event InactiveHeapCleaned(uint256 indexed heapId, uint256 createdAt);
    event ScoreContractUpdated(address indexed previousScore, address indexed newScore);
    event PredictionContractUpdated(address indexed previousPrediction, address indexed newPrediction);
    event ExternalCallFailed(string indexed target, bytes reason);

    error InvalidContributionAmount();
    error InvalidMaxContributions();
    error InvalidHeapId();
    error InvalidHeapStatus();
    error MaxContributionsReached();
    error InsufficientContribution();
    error NotAContributor();
    error NoContributionToWithdraw();
    error InvalidWinner();
    error MaxActiveHeapsReached();
    error HeapNotInactive();
    error InvalidTokenAddress();
    error ContributionAmountTooHigh();
    error TooManyContributions();
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
     * @notice Initialize the Heap contract (replaces constructor for clones)
     * @param _owner Owner address
     * @param _controller Controller address
     * @param _score Score contract address
     * @param _maxActiveHeaps Maximum active heaps
     * @param _feeRecipients Fee recipient addresses
     * @param _feeShares Fee shares in basis points
     */
    function initialize(
        address _owner,
        address _controller,
        address _score,
        uint256 _maxActiveHeaps,
        address[] memory _feeRecipients,
        uint256[] memory _feeShares
    ) external initializer {
        // Initialize FeatureController (sets owner and controller)
        _initializeFeatureController(_owner, _controller);
        
        // Initialize score if provided
        if (_score != address(0)) {
            score = IScore(_score);
        }
        
        // Set capacity limit
        maxActiveHeaps = _maxActiveHeaps;
        
        // Initialize fees if provided
        if (_feeRecipients.length > 0) {
            _initializeFees(_feeRecipients, _feeShares);
        }
    }

    /**
     * @notice Set the score contract for heap result recording
     * @param _score Address of the score contract (address(0) to disable)
     * @dev Score contract will receive heap results for tracking contributor statistics
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
     * @dev Prediction contract will be notified when heaps are activated
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
     * @notice Set the maximum number of active heaps
     * @param _maxActiveHeaps Maximum number of active heaps (0 = unlimited)
     * @dev Prevents state explosion by limiting concurrent heaps
     */
    function setMaxActiveHeaps(uint256 _maxActiveHeaps) external onlyOwner {
        if (_maxActiveHeaps > ABSOLUTE_MAX_ACTIVE_HEAPS) revert LimitTooHigh();
        maxActiveHeaps = _maxActiveHeaps;
        emit MaxActiveHeapsUpdated(_maxActiveHeaps);
    }

    /**
     * @notice Clean up old inactive (Open status) heaps
     * @param heapId The ID of the heap to clean up
     * @dev Can only clean up heaps that are still in Open status and have no contributors
     */
    function cleanupInactiveHeap(uint256 heapId) external onlyOwner {
        Heap storage h = _heaps[heapId];
        if (h.contributionAmount == 0) revert InvalidHeapId();
        if (h.status != HeapStatus.Open) revert HeapNotInactive();
        if (h.contributors.length > 0) revert HeapNotInactive(); // Has contributors
        
        uint256 createdAt = h.createdAt;
        
        // Remove from active tracking
        _removeFromActiveHeaps(heapId);
        
        // Clean up heap data
        _cleanupHeap(heapId);
        
        emit InactiveHeapCleaned(heapId, createdAt);
    }

    /**
     * @notice Get current number of active heaps
     * @return Number of heaps being tracked (Open or Active status)
     */
    function getActiveHeapCount() external view returns (uint256) {
        return _activeHeapIds.length;
    }

    /**
     * @notice Get list of active heap IDs
     * @param offset Starting index
     * @param limit Maximum number of IDs to return
     * @return heapIds Array of heap IDs
     */
    function getActiveHeapIds(uint256 offset, uint256 limit) external view returns (uint256[] memory heapIds) {
        uint256 total = _activeHeapIds.length;
        if (offset >= total) {
            return new uint256[](0);
        }
        
        uint256 count = limit;
        if (offset + limit > total) {
            count = total - offset;
        }
        
        heapIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            heapIds[i] = _activeHeapIds[offset + i];
        }
    }

    function _addToActiveHeaps(uint256 heapId) internal {
        _activeHeapIds.push(heapId);
        _heapIdIndex[heapId] = _activeHeapIds.length; // 1-based index
    }

    function _removeFromActiveHeaps(uint256 heapId) internal {
        uint256 index = _heapIdIndex[heapId];
        if (index == 0) return; // Not in array
        
        uint256 arrayIndex = index - 1; // Convert to 0-based
        uint256 lastHeapId = _activeHeapIds[_activeHeapIds.length - 1];
        
        // Move last element to the position of element to remove
        _activeHeapIds[arrayIndex] = lastHeapId;
        _heapIdIndex[lastHeapId] = index; // Update index of moved element
        
        // Remove last element
        _activeHeapIds.pop();
        delete _heapIdIndex[heapId];
    }

    /// @inheritdoc IHeap
    function create(
        address token,
        uint256 contributionAmount,
        uint256 maxContributions
    ) external payable nonReentrant returns (uint256 heapId) {
        if (contributionAmount == 0) revert InvalidContributionAmount();
        if (contributionAmount > MAX_CONTRIBUTION_AMOUNT) revert ContributionAmountTooHigh();
        if (maxContributions < 2) revert InvalidMaxContributions();
        if (maxContributions > MAX_CONTRIBUTIONS_LIMIT) revert TooManyContributions();
        
        // Validate token is a contract if not native token
        if (token != address(0) && token.code.length == 0) revert InvalidTokenAddress();
        
        // Check capacity limit
        if (maxActiveHeaps > 0 && _activeHeapIds.length >= maxActiveHeaps) {
            revert MaxActiveHeapsReached();
        }

        heapId = _heapIdCounter++;
        Heap storage newHeap = _heaps[heapId];
        newHeap.token = token;
        newHeap.contributionAmount = contributionAmount;
        newHeap.maxContributions = maxContributions;
        newHeap.status = HeapStatus.Open;
        newHeap.createdAt = block.timestamp;
        
        // Add to active heaps tracking
        _addToActiveHeaps(heapId);

        emit HeapCreated(heapId, msg.sender, token, contributionAmount, maxContributions);

        // Creator contributes to the heap
        _contribute(heapId, msg.sender);
    }

    /// @inheritdoc IHeap
    function contribute(uint256 heapId) external payable nonReentrant {
        _contribute(heapId, msg.sender);
    }

    function _contribute(uint256 heapId, address contributor) internal {
        Heap storage h = _heaps[heapId];
        if (h.contributionAmount == 0) revert InvalidHeapId();
        if (h.status != HeapStatus.Open) revert InvalidHeapStatus();
        if (h.contributors.length >= h.maxContributions) revert MaxContributionsReached();

        // Handle contribution
        if (h.token == address(0)) {
            // Native token
            if (msg.value != h.contributionAmount) revert InsufficientContribution();
        } else {
            // ERC20 token
            if (msg.value != 0) revert InsufficientContribution();
            // Transfer tokens from contributor using SafeERC20
            IERC20(h.token).safeTransferFrom(contributor, address(this), h.contributionAmount);
        }

        // Only add to contributors array if this is their first contribution
        if (h.contributions[contributor] == 0) {
            h.contributors.push(contributor);
        }
        h.contributions[contributor] += h.contributionAmount;

        emit ContributionAdded(heapId, contributor, h.contributionAmount, h.contributors.length);
    }

    /// @inheritdoc IHeap
    function withdraw(uint256 heapId) external nonReentrant {
        Heap storage h = _heaps[heapId];
        if (h.contributionAmount == 0) revert InvalidHeapId();
        if (h.status != HeapStatus.Open) revert InvalidHeapStatus();

        uint256 contribution = h.contributions[msg.sender];
        if (contribution == 0) revert NoContributionToWithdraw();

        // Remove contributor from array
        address[] storage contributors = h.contributors;
        uint256 length = contributors.length;
        for (uint256 i = 0; i < length;) {
            if (contributors[i] == msg.sender) {
                contributors[i] = contributors[length - 1];
                contributors.pop();
                break;
            }
            unchecked { ++i; }
        }

        // Update state before external call (CEI pattern)
        h.contributions[msg.sender] = 0;
        
        bool shouldCancel = h.contributors.length == 0;
        if (shouldCancel) {
            h.status = HeapStatus.Cancelled;
            _removeFromActiveHeaps(heapId);
        }

        // External call last
        _transfer(h.token, msg.sender, contribution);

        emit ContributionWithdrawn(heapId, msg.sender, contribution);

        if (shouldCancel) {
            emit HeapCancelled(heapId, new address[](0), 0);
            _cleanupHeap(heapId);
        }
    }

    /// @inheritdoc IHeap
    function activate(uint256 heapId) external onlyController {
        Heap storage h = _heaps[heapId];
        if (h.contributionAmount == 0) revert InvalidHeapId();
        if (h.status != HeapStatus.Open) revert InvalidHeapStatus();
        if (h.contributors.length < 1) revert InvalidHeapStatus();

        h.status = HeapStatus.Active;

        // Notify prediction contract to close betting (if configured)
        if (address(prediction) != address(0)) {
            prediction.onCompetitionStarted(IPrediction.CompetitionType.Match, heapId);
        }

        emit HeapActivated(heapId, h.contributors);
    }

    /// @inheritdoc IHeap
    function finalize(uint256 heapId, address winner) external onlyController nonReentrant {
        Heap storage h = _heaps[heapId];
        if (h.contributionAmount == 0) revert InvalidHeapId();
        if (h.status != HeapStatus.Active) revert InvalidHeapStatus();

        // Handle tied/no-winner case (winner = address(0))
        if (winner == address(0)) {
            _cancelHeapInternal(heapId);
            return;
        }

        if (h.contributions[winner] == 0) revert InvalidWinner();

        // Cache values for gas optimization
        uint256 contributionAmount = h.contributionAmount;
        uint256 contributorsCount = h.contributors.length;
        address token = h.token;
        
        // Update state first (CEI pattern)
        h.status = HeapStatus.Finalized;
        h.winner = winner;
        _removeFromActiveHeaps(heapId);

        uint256 totalPrize = contributionAmount * contributorsCount;
        
        // Accrue fees using pull-over-push pattern
        uint256 feeAmount = _accrueFees(token, totalPrize);
        
        // Accrue shares for registered recipients (e.g., Prize contract)
        uint256 shareAmount = _accrueShares(token, totalPrize);
        
        uint256 winnerAmount = totalPrize - feeAmount - shareAmount;

        // Transfer winnings to winner (external call)
        _transfer(token, winner, winnerAmount);

        // Record result in score if configured
        if (address(score) != address(0)) {
            address[] memory losers = new address[](contributorsCount - 1);
            uint256 loserIndex;
            uint256 length = h.contributors.length;
            for (uint256 i = 0; i < length;) {
                if (h.contributors[i] != winner) {
                    losers[loserIndex] = h.contributors[i];
                    unchecked { ++loserIndex; }
                }
                unchecked { ++i; }
            }
            // Use try-catch to prevent DoS from buggy score contracts
            try score.recordMatchResult(winner, losers, winnerAmount, token) {
                // Score recorded successfully
            } catch (bytes memory reason) {
                emit ExternalCallFailed("Score.recordMatchResult", reason);
            }
        }

        emit HeapFinalized(heapId, winner, totalPrize, winnerAmount);

        // Notify prediction contract of finalization (before cleanup)
        if (address(prediction) != address(0)) {
            try prediction.onCompetitionFinalized(
                IPrediction.CompetitionType.Match,
                heapId,
                winner,
                false // not voided
            ) {
                // Prediction notified successfully
            } catch (bytes memory reason) {
                emit ExternalCallFailed("Prediction.onCompetitionFinalized", reason);
            }
        }

        // Clean up heap data
        _cleanupHeap(heapId);
    }

    /// @inheritdoc IHeap
    function cancel(uint256 heapId) external onlyController nonReentrant {
        Heap storage h = _heaps[heapId];
        if (h.contributionAmount == 0) revert InvalidHeapId();
        if (h.status != HeapStatus.Active) revert InvalidHeapStatus();

        _cancelHeapInternal(heapId);
    }

    /**
     * @dev Internal cancel logic. Must only be called from nonReentrant functions.
     * This function is protected by the caller's nonReentrant modifier.
     */
    function _cancelHeapInternal(uint256 heapId) internal {
        Heap storage h = _heaps[heapId];
        
        h.status = HeapStatus.Cancelled;
        
        uint256 refundAmount = h.contributionAmount;
        address[] memory contributors = h.contributors;
        
        // Refund all contributors their contributions
        uint256 length = contributors.length;
        for (uint256 i = 0; i < length;) {
            address contributor = contributors[i];
            uint256 contribution = h.contributions[contributor];
            if (contribution > 0) {
                _transfer(h.token, contributor, contribution);
            }
            unchecked { ++i; }
        }
        
        emit HeapCancelled(heapId, contributors, refundAmount);
        
        // Notify prediction contract of cancellation (before cleanup)
        if (address(prediction) != address(0)) {
            try prediction.onCompetitionFinalized(
                IPrediction.CompetitionType.Match,
                heapId,
                address(0), // no winner
                true // voided
            ) {
                // Prediction notified successfully
            } catch (bytes memory reason) {
                emit ExternalCallFailed("Prediction.onCompetitionFinalized", reason);
            }
        }
        
        // Remove from active heaps tracking
        _removeFromActiveHeaps(heapId);
        
        // Clean up heap data to save gas
        _cleanupHeap(heapId);
    }

    function _cleanupHeap(uint256 heapId) internal {
        Heap storage h = _heaps[heapId];
        address[] memory contributors = h.contributors;
        
        // Clean up contributions mapping for all contributors
        uint256 length = contributors.length;
        for (uint256 i = 0; i < length;) {
            delete h.contributions[contributors[i]];
            unchecked { ++i; }
        }
        
        // Delete the entire heap struct (resets all fields to default values)
        delete _heaps[heapId];
    }

    /// @inheritdoc IHeap
    function getHeap(
        uint256 heapId
    )
        external
        view
        returns (
            address token,
            uint256 contributionAmount,
            uint256 maxContributions,
            address[] memory contributors,
            HeapStatus status,
            address winner,
            uint256 createdAt
        )
    {
        Heap storage h = _heaps[heapId];
        return (h.token, h.contributionAmount, h.maxContributions, h.contributors, h.status, h.winner, h.createdAt);
    }

    /// @inheritdoc IHeap
    function getContribution(uint256 heapId, address contributor) external view returns (uint256) {
        return _heaps[heapId].contributions[contributor];
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
        return "Heap - OCI-002";
    }
}
