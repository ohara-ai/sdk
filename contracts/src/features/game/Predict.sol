// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {IFeature} from "../../interfaces/IFeature.sol";
import {IPrize} from "../../interfaces/game/IPrize.sol";
import {IChallenge} from "../../interfaces/game/IChallenge.sol";
import {ILeague} from "../../interfaces/game/ILeague.sol";
import {IPredict} from "../../interfaces/game/IPredict.sol";
import {FeatureController} from "../../base/FeatureController.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/**
 * @title Predict
 * @notice Parimutuel winner prediction market for Prize pools, Challenges, and League cycles
 * @dev Betting closes automatically when competition leaves registration phase
 */
contract Predict is IPredict, IFeature, FeatureController, Initializable {
    // ============ State ============

    IPrize public prizeContract;
    IChallenge public challengeContract;
    ILeague public leagueContract;

    uint256 public nextMarketId = 1;

    /// @dev marketId => Market
    mapping(uint256 => Market) internal _markets;

    /// @dev marketId => predictor => Prediction
    mapping(uint256 => mapping(address => Prediction)) internal _predictions;

    /// @dev marketId => predictedPlayer => total staked
    mapping(uint256 => mapping(address => uint256)) internal _stakeByPlayer;

    /// @dev marketId => list of predicted players
    mapping(uint256 => address[]) internal _predictedPlayers;

    /// @dev marketId => player => bool (for deduplication)
    mapping(uint256 => mapping(address => bool)) internal _isPlayerPredicted;

    /// @dev marketId => list of predictors
    mapping(uint256 => address[]) internal _predictors;

    // ============ Errors ============

    error MarketNotFound();
    error BettingIsClosed();
    error BettingStillOpen();
    error MarketAlreadyResolved();
    error CompetitionNotFinalized();
    error CompetitionNotFound();
    error AlreadyPredicted();
    error NoPrediction();
    error AlreadyClaimed();
    error ZeroAmount();
    error ZeroAddress();

    // ============ Constructor & Initializer ============

    /**
     * @notice Empty constructor for cloneable pattern
     */
    constructor() FeatureController(address(0), address(0)) {}

    /**
     * @notice Initialize the Predict contract
     * @param _owner Owner address
     * @param _controller Controller address
     * @param _prize Address of the Prize contract
     * @param _challenge Address of the Challenge contract
     * @param _league Address of the League contract
     * @param _feeRecipients Fee recipient addresses
     * @param _feeShares Fee shares in basis points
     */
    function initialize(
        address _owner,
        address _controller,
        address _prize,
        address _challenge,
        address _league,
        address[] memory _feeRecipients,
        uint256[] memory _feeShares
    ) external initializer {
        _initializeFeatureController(_owner, _controller);
        prizeContract = IPrize(_prize);
        challengeContract = IChallenge(_challenge);
        leagueContract = ILeague(_league);

        // Initialize fees if provided
        if (_feeRecipients.length > 0) {
            _initializeFees(_feeRecipients, _feeShares);
        }
    }

    // ============ Market Creation ============

    /// @inheritdoc IPredict
    function createMarket(
        CompetitionType competitionType,
        uint256 competitionId
    ) external onlyController returns (uint256 marketId) {
        _validateCompetitionForBetting(competitionType, competitionId);

        marketId = nextMarketId++;

        Market storage m = _markets[marketId];
        m.competitionType = competitionType;
        m.competitionId = competitionId;

        emit MarketCreated(marketId, competitionType, competitionId);
    }

    /**
     * @dev Validate that competition exists and is in registration phase
     */
    function _validateCompetitionForBetting(
        CompetitionType compType,
        uint256 compId
    ) internal view {
        if (compType == CompetitionType.PrizePool) {
            (uint256 matchesCompleted, , , bool finalized, ) = prizeContract.getPool(compId);
            if (finalized || matchesCompleted > 0) revert BettingIsClosed();

        } else if (compType == CompetitionType.Challenge) {
            IChallenge.Challenge memory c = challengeContract.getChallenge(compId);
            if (c.slotCount == 0) revert CompetitionNotFound();
            if (c.status != IChallenge.ChallengeStatus.Registration) revert BettingIsClosed();

        } else if (compType == CompetitionType.LeagueCycle) {
            ILeague.Cycle memory c = leagueContract.getCycle(compId);
            if (c.status == ILeague.CycleStatus.Finalized) revert BettingIsClosed();
            if (c.status == ILeague.CycleStatus.Active) revert BettingIsClosed();
        }
    }

    // ============ Betting ============

    /// @inheritdoc IPredict
    function predict(uint256 marketId, address predictedPlayer) external payable nonReentrant {
        if (predictedPlayer == address(0)) revert ZeroAddress();
        if (msg.value == 0) revert ZeroAmount();

        Market storage market = _markets[marketId];
        if (market.competitionId == 0) revert MarketNotFound();
        if (market.resolved || market.voided) revert MarketAlreadyResolved();
        if (_predictions[marketId][msg.sender].amount > 0) revert AlreadyPredicted();

        // Check if betting should be closed
        if (market.bettingClosed || _shouldCloseBetting(market)) {
            // Close betting if not already closed (persists state)
            if (!market.bettingClosed) {
                market.bettingClosed = true;
                emit BettingClosed(marketId);
            }
            // Try to refund - ignore failure to prevent DoS on betting closure
            // slither-disable-next-line low-level-calls,unchecked-lowlevel
            (bool _refundSuccess, ) = payable(msg.sender).call{value: msg.value}("");
            _refundSuccess; // Silence unused variable warning - intentionally ignored
            return;
        }

        // Record prediction
        _predictions[marketId][msg.sender] = Prediction({
            predictedPlayer: predictedPlayer,
            amount: msg.value,
            claimed: false
        });

        market.totalPool += msg.value;
        _stakeByPlayer[marketId][predictedPlayer] += msg.value;

        // Track unique predicted players
        if (!_isPlayerPredicted[marketId][predictedPlayer]) {
            _isPlayerPredicted[marketId][predictedPlayer] = true;
            _predictedPlayers[marketId].push(predictedPlayer);
        }

        _predictors[marketId].push(msg.sender);

        emit PredictionPlaced(marketId, msg.sender, predictedPlayer, msg.value);
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
        if (market.competitionType == CompetitionType.PrizePool) {
            (uint256 matchesCompleted, , , bool finalized, ) = prizeContract.getPool(
                market.competitionId
            );
            return matchesCompleted > 0 || finalized;

        } else if (market.competitionType == CompetitionType.Challenge) {
            IChallenge.Challenge memory c = challengeContract.getChallenge(
                market.competitionId
            );
            return c.status != IChallenge.ChallengeStatus.Registration;

        } else if (market.competitionType == CompetitionType.LeagueCycle) {
            ILeague.Cycle memory c = leagueContract.getCycle(market.competitionId);
            return c.status != ILeague.CycleStatus.Registration;
        }

        return false;
    }

    // ============ Resolution ============

    /// @inheritdoc IPredict
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

        if (market.competitionType == CompetitionType.PrizePool) {
            bool finalized;
            (, winner, , finalized, ) = prizeContract.getPool(market.competitionId);
            if (!finalized) revert CompetitionNotFinalized();
            isVoided = winner == address(0);

        } else if (market.competitionType == CompetitionType.Challenge) {
            IChallenge.Challenge memory c = challengeContract.getChallenge(
                market.competitionId
            );
            if (c.status == IChallenge.ChallengeStatus.Cancelled) {
                isVoided = true;
            } else {
                if (c.status != IChallenge.ChallengeStatus.Finalized) {
                    revert CompetitionNotFinalized();
                }
                winner = c.winner;
            }

        } else if (market.competitionType == CompetitionType.LeagueCycle) {
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

    /// @inheritdoc IPredict
    function claim(uint256 marketId) external nonReentrant {
        Market storage market = _markets[marketId];
        Prediction storage pred = _predictions[marketId][msg.sender];

        if (market.competitionId == 0) revert MarketNotFound();
        if (pred.amount == 0) revert NoPrediction();
        if (pred.claimed) revert AlreadyClaimed();

        pred.claimed = true;

        // Voided: refund everyone
        if (market.voided) {
            _transfer(address(0), msg.sender, pred.amount);
            emit Claimed(marketId, msg.sender, pred.amount);
            return;
        }

        if (!market.resolved) revert CompetitionNotFinalized();

        bool isWinner = pred.predictedPlayer == market.resolvedWinner;

        if (isWinner) {
            uint256 winningPool = _stakeByPlayer[marketId][market.resolvedWinner];

            if (winningPool == 0) {
                // No one predicted the winner - refund
                _transfer(address(0), msg.sender, pred.amount);
                emit Claimed(marketId, msg.sender, pred.amount);
                return;
            }

            uint256 payout = (pred.amount * market.totalPool) / winningPool;
            _transfer(address(0), msg.sender, payout);
            emit Claimed(marketId, msg.sender, payout);
        }
        // Wrong prediction: no payout, already marked claimed
    }

    // ============ Views ============

    /// @inheritdoc IPredict
    function isBettingOpen(uint256 marketId) external view returns (bool) {
        Market storage market = _markets[marketId];
        if (market.competitionId == 0) return false;
        if (market.bettingClosed || market.resolved || market.voided) return false;

        if (market.competitionType == CompetitionType.PrizePool) {
            (uint256 matchesCompleted, , , bool finalized, ) = prizeContract.getPool(
                market.competitionId
            );
            return matchesCompleted == 0 && !finalized;

        } else if (market.competitionType == CompetitionType.Challenge) {
            IChallenge.Challenge memory c = challengeContract.getChallenge(
                market.competitionId
            );
            return c.status == IChallenge.ChallengeStatus.Registration;

        } else if (market.competitionType == CompetitionType.LeagueCycle) {
            ILeague.Cycle memory c = leagueContract.getCycle(market.competitionId);
            return c.status == ILeague.CycleStatus.Registration;
        }

        return false;
    }

    /// @inheritdoc IPredict
    function getMarket(uint256 marketId) external view returns (Market memory) {
        return _markets[marketId];
    }

    /// @inheritdoc IPredict
    function getPrediction(
        uint256 marketId,
        address predictor
    ) external view returns (Prediction memory) {
        return _predictions[marketId][predictor];
    }

    /// @inheritdoc IPredict
    function getStakeForPlayer(
        uint256 marketId,
        address player
    ) external view returns (uint256) {
        return _stakeByPlayer[marketId][player];
    }

    /// @inheritdoc IPredict
    function getOddsForPlayer(
        uint256 marketId,
        address player
    ) external view returns (uint256) {
        Market storage market = _markets[marketId];
        uint256 playerStake = _stakeByPlayer[marketId][player];

        if (playerStake == 0 || market.totalPool == 0) return 0;

        return (market.totalPool * 10000) / playerStake;
    }

    /// @inheritdoc IPredict
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
                    ? (market.totalPool * 10000) / stake
                    : 0
            });
        }

        return odds;
    }

    /// @inheritdoc IPredict
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
        return "Predict - OCI-007";
    }

    /// @notice Receive ETH for native token predictions
    receive() external payable {}
}