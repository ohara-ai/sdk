// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {IFeature} from "../../interfaces/IFeature.sol";
import {IMatch} from "../../interfaces/game/IMatch.sol";
import {ITournament} from "../../interfaces/game/ITournament.sol";
import {ILeague} from "../../interfaces/game/ILeague.sol";
import {IPrediction} from "../../interfaces/game/IPrediction.sol";
import {FeatureController} from "../../base/FeatureController.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Prediction
 * @notice Parimutuel winner prediction market with commit-reveal scheme
 * @dev Uses commit-reveal to prevent front-running of predictions
 */
contract Prediction is IPrediction, IFeature, FeatureController, Initializable {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    /// @notice Minimum time between commit and reveal phases
    uint256 public constant MIN_REVEAL_DELAY = 1 hours;
    
    /// @notice Maximum time to reveal after reveal phase starts
    uint256 public constant MAX_REVEAL_WINDOW = 24 hours;
    
    /// @notice Basis points for odds calculation (10000 = 1x)
    uint256 public constant ODDS_BASIS_POINTS = 10000;

    // ============ State ============

    IMatch public matchContract;
    ITournament public tournamentContract;
    ILeague public leagueContract;

    uint256 public nextMarketId = 1;

    /// @dev marketId => Market
    mapping(uint256 => Market) internal _markets;

    /// @dev marketId => predictor => Prediction
    mapping(uint256 => mapping(address => Prediction)) internal _predictions;
    
    /// @dev marketId => predictor => CommitData
    mapping(uint256 => mapping(address => CommitData)) internal _commits;

    /// @dev marketId => predictedPlayer => total staked
    mapping(uint256 => mapping(address => uint256)) internal _stakeByPlayer;

    /// @dev marketId => list of predicted players
    mapping(uint256 => address[]) internal _predictedPlayers;

    /// @dev marketId => player => bool (for deduplication)
    mapping(uint256 => mapping(address => bool)) internal _isPlayerPredicted;

    /// @dev marketId => list of predictors
    mapping(uint256 => address[]) internal _predictors;

    /// @dev competitionType => competitionId => marketId (0 = no market)
    mapping(CompetitionType => mapping(uint256 => uint256)) internal _competitionMarkets;
    
    /// @dev marketId => predictor => pending refund amount
    mapping(uint256 => mapping(address => uint256)) internal _pendingRefunds;

    // ============ Structs ============
    
    /// @notice Commit data for commit-reveal scheme
    struct CommitData {
        bytes32 commitHash;
        uint256 amount;
        uint256 commitTime;
        bool revealed;
    }

    // ============ Events ============
    
    event PredictionCommitted(uint256 indexed marketId, address indexed predictor, bytes32 commitHash, uint256 amount);
    event PredictionRevealed(uint256 indexed marketId, address indexed predictor, address indexed predictedPlayer, uint256 amount);
    event RevealFailed(uint256 indexed marketId, address indexed predictor, string reason);
    event RefundAvailable(uint256 indexed marketId, address indexed predictor, uint256 amount);

    // ============ Errors ============

    error MarketNotFound();
    error BettingIsClosed();
    error BettingStillOpen();
    error MarketAlreadyResolved();
    error CompetitionNotFinalized();
    error CompetitionNotFound();
    error AlreadyPredicted();
    error AlreadyCommitted();
    error NoCommitFound();
    error InvalidReveal();
    error RevealPhaseClosed();
    error RevealPhaseNotStarted();
    error NoPrediction();
    error AlreadyClaimed();
    error ZeroAmount();
    error ZeroAddress();
    error CompetitionTypeNotSupported();
    error InvalidTokenAddress();
    error InvalidStakeAmount();
    error NoRefundAvailable();

    // ============ Constructor & Initializer ============

    /**
     * @notice Empty constructor for cloneable pattern
     */
    constructor() FeatureController(address(0), address(0)) {}

    /**
     * @notice Initialize the Prediction contract
     * @param _owner Owner address
     * @param _controller Controller address
     * @param _match Address of the Match contract (optional)
     * @param _tournament Address of the Tournament contract (optional)
     * @param _league Address of the League contract (optional)
     * @param _feeRecipients Fee recipient addresses
     * @param _feeShares Fee shares in basis points
     */
    function initialize(
        address _owner,
        address _controller,
        address _match,
        address _tournament,
        address _league,
        address[] memory _feeRecipients,
        uint256[] memory _feeShares
    ) external initializer {
        _initializeFeatureController(_owner, _controller);

        // Competition contracts are optional - set only if provided
        if (_match != address(0)) {
            matchContract = IMatch(_match);
        }
        if (_tournament != address(0)) {
            tournamentContract = ITournament(_tournament);
        }
        if (_league != address(0)) {
            leagueContract = ILeague(_league);
        }

        // Initialize fees if provided
        if (_feeRecipients.length > 0) {
            _initializeFees(_feeRecipients, _feeShares);
        }
    }

    // ============ Market Creation ============

    /// @inheritdoc IPrediction
    function createMarket(
        CompetitionType competitionType,
        uint256 competitionId,
        address token
    ) external onlyController returns (uint256 marketId) {
        _validateCompetitionForBetting(competitionType, competitionId);

        // Validate token is a contract if not native
        if (token != address(0) && token.code.length == 0) revert InvalidTokenAddress();

        marketId = nextMarketId++;

        Market storage m = _markets[marketId];
        m.competitionType = competitionType;
        m.competitionId = competitionId;
        m.token = token;

        // Track market by competition for callback lookup
        _competitionMarkets[competitionType][competitionId] = marketId;

        emit MarketCreated(marketId, competitionType, competitionId, token);
    }

    /// @inheritdoc IPrediction
    function onCompetitionStarted(
        CompetitionType competitionType,
        uint256 competitionId
    ) external {
        // Only allow calls from the relevant source contract
        if (competitionType == CompetitionType.Match) {
            if (msg.sender != address(matchContract)) return;
        } else if (competitionType == CompetitionType.Tournament) {
            if (msg.sender != address(tournamentContract)) return;
        } else if (competitionType == CompetitionType.LeagueCycle) {
            if (msg.sender != address(leagueContract)) return;
        } else {
            return;
        }

        uint256 marketId = _competitionMarkets[competitionType][competitionId];
        if (marketId == 0) return; // No market for this competition

        Market storage market = _markets[marketId];
        if (market.bettingClosed || market.resolved || market.voided) return;

        market.bettingClosed = true;
        emit BettingClosed(marketId);
    }

    /// @inheritdoc IPrediction
    function onCompetitionFinalized(
        CompetitionType competitionType,
        uint256 competitionId,
        address winner,
        bool isVoided
    ) external {
        // Only allow calls from the relevant source contract
        if (competitionType == CompetitionType.Match) {
            if (msg.sender != address(matchContract)) return;
        } else if (competitionType == CompetitionType.Tournament) {
            if (msg.sender != address(tournamentContract)) return;
        } else if (competitionType == CompetitionType.LeagueCycle) {
            if (msg.sender != address(leagueContract)) return;
        } else {
            return;
        }

        uint256 marketId = _competitionMarkets[competitionType][competitionId];
        if (marketId == 0) return; // No market for this competition

        Market storage market = _markets[marketId];
        if (market.resolved || market.voided) return; // Already resolved

        // Close betting if not already closed
        if (!market.bettingClosed) {
            market.bettingClosed = true;
            emit BettingClosed(marketId);
        }

        if (isVoided) {
            market.voided = true;
            emit MarketVoided(marketId);
        } else {
            market.resolved = true;
            market.resolvedWinner = winner;
            emit MarketResolved(marketId, winner);
        }
    }

    /**
     * @dev Validate that competition exists and is in valid state for betting
     */
    function _validateCompetitionForBetting(
        CompetitionType compType,
        uint256 compId
    ) internal view {
        if (compType == CompetitionType.Match) {
            if (address(matchContract) == address(0)) revert CompetitionTypeNotSupported();
            (, , , , IMatch.MatchStatus status, , ) = matchContract.getMatch(compId);
            // Match must be Open (not yet started)
            if (status != IMatch.MatchStatus.Open) revert BettingIsClosed();

        } else if (compType == CompetitionType.Tournament) {
            if (address(tournamentContract) == address(0)) revert CompetitionTypeNotSupported();
            ITournament.TournamentView memory t = tournamentContract.getTournament(compId);
            if (t.participantCount == 0) revert CompetitionNotFound();
            if (t.status != ITournament.TournamentStatus.Pending) revert BettingIsClosed();

        } else if (compType == CompetitionType.LeagueCycle) {
            if (address(leagueContract) == address(0)) revert CompetitionTypeNotSupported();
            ILeague.Cycle memory c = leagueContract.getCycle(compId);
            if (c.status == ILeague.CycleStatus.Finalized) revert BettingIsClosed();
            if (c.status == ILeague.CycleStatus.Active) revert BettingIsClosed();
        }
    }

    // ============ Commit-Reveal Betting ============

    /**
     * @notice Commit a prediction (phase 1 of commit-reveal)
     * @param marketId Market ID to bet on
     * @param commitHash Hash of (predictedPlayer, salt) - keccak256(abi.encodePacked(player, salt))
     * @param amount Amount to stake (only used for ERC20, ignored for native)
     * @dev User must call reveal() after betting closes to finalize their prediction
     */
    function commit(uint256 marketId, bytes32 commitHash, uint256 amount) external payable nonReentrant {
        Market storage market = _markets[marketId];
        if (market.competitionId == 0) revert MarketNotFound();
        if (market.resolved || market.voided) revert MarketAlreadyResolved();
        if (_commits[marketId][msg.sender].amount > 0) revert AlreadyCommitted();

        // Determine stake amount based on token type
        uint256 stakeAmount;
        if (market.token == address(0)) {
            if (msg.value == 0) revert ZeroAmount();
            stakeAmount = msg.value;
        } else {
            if (amount == 0) revert ZeroAmount();
            if (msg.value != 0) revert InvalidStakeAmount();
            stakeAmount = amount;
        }

        // Check if commit phase is still open
        if (market.bettingClosed || _shouldCloseBetting(market)) {
            if (!market.bettingClosed) {
                market.bettingClosed = true;
                emit BettingClosed(marketId);
            }
            // Add to pending refunds instead of immediate refund
            _pendingRefunds[marketId][msg.sender] += msg.value;
            emit RefundAvailable(marketId, msg.sender, msg.value);
            return;
        }

        // Transfer tokens
        if (market.token != address(0)) {
            IERC20(market.token).safeTransferFrom(msg.sender, address(this), stakeAmount);
        }

        // Record commit
        _commits[marketId][msg.sender] = CommitData({
            commitHash: commitHash,
            amount: stakeAmount,
            commitTime: block.timestamp,
            revealed: false
        });

        _predictors[marketId].push(msg.sender);
        emit PredictionCommitted(marketId, msg.sender, commitHash, stakeAmount);
    }

    /**
     * @notice Reveal a committed prediction (phase 2 of commit-reveal)
     * @param marketId Market ID
     * @param predictedPlayer The player address that was committed
     * @param salt The salt used in the commit hash
     */
    function reveal(uint256 marketId, address predictedPlayer, bytes32 salt) external nonReentrant {
        if (predictedPlayer == address(0)) revert ZeroAddress();

        Market storage market = _markets[marketId];
        if (market.competitionId == 0) revert MarketNotFound();
        if (market.resolved || market.voided) revert MarketAlreadyResolved();

        CommitData storage commitData = _commits[marketId][msg.sender];
        if (commitData.amount == 0) revert NoCommitFound();
        if (commitData.revealed) revert AlreadyPredicted();

        // Verify the reveal matches the commit
        bytes32 expectedHash = keccak256(abi.encodePacked(predictedPlayer, salt));
        if (expectedHash != commitData.commitHash) revert InvalidReveal();

        // Mark as revealed
        commitData.revealed = true;

        // Record the actual prediction
        _predictions[marketId][msg.sender] = Prediction({
            predictedPlayer: predictedPlayer,
            amount: commitData.amount,
            claimed: false
        });

        market.totalPool += commitData.amount;
        _stakeByPlayer[marketId][predictedPlayer] += commitData.amount;

        // Track unique predicted players
        if (!_isPlayerPredicted[marketId][predictedPlayer]) {
            _isPlayerPredicted[marketId][predictedPlayer] = true;
            _predictedPlayers[marketId].push(predictedPlayer);
        }

        emit PredictionRevealed(marketId, msg.sender, predictedPlayer, commitData.amount);
        emit PredictionPlaced(marketId, msg.sender, predictedPlayer, commitData.amount);
    }

    /**
     * @notice Claim refund for unrevealed commits or failed predictions
     * @param marketId Market ID
     */
    function claimRefund(uint256 marketId) external nonReentrant {
        Market storage market = _markets[marketId];
        
        uint256 refundAmount = _pendingRefunds[marketId][msg.sender];
        
        // Check for unrevealed commits that can be refunded (after market voided/resolved)
        CommitData storage commitData = _commits[marketId][msg.sender];
        if (commitData.amount > 0 && !commitData.revealed) {
            // Can only claim unrevealed commit refund if market is voided
            if (market.voided) {
                refundAmount += commitData.amount;
                commitData.amount = 0;
            }
        }
        
        if (refundAmount == 0) revert NoRefundAvailable();
        
        _pendingRefunds[marketId][msg.sender] = 0;
        _transfer(market.token, msg.sender, refundAmount);
    }

    /// @inheritdoc IPrediction
    /// @dev Legacy function for direct predictions without commit-reveal protection
    function predict(uint256 marketId, address predictedPlayer, uint256 amount) external payable nonReentrant {
        Market storage market = _markets[marketId];
        if (market.competitionId == 0) revert MarketNotFound();
        if (market.resolved || market.voided) revert MarketAlreadyResolved();
        if (_predictions[marketId][msg.sender].amount > 0) revert AlreadyPredicted();

        uint256 stakeAmount;
        if (market.token == address(0)) {
            if (msg.value == 0) revert ZeroAmount();
            stakeAmount = msg.value;
        } else {
            if (amount == 0) revert ZeroAmount();
            if (msg.value != 0) revert InvalidStakeAmount();
            stakeAmount = amount;
        }

        if (market.bettingClosed || _shouldCloseBetting(market)) {
            if (!market.bettingClosed) {
                market.bettingClosed = true;
                emit BettingClosed(marketId);
            }
            _pendingRefunds[marketId][msg.sender] += msg.value;
            emit RefundAvailable(marketId, msg.sender, msg.value);
            return;
        }

        if (market.token != address(0)) {
            IERC20(market.token).safeTransferFrom(msg.sender, address(this), stakeAmount);
        }

        // Direct prediction (no commit-reveal protection)
        _predictions[marketId][msg.sender] = Prediction({
            predictedPlayer: predictedPlayer,
            amount: stakeAmount,
            claimed: false
        });

        market.totalPool += stakeAmount;
        _stakeByPlayer[marketId][predictedPlayer] += stakeAmount;

        if (!_isPlayerPredicted[marketId][predictedPlayer]) {
            _isPlayerPredicted[marketId][predictedPlayer] = true;
            _predictedPlayers[marketId].push(predictedPlayer);
        }

        _predictors[marketId].push(msg.sender);
        emit PredictionPlaced(marketId, msg.sender, predictedPlayer, stakeAmount);
    }
    
    /**
     * @notice Generate commit hash for a prediction
     * @param predictedPlayer The player to predict
     * @param salt Random bytes32 to use as salt
     * @return commitHash The hash to use for commit()
     */
    function generateCommitHash(address predictedPlayer, bytes32 salt) external pure returns (bytes32 commitHash) {
        return keccak256(abi.encodePacked(predictedPlayer, salt));
    }
    
    /**
     * @notice Get commit data for a predictor
     * @param marketId Market ID
     * @param predictor Predictor address
     * @return commitHash The commit hash
     * @return amount The committed amount
     * @return commitTime The commit timestamp
     * @return revealed Whether the commit has been revealed
     */
    function getCommit(uint256 marketId, address predictor) external view returns (
        bytes32 commitHash,
        uint256 amount,
        uint256 commitTime,
        bool revealed
    ) {
        CommitData storage c = _commits[marketId][predictor];
        return (c.commitHash, c.amount, c.commitTime, c.revealed);
    }

    /**
     * @notice Close betting for a market (controller only)
     * @param marketId Market ID to close betting for
     */
    function closeBetting(uint256 marketId) external onlyController {
        Market storage market = _markets[marketId];
        if (market.competitionId == 0) revert MarketNotFound();
        if (market.bettingClosed) return;

        market.bettingClosed = true;
        emit BettingClosed(marketId);
    }

    /**
     * @dev Check if betting should close based on competition state (view)
     */
    function _shouldCloseBetting(Market storage market) internal view returns (bool) {
        if (market.competitionType == CompetitionType.Match) {
            if (address(matchContract) == address(0)) return true;
            (, , , , IMatch.MatchStatus status, , ) = matchContract.getMatch(market.competitionId);
            // Betting closes when match is no longer Open
            return status != IMatch.MatchStatus.Open;

        } else if (market.competitionType == CompetitionType.Tournament) {
            if (address(tournamentContract) == address(0)) return true;
            ITournament.TournamentView memory t = tournamentContract.getTournament(
                market.competitionId
            );
            return t.status != ITournament.TournamentStatus.Pending;

        } else if (market.competitionType == CompetitionType.LeagueCycle) {
            if (address(leagueContract) == address(0)) return true;
            ILeague.Cycle memory c = leagueContract.getCycle(market.competitionId);
            return c.status != ILeague.CycleStatus.Registration;
        }

        return false;
    }

    // ============ Resolution ============

    /// @inheritdoc IPrediction
    function resolve(uint256 marketId) external {
        Market storage market = _markets[marketId];
        if (market.competitionId == 0) revert MarketNotFound();
        if (market.resolved || market.voided) revert MarketAlreadyResolved();

        // Close betting if it should be closed
        if (!market.bettingClosed) {
            if (_shouldCloseBetting(market)) {
                market.bettingClosed = true;
                emit BettingClosed(marketId);
            } else {
                revert BettingStillOpen();
            }
        }

        address winner;
        bool isVoided;

        if (market.competitionType == CompetitionType.Match) {
            if (address(matchContract) == address(0)) revert CompetitionTypeNotSupported();
            (, , , , IMatch.MatchStatus status, address matchWinner, ) = matchContract.getMatch(
                market.competitionId
            );
            if (status == IMatch.MatchStatus.Cancelled) {
                isVoided = true;
            } else {
                if (status != IMatch.MatchStatus.Finalized) revert CompetitionNotFinalized();
                winner = matchWinner;
            }

        } else if (market.competitionType == CompetitionType.Tournament) {
            if (address(tournamentContract) == address(0)) revert CompetitionTypeNotSupported();
            ITournament.TournamentView memory t = tournamentContract.getTournament(
                market.competitionId
            );
            if (t.status == ITournament.TournamentStatus.Cancelled) {
                isVoided = true;
            } else {
                if (t.status != ITournament.TournamentStatus.Finalized) {
                    revert CompetitionNotFinalized();
                }
                winner = t.winner;
            }

        } else if (market.competitionType == CompetitionType.LeagueCycle) {
            if (address(leagueContract) == address(0)) revert CompetitionTypeNotSupported();
            ILeague.Cycle memory c = leagueContract.getCycle(market.competitionId);
            if (c.status != ILeague.CycleStatus.Finalized) {
                revert CompetitionNotFinalized();
            }

            (address[] memory top, ) = leagueContract.getTopPlayers(
                market.competitionId,
                1
            );
            if (top.length == 0) {
                isVoided = true;
            } else {
                winner = top[0];
            }
        }

        if (isVoided) {
            market.voided = true;
            emit MarketVoided(marketId);
        } else {
            market.resolved = true;
            market.resolvedWinner = winner;
            emit MarketResolved(marketId, winner);
        }
    }

    // ============ Claiming ============

    /// @inheritdoc IPrediction
    function claim(uint256 marketId) external nonReentrant {
        Market storage market = _markets[marketId];
        Prediction storage pred = _predictions[marketId][msg.sender];

        if (market.competitionId == 0) revert MarketNotFound();
        if (pred.amount == 0) revert NoPrediction();
        if (pred.claimed) revert AlreadyClaimed();

        pred.claimed = true;

        // Voided: refund everyone
        if (market.voided) {
            _transfer(market.token, msg.sender, pred.amount);
            emit Claimed(marketId, msg.sender, pred.amount);
            return;
        }

        if (!market.resolved) revert CompetitionNotFinalized();

        bool isWinner = pred.predictedPlayer == market.resolvedWinner;

        if (isWinner) {
            uint256 winningPool = _stakeByPlayer[marketId][market.resolvedWinner];

            if (winningPool == 0) {
                // No one predicted the winner - refund
                _transfer(market.token, msg.sender, pred.amount);
                emit Claimed(marketId, msg.sender, pred.amount);
                return;
            }

            uint256 payout = (pred.amount * market.totalPool) / winningPool;
            _transfer(market.token, msg.sender, payout);
            emit Claimed(marketId, msg.sender, payout);
        }
        // Wrong prediction: no payout, already marked claimed
    }

    // ============ Views ============

    /// @inheritdoc IPrediction
    function isBettingOpen(uint256 marketId) external view returns (bool) {
        Market storage market = _markets[marketId];
        if (market.competitionId == 0) return false;
        if (market.bettingClosed || market.resolved || market.voided) return false;

        if (market.competitionType == CompetitionType.Match) {
            if (address(matchContract) == address(0)) return false;
            (, , , , IMatch.MatchStatus status, , ) = matchContract.getMatch(market.competitionId);
            return status == IMatch.MatchStatus.Open;

        } else if (market.competitionType == CompetitionType.Tournament) {
            if (address(tournamentContract) == address(0)) return false;
            ITournament.TournamentView memory t = tournamentContract.getTournament(
                market.competitionId
            );
            return t.status == ITournament.TournamentStatus.Pending;

        } else if (market.competitionType == CompetitionType.LeagueCycle) {
            if (address(leagueContract) == address(0)) return false;
            ILeague.Cycle memory c = leagueContract.getCycle(market.competitionId);
            return c.status == ILeague.CycleStatus.Registration;
        }

        return false;
    }

    /// @inheritdoc IPrediction
    function getMarket(uint256 marketId) external view returns (Market memory) {
        return _markets[marketId];
    }

    /// @inheritdoc IPrediction
    function getPrediction(
        uint256 marketId,
        address predictor
    ) external view returns (Prediction memory) {
        return _predictions[marketId][predictor];
    }

    /// @inheritdoc IPrediction
    function getStakeForPlayer(
        uint256 marketId,
        address player
    ) external view returns (uint256) {
        return _stakeByPlayer[marketId][player];
    }

    /// @inheritdoc IPrediction
    function getOddsForPlayer(
        uint256 marketId,
        address player
    ) external view returns (uint256) {
        Market storage market = _markets[marketId];
        uint256 playerStake = _stakeByPlayer[marketId][player];

        if (playerStake == 0 || market.totalPool == 0) return 0;

        return (market.totalPool * ODDS_BASIS_POINTS) / playerStake;
    }

    /// @inheritdoc IPrediction
    function getAllOdds(uint256 marketId) external view returns (PlayerOdds[] memory) {
        address[] memory players = _predictedPlayers[marketId];
        Market storage market = _markets[marketId];

        PlayerOdds[] memory odds = new PlayerOdds[](players.length);

        for (uint256 i = 0; i < players.length; i++) {
            uint256 stake = _stakeByPlayer[marketId][players[i]];
            odds[i] = PlayerOdds({
                player: players[i],
                totalStaked: stake,
                odds: market.totalPool > 0 && stake > 0
                    ? (market.totalPool * ODDS_BASIS_POINTS) / stake
                    : 0
            });
        }

        return odds;
    }

    /// @inheritdoc IPrediction
    function getPredictedPlayers(uint256 marketId) external view returns (address[] memory) {
        return _predictedPlayers[marketId];
    }

    /**
     * @notice Get all predictors for a market
     * @param marketId Market ID
     */
    function getPredictors(uint256 marketId) external view returns (address[] memory) {
        return _predictors[marketId];
    }

    /**
     * @notice Get market summary for UI display
     * @param marketId Market ID
     */
    function getMarketSummary(
        uint256 marketId
    )
        external
        view
        returns (
            CompetitionType competitionType,
            uint256 competitionId,
            uint256 totalPool,
            uint256 predictorCount,
            uint256 uniquePlayersCount,
            bool bettingOpen,
            bool resolved,
            address resolvedWinner
        )
    {
        Market storage m = _markets[marketId];

        competitionType = m.competitionType;
        competitionId = m.competitionId;
        totalPool = m.totalPool;
        predictorCount = _predictors[marketId].length;
        uniquePlayersCount = _predictedPlayers[marketId].length;
        bettingOpen = !m.bettingClosed && !m.resolved && !m.voided;
        resolved = m.resolved;
        resolvedWinner = m.resolvedWinner;
    }

    /**
     * @notice Check if a prediction was correct (after resolution)
     * @param marketId Market ID
     * @param predictor Predictor address
     */
    function isPredictionCorrect(
        uint256 marketId,
        address predictor
    ) external view returns (bool) {
        Market storage market = _markets[marketId];
        if (!market.resolved) return false;

        Prediction storage pred = _predictions[marketId][predictor];
        if (pred.amount == 0) return false;

        return pred.predictedPlayer == market.resolvedWinner;
    }

    /**
     * @notice Calculate potential payout for a prediction
     * @param marketId Market ID
     * @param predictor Predictor address
     */
    function getPotentialPayout(
        uint256 marketId,
        address predictor
    ) external view returns (uint256) {
        Market storage market = _markets[marketId];
        Prediction storage pred = _predictions[marketId][predictor];

        if (pred.amount == 0 || market.totalPool == 0) return 0;

        uint256 playerStake = _stakeByPlayer[marketId][pred.predictedPlayer];
        if (playerStake == 0) return 0;

        return (pred.amount * market.totalPool) / playerStake;
    }

    // ============ IFeature ============

    /// @inheritdoc IFeature
    function version() external pure override returns (string memory) {
        return "1.0.0";
    }

    /// @inheritdoc IFeature
    function featureName() external pure override returns (string memory) {
        return "Prediction - OCI-007";
    }

    /// @notice Receive ETH for native token predictions
    receive() external payable {}
}