// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {IFeature} from "../../interfaces/IFeature.sol";
import {ILeague} from "../../interfaces/game/ILeague.sol";
import {IScoreNotifiable} from "../../interfaces/game/IScoreNotifiable.sol";
import {IPrediction} from "../../interfaces/game/IPrediction.sol";
import {FeatureController} from "../../base/FeatureController.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/**
 * @title League
 * @notice Tracks player rankings across time-based cycles
 * @dev Receives match results from Match contract and indexes by tokens won
 */
contract League is ILeague, IScoreNotifiable, IFeature, FeatureController, Initializable {
    // ============ Constants ============

    uint256 public constant DEFAULT_CYCLE_DURATION = 604800; // 1 week in seconds
    uint256 public constant MIN_CYCLE_DURATION = 3600; // 1 hour minimum
    uint256 public constant MAX_CYCLE_DURATION = 2678400; // 31 days maximum
    uint256 public constant MAX_LEADERBOARD_SIZE = 100;
    uint256 public constant TOP_PLAYERS_COUNT = 10;
    uint256 public constant MAX_PLAYERS_PER_CYCLE = 1000;
    uint256 public constant MAX_TOKENS_PER_CYCLE = 10;
    uint256 public constant DEFAULT_MAX_CYCLES_KEPT = 52; // ~1 year of weekly cycles
    uint256 public constant MIN_CYCLES_KEPT = 4;

    // ============ Storage ============

    /// @notice Score contract that is authorized to record results
    address public scoreContract;

    /// @notice Prediction contract for automatic betting closure
    IPrediction public prediction;

    /// @notice Duration of each cycle in seconds
    uint256 public cycleDuration;

    /// @notice Current cycle ID
    uint256 private _currentCycleId;

    /// @notice Whether the first cycle has started
    bool private _cycleStarted;
    
    /// @notice Maximum number of past cycles to keep in storage
    uint256 public maxCyclesKept;
    
    /// @notice Oldest cycle ID still in storage
    uint256 private _oldestCycleId;

    /// @notice Cycle metadata: cycleId => Cycle
    mapping(uint256 => Cycle) private _cycles;

    /// @notice Player stats: cycleId => player => token => PlayerStats
    mapping(uint256 => mapping(address => mapping(address => PlayerStats))) private _playerStats;

    /// @notice Players per cycle: cycleId => players[]
    mapping(uint256 => address[]) private _cyclePlayers;

    /// @notice Player index in cycle: cycleId => player => index (1-based, 0 = not registered)
    mapping(uint256 => mapping(address => uint256)) private _playerIndex;

    /// @notice Tokens per cycle: cycleId => tokens[]
    mapping(uint256 => address[]) private _cycleTokens;

    /// @notice Token index in cycle: cycleId => token => index (1-based, 0 = not registered)
    mapping(uint256 => mapping(address => uint256)) private _tokenIndex;

    /// @notice Finalized rankings: cycleId => token => players[] (sorted by tokensWon desc)
    mapping(uint256 => mapping(address => address[])) private _finalRankings;

    // ============ Errors ============

    error UnauthorizedCaller();
    error InvalidScoreContract();
    error InvalidCycleDuration();
    error CycleNotFinalized();
    error CycleAlreadyFinalized();
    error InvalidCycleId();
    error InvalidWinner();
    error InvalidMaxCycles();
    
    // ============ Events ============
    
    event CycleCleanedUp(uint256 indexed cycleId);
    event MaxCyclesKeptUpdated(uint256 previousValue, uint256 newValue);

    // ============ Constructor & Initializer ============

    /**
     * @notice Empty constructor for cloneable pattern
     */
    constructor() FeatureController(address(0), address(0)) {}

    /**
     * @notice Initialize the League contract
     * @param _owner Owner address
     * @param _controller Controller address
     * @param _scoreContract Score contract address
     * @param _cycleDuration Cycle duration in seconds (0 for default)
     */
    function initialize(
        address _owner,
        address _controller,
        address _scoreContract,
        uint256 _cycleDuration
    ) external initializer {
        _initializeFeatureController(_owner, _controller);

        if (_scoreContract != address(0)) {
            scoreContract = _scoreContract;
        }

        // Apply same validation as setCycleDuration
        if (_cycleDuration != 0) {
            if (_cycleDuration < MIN_CYCLE_DURATION || _cycleDuration > MAX_CYCLE_DURATION) {
                revert InvalidCycleDuration();
            }
        }
        cycleDuration = _cycleDuration == 0 ? DEFAULT_CYCLE_DURATION : _cycleDuration;
        maxCyclesKept = DEFAULT_MAX_CYCLES_KEPT;
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the score contract
     * @param _scoreContract Address of the score contract
     */
    function setScoreContract(address _scoreContract) external onlyController {
        if (_scoreContract == address(0)) revert InvalidScoreContract();
        address previousScore = scoreContract;
        scoreContract = _scoreContract;
        emit ScoreContractUpdated(previousScore, _scoreContract);
    }

    /**
     * @notice Set the prediction contract for automatic betting closure
     * @param _prediction Address of the prediction contract (address(0) to disable)
     */
    function setPrediction(address _prediction) external onlyController {
        prediction = IPrediction(_prediction);
    }

    /**
     * @notice Set the cycle duration (only affects future cycles)
     * @param _cycleDuration New cycle duration in seconds
     */
    function setCycleDuration(uint256 _cycleDuration) external onlyOwner {
        if (_cycleDuration < MIN_CYCLE_DURATION || _cycleDuration > MAX_CYCLE_DURATION) {
            revert InvalidCycleDuration();
        }
        uint256 previousDuration = cycleDuration;
        cycleDuration = _cycleDuration;
        emit CycleDurationUpdated(previousDuration, _cycleDuration);
    }

    /**
     * @notice Set maximum number of cycles to keep in storage
     * @param _maxCyclesKept New maximum cycles to keep
     */
    function setMaxCyclesKept(uint256 _maxCyclesKept) external onlyOwner {
        if (_maxCyclesKept < MIN_CYCLES_KEPT) revert InvalidMaxCycles();
        uint256 previousValue = maxCyclesKept;
        maxCyclesKept = _maxCyclesKept;
        emit MaxCyclesKeptUpdated(previousValue, _maxCyclesKept);
    }

    /**
     * @notice Clean up old cycle data to free storage
     * @param cycleId The cycle ID to clean up
     * @dev Can only clean up finalized cycles older than maxCyclesKept
     */
    function cleanupCycle(uint256 cycleId) external onlyOwner {
        if (cycleId >= _currentCycleId) revert InvalidCycleId();
        if (_currentCycleId - cycleId < maxCyclesKept) revert InvalidCycleId();
        
        Cycle storage cycle = _cycles[cycleId];
        if (cycle.status != CycleStatus.Finalized) revert CycleNotFinalized();
        
        _cleanupCycleData(cycleId);
        emit CycleCleanedUp(cycleId);
    }

    /**
     * @notice Internal function to clean up cycle data
     * @param cycleId The cycle ID to clean up
     */
    function _cleanupCycleData(uint256 cycleId) internal {
        // Clean up player stats for each token
        address[] storage tokens = _cycleTokens[cycleId];
        address[] storage players = _cyclePlayers[cycleId];
        
        for (uint256 t = 0; t < tokens.length; t++) {
            address token = tokens[t];
            
            // Clean up player stats
            for (uint256 p = 0; p < players.length; p++) {
                delete _playerStats[cycleId][players[p]][token];
            }
            
            // Clean up final rankings
            delete _finalRankings[cycleId][token];
            delete _tokenIndex[cycleId][token];
        }
        
        // Clean up player index
        for (uint256 p = 0; p < players.length; p++) {
            delete _playerIndex[cycleId][players[p]];
        }
        
        // Clean up arrays
        delete _cyclePlayers[cycleId];
        delete _cycleTokens[cycleId];
        delete _cycles[cycleId];
        
        // Update oldest cycle ID
        if (cycleId == _oldestCycleId) {
            _oldestCycleId = cycleId + 1;
        }
    }

    /**
     * @notice Get the oldest cycle ID still in storage
     * @return oldestId The oldest cycle ID
     */
    function getOldestCycleId() external view returns (uint256 oldestId) {
        return _oldestCycleId;
    }

    // ============ Match Recording ============

    /// @inheritdoc IScoreNotifiable
    function onScoreRecorded(
        address winner,
        address[] calldata losers,
        address token,
        uint256 prizeAmount
    ) external {
        if (msg.sender != scoreContract) revert UnauthorizedCaller();
        _recordMatchResult(winner, losers, token, prizeAmount);
    }

    /**
     * @notice Internal function to record match result
     * @param winner The match winner
     * @param losers Array of loser addresses
     * @param token The token used for stakes
     * @param totalPrize The prize amount
     */
    function _recordMatchResult(
        address winner,
        address[] calldata losers,
        address token,
        uint256 totalPrize
    ) internal {
        if (winner == address(0)) revert InvalidWinner();

        // Check if we need to start first cycle or transition to new cycle
        _checkAndTransitionCycle();

        uint256 cycleId = _currentCycleId;

        // Register token if new
        _registerToken(cycleId, token);

        // Register and update winner
        _registerPlayer(cycleId, winner);
        PlayerStats storage winnerStats = _playerStats[cycleId][winner][token];
        winnerStats.wins++;
        winnerStats.tokensWon += totalPrize;

        // Register and update losers
        for (uint256 i = 0; i < losers.length; i++) {
            _registerPlayer(cycleId, losers[i]);
            _playerStats[cycleId][losers[i]][token].losses++;
        }

        emit MatchRecorded(cycleId, winner, losers, token, totalPrize);
    }

    /**
     * @notice Check if cycle needs to transition and handle it
     */
    function _checkAndTransitionCycle() internal {
        if (!_cycleStarted) {
            // Start first cycle
            _startNewCycle();
            return;
        }

        Cycle storage current = _cycles[_currentCycleId];
        if (block.timestamp >= current.endTime) {
            // Current cycle has expired, finalize and start new
            _finalizeCycleInternal(_currentCycleId);
            _startNewCycle();
        }
    }

    /**
     * @notice Start a new cycle
     */
    function _startNewCycle() internal {
        uint256 newCycleId = _cycleStarted ? _currentCycleId + 1 : 0;

        _cycles[newCycleId] = Cycle({
            startTime: block.timestamp,
            endTime: block.timestamp + cycleDuration,
            status: CycleStatus.Active
        });

        _currentCycleId = newCycleId;
        _cycleStarted = true;

        // Notify prediction contract to close betting (if configured)
        if (address(prediction) != address(0)) {
            prediction.onCompetitionStarted(IPrediction.CompetitionType.LeagueCycle, newCycleId);
        }

        emit CycleStarted(newCycleId, block.timestamp, block.timestamp + cycleDuration);
    }

    /**
     * @notice Register a player in the current cycle
     */
    function _registerPlayer(uint256 cycleId, address player) internal {
        if (_playerIndex[cycleId][player] != 0) return; // Already registered

        // Check capacity
        if (_cyclePlayers[cycleId].length >= MAX_PLAYERS_PER_CYCLE) return;

        _cyclePlayers[cycleId].push(player);
        _playerIndex[cycleId][player] = _cyclePlayers[cycleId].length;

        emit PlayerRegistered(cycleId, player);
    }

    /**
     * @notice Register a token in the current cycle
     */
    function _registerToken(uint256 cycleId, address token) internal {
        if (_tokenIndex[cycleId][token] != 0) return; // Already registered

        // Check capacity
        if (_cycleTokens[cycleId].length >= MAX_TOKENS_PER_CYCLE) return;

        _cycleTokens[cycleId].push(token);
        _tokenIndex[cycleId][token] = _cycleTokens[cycleId].length;
    }

    // ============ Cycle Finalization ============

    /// @inheritdoc ILeague
    function finalizeCycle() external onlyController {
        if (!_cycleStarted) revert InvalidCycleId();

        Cycle storage current = _cycles[_currentCycleId];
        if (current.status == CycleStatus.Finalized) revert CycleAlreadyFinalized();

        _finalizeCycleInternal(_currentCycleId);
    }

    /**
     * @notice Internal cycle finalization
     * @dev Uses top-N selection algorithm instead of full sort for gas efficiency
     */
    function _finalizeCycleInternal(uint256 cycleId) internal {
        Cycle storage cycle = _cycles[cycleId];
        if (cycle.status == CycleStatus.Finalized) return;

        cycle.status = CycleStatus.Finalized;

        // Calculate rankings for each token
        address[] storage tokens = _cycleTokens[cycleId];

        for (uint256 t = 0; t < tokens.length; t++) {
            address token = tokens[t];
            (address[] memory topPlayers, uint256[] memory topAmounts) = _selectTopN(cycleId, token, TOP_PLAYERS_COUNT);
            
            // Store top players in finalRankings
            for (uint256 i = 0; i < topPlayers.length; i++) {
                if (topPlayers[i] != address(0)) {
                    _finalRankings[cycleId][token].push(topPlayers[i]);
                }
            }

            emit CycleFinalized(cycleId, token, topPlayers, topAmounts);
        }
    }
    
    /**
     * @notice Select top N players by tokensWon using partial selection (O(n*k) instead of O(n²))
     * @param cycleId The cycle ID
     * @param token The token address
     * @param n Number of top players to select
     * @return topPlayers Array of top player addresses
     * @return topAmounts Array of corresponding token amounts
     */
    function _selectTopN(
        uint256 cycleId,
        address token,
        uint256 n
    ) internal view returns (address[] memory topPlayers, uint256[] memory topAmounts) {
        address[] storage players = _cyclePlayers[cycleId];
        uint256 playerCount = players.length;
        
        // Track which players are already selected
        bool[] memory selected = new bool[](playerCount);
        
        uint256 resultCount = n > playerCount ? playerCount : n;
        topPlayers = new address[](resultCount);
        topAmounts = new uint256[](resultCount);
        
        // Select top N one at a time
        for (uint256 k = 0; k < resultCount; k++) {
            uint256 maxAmount = 0;
            uint256 maxIndex = type(uint256).max;
            
            // Find the unselected player with highest tokensWon
            for (uint256 i = 0; i < playerCount; i++) {
                if (selected[i]) continue;
                
                uint256 amount = _playerStats[cycleId][players[i]][token].tokensWon;
                if (amount > maxAmount || (amount == maxAmount && maxIndex == type(uint256).max)) {
                    maxAmount = amount;
                    maxIndex = i;
                }
            }
            
            if (maxIndex != type(uint256).max && maxAmount > 0) {
                selected[maxIndex] = true;
                topPlayers[k] = players[maxIndex];
                topAmounts[k] = maxAmount;
            }
        }
    }

    // ============ View Functions ============

    /// @inheritdoc ILeague
    function getCurrentCycleId() external view returns (uint256 cycleId) {
        return _currentCycleId;
    }

    /// @inheritdoc ILeague
    function getCycle(uint256 cycleId) external view returns (Cycle memory cycle) {
        return _cycles[cycleId];
    }

    /// @inheritdoc ILeague
    function getPlayerStats(
        uint256 cycleId,
        address player,
        address token
    ) external view returns (PlayerStats memory stats) {
        return _playerStats[cycleId][player][token];
    }

    /// @inheritdoc ILeague
    /// @dev For live cycles, returns unsorted data - SDK should handle sorting
    function getLeaderboard(
        uint256 cycleId,
        address token,
        uint256 count
    ) external view returns (address[] memory players, uint256[] memory tokensWon) {
        Cycle storage cycle = _cycles[cycleId];

        if (cycle.status == CycleStatus.Finalized) {
            // Use pre-computed rankings (already sorted)
            address[] storage rankings = _finalRankings[cycleId][token];
            uint256 resultCount = count > rankings.length ? rankings.length : count;

            players = new address[](resultCount);
            tokensWon = new uint256[](resultCount);

            for (uint256 i = 0; i < resultCount; i++) {
                players[i] = rankings[i];
                tokensWon[i] = _playerStats[cycleId][rankings[i]][token].tokensWon;
            }
        } else {
            // Return unsorted data for live cycle - SDK handles sorting
            address[] storage allPlayers = _cyclePlayers[cycleId];
            uint256 resultCount = count > allPlayers.length ? allPlayers.length : count;
            resultCount = resultCount > MAX_LEADERBOARD_SIZE ? MAX_LEADERBOARD_SIZE : resultCount;

            players = new address[](resultCount);
            tokensWon = new uint256[](resultCount);

            for (uint256 i = 0; i < resultCount; i++) {
                players[i] = allPlayers[i];
                tokensWon[i] = _playerStats[cycleId][allPlayers[i]][token].tokensWon;
            }
        }
    }

    /// @inheritdoc ILeague
    function getPlayerRank(
        uint256 cycleId,
        address player,
        address token
    ) external view returns (uint256 rank) {
        Cycle storage cycle = _cycles[cycleId];

        if (cycle.status == CycleStatus.Finalized) {
            return _playerStats[cycleId][player][token].rank;
        }

        // For live cycle, compute rank on-the-fly
        uint256 playerAmount = _playerStats[cycleId][player][token].tokensWon;
        if (playerAmount == 0) return 0;

        address[] storage allPlayers = _cyclePlayers[cycleId];
        uint256 higherCount = 0;

        for (uint256 i = 0; i < allPlayers.length; i++) {
            if (_playerStats[cycleId][allPlayers[i]][token].tokensWon > playerAmount) {
                higherCount++;
            }
        }

        return higherCount + 1; // 1-indexed rank
    }

    /// @inheritdoc ILeague
    function getCycleTokens(uint256 cycleId) external view returns (address[] memory tokens) {
        return _cycleTokens[cycleId];
    }

    /// @inheritdoc ILeague
    function getCyclePlayers(uint256 cycleId) external view returns (address[] memory players) {
        return _cyclePlayers[cycleId];
    }

    /// @inheritdoc ILeague
    function getCycleDuration() external view returns (uint256 duration) {
        return cycleDuration;
    }

    /// @inheritdoc ILeague
    /// @dev For live cycles, returns unsorted data - SDK should handle sorting
    function getTopPlayers(
        uint256 cycleId,
        uint256 count
    ) external view returns (address[] memory players, uint256[] memory tokensWon) {
        // Use native token (address(0)) as default for top players
        address token = address(0);
        
        Cycle storage cycle = _cycles[cycleId];

        if (cycle.status == CycleStatus.Finalized) {
            // Use pre-computed rankings (already sorted)
            address[] storage rankings = _finalRankings[cycleId][token];
            uint256 resultCount = count > rankings.length ? rankings.length : count;

            players = new address[](resultCount);
            tokensWon = new uint256[](resultCount);

            for (uint256 i = 0; i < resultCount; i++) {
                players[i] = rankings[i];
                tokensWon[i] = _playerStats[cycleId][rankings[i]][token].tokensWon;
            }
        } else {
            // Return unsorted data for live cycle - SDK handles sorting
            address[] storage allPlayers = _cyclePlayers[cycleId];
            uint256 resultCount = count > allPlayers.length ? allPlayers.length : count;
            resultCount = resultCount > MAX_LEADERBOARD_SIZE ? MAX_LEADERBOARD_SIZE : resultCount;

            players = new address[](resultCount);
            tokensWon = new uint256[](resultCount);

            for (uint256 i = 0; i < resultCount; i++) {
                players[i] = allPlayers[i];
                tokensWon[i] = _playerStats[cycleId][allPlayers[i]][token].tokensWon;
            }
        }
    }

    /**
     * @notice Check if a cycle has started
     */
    function isCycleStarted() external view returns (bool) {
        return _cycleStarted;
    }

    /**
     * @notice Get the number of players in a cycle
     */
    function getCyclePlayerCount(uint256 cycleId) external view returns (uint256) {
        return _cyclePlayers[cycleId].length;
    }

    /**
     * @notice Get the number of tokens in a cycle
     */
    function getCycleTokenCount(uint256 cycleId) external view returns (uint256) {
        return _cycleTokens[cycleId].length;
    }

    // ============ IFeature ============

    /// @inheritdoc IFeature
    function version() external pure override returns (string memory) {
        return "1.0.0";
    }

    /// @inheritdoc IFeature
    function featureName() external pure override returns (string memory) {
        return "League - OCI-006";
    }
}
