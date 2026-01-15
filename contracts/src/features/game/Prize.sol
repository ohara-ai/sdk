// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {IFeature} from "../../interfaces/IFeature.sol";
import {IPrize} from "../../interfaces/game/IPrize.sol";
import {IShares} from "../../interfaces/game/IShares.sol";
import {FeatureController} from "../../base/FeatureController.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/**
 * @title Prize
 * @notice Prize pool system with multi-winner support and token-specific pools
 * @dev Pools are separated by token - each token has its own pool sequence
 *      Top N winners (configurable, default 10) share the prize using distribution strategies
 */
contract Prize is IPrize, IFeature, FeatureController, Initializable {
    using SafeERC20 for IERC20;

    struct PrizePool {
        address token;
        uint256 matchesCompleted;
        bool finalized;
        uint256 prizeAmount;
        address[] winners;           // Sorted by wins (descending)
        uint256[] winCounts;         // Win count for each winner
        mapping(address => bool) claimed;  // Winner => claimed status
    }

    struct PlayerWins {
        address player;
        uint256 wins;
    }

    // Configuration
    uint256 public matchesPerPool;
    uint256 public winnersCount;
    DistributionStrategy public distributionStrategy;
    
    // Share source contracts (Match, Heap, etc.)
    IShares[] private _shareContracts;
    mapping(address => bool) private _shareContractExists;
    
    // Global pool counter
    uint256 private _poolIdCounter;
    
    // Pool storage: poolId => PrizePool
    mapping(uint256 => PrizePool) private _pools;
    
    // Token => current active pool ID for that token
    mapping(address => uint256) private _currentPoolByToken;
    
    // Wins per address per pool: poolId => player => wins
    mapping(uint256 => mapping(address => uint256)) private _poolWins;
    
    // Players in pool for iteration: poolId => players array
    mapping(uint256 => address[]) private _poolPlayers;
    mapping(uint256 => mapping(address => bool)) private _poolPlayerExists;
    
    // Token tracking for iteration
    address[] private _tokens;
    mapping(address => bool) private _tokenExists;
    
    // Authorized score contracts that can record results
    mapping(address => bool) public authorizedRecorders;

    // Constants
    uint256 public constant MAX_WINNERS = 100;
    uint256 public constant DEFAULT_WINNERS_COUNT = 10;

    event ShareContractAdded(address indexed shareContract);
    event ShareContractRemoved(address indexed shareContract);
    event MatchesPerPoolUpdated(uint256 previousValue, uint256 newValue);
    event RecorderAuthorized(address indexed recorder, bool authorized);

    error UnauthorizedRecorder();
    error InvalidShareContract();
    error ShareContractAlreadyExists();
    error ShareContractNotFound();
    error InvalidMatchesPerPool();
    error InvalidWinnersCount();
    error PoolNotFinalized();
    error NotPoolWinner();
    error PrizeAlreadyClaimed();
    error NoPrizeToClaim();
    error InvalidRank();

    /**
     * @notice Empty constructor for cloneable pattern
     * @dev Calls parent with zero addresses. The initializer modifier prevents re-initialization.
     */
    constructor() FeatureController(address(0), address(0)) {}

    /**
     * @notice Initialize the Prize contract (replaces constructor for clones)
     * @param _owner Owner address
     * @param _controller Controller address
     * @param _shareContract Address of the initial share contract implementing IShares
     * @param _matchesPerPool Number of matches per prize pool
     */
    function initialize(
        address _owner,
        address _controller,
        address _shareContract,
        uint256 _matchesPerPool
    ) external initializer {
        _initializeFeatureController(_owner, _controller);
        
        if (_shareContract != address(0)) {
            _addShareContract(_shareContract);
        }
        
        if (_matchesPerPool == 0) revert InvalidMatchesPerPool();
        matchesPerPool = _matchesPerPool;
        winnersCount = DEFAULT_WINNERS_COUNT;
        distributionStrategy = DistributionStrategy.Linear;
    }

    /**
     * @notice Initialize with full configuration
     * @param _owner Owner address
     * @param _controller Controller address
     * @param _shareContract Address of the initial share contract implementing IShares
     * @param _matchesPerPool Number of matches per prize pool
     * @param _winnersCount Number of top winners to reward
     * @param _strategy Distribution strategy for prize allocation
     */
    function initializeWithConfig(
        address _owner,
        address _controller,
        address _shareContract,
        uint256 _matchesPerPool,
        uint256 _winnersCount,
        DistributionStrategy _strategy
    ) external initializer {
        _initializeFeatureController(_owner, _controller);
        
        if (_shareContract != address(0)) {
            _addShareContract(_shareContract);
        }
        
        if (_matchesPerPool == 0) revert InvalidMatchesPerPool();
        if (_winnersCount == 0 || _winnersCount > MAX_WINNERS) revert InvalidWinnersCount();
        
        matchesPerPool = _matchesPerPool;
        winnersCount = _winnersCount;
        distributionStrategy = _strategy;
    }

    /**
     * @notice Add a share contract (e.g., Match, Heap)
     * @param _shareContract Address of the share contract implementing IShares
     */
    function addShareContract(address _shareContract) external onlyController {
        _addShareContract(_shareContract);
    }

    /**
     * @notice Remove a share contract
     * @param _shareContract Address of the share contract to remove
     */
    function removeShareContract(address _shareContract) external onlyController {
        if (!_shareContractExists[_shareContract]) revert ShareContractNotFound();
        
        // Remove from array using swap-and-pop
        uint256 length = _shareContracts.length;
        for (uint256 i = 0; i < length;) {
            if (address(_shareContracts[i]) == _shareContract) {
                _shareContracts[i] = _shareContracts[length - 1];
                _shareContracts.pop();
                break;
            }
            unchecked { ++i; }
        }
        
        delete _shareContractExists[_shareContract];
        emit ShareContractRemoved(_shareContract);
    }

    /**
     * @notice Internal function to add a share contract
     * @param _shareContract Address of the share contract
     */
    function _addShareContract(address _shareContract) internal {
        if (_shareContract == address(0) || _shareContract.code.length == 0) {
            revert InvalidShareContract();
        }
        if (_shareContractExists[_shareContract]) revert ShareContractAlreadyExists();
        
        _shareContracts.push(IShares(_shareContract));
        _shareContractExists[_shareContract] = true;
        emit ShareContractAdded(_shareContract);
    }

    /**
     * @notice Get all registered share contracts
     * @return contracts Array of share contract addresses
     */
    function getShareContracts() external view returns (address[] memory contracts) {
        uint256 length = _shareContracts.length;
        contracts = new address[](length);
        for (uint256 i = 0; i < length; i++) {
            contracts[i] = address(_shareContracts[i]);
        }
    }

    /**
     * @notice Update matches per pool (only affects new pools)
     * @param _matchesPerPool New matches per pool value
     */
    function setMatchesPerPool(uint256 _matchesPerPool) external onlyOwner {
        if (_matchesPerPool == 0) revert InvalidMatchesPerPool();
        uint256 previousValue = matchesPerPool;
        matchesPerPool = _matchesPerPool;
        emit MatchesPerPoolUpdated(previousValue, _matchesPerPool);
    }

    /**
     * @notice Update winners count (only affects new pools)
     * @param _winnersCount New winners count
     */
    function setWinnersCount(uint256 _winnersCount) external onlyOwner {
        if (_winnersCount == 0 || _winnersCount > MAX_WINNERS) revert InvalidWinnersCount();
        winnersCount = _winnersCount;
        emit ConfigUpdated(_winnersCount, distributionStrategy);
    }

    /**
     * @notice Update distribution strategy (only affects new pools)
     * @param _strategy New distribution strategy
     */
    function setDistributionStrategy(DistributionStrategy _strategy) external onlyOwner {
        distributionStrategy = _strategy;
        emit ConfigUpdated(winnersCount, _strategy);
    }

    /**
     * @notice Authorize or revoke a contract's ability to record results
     * @param recorder Address of the recorder contract (typically Score)
     * @param authorized Whether to authorize or revoke
     */
    function setRecorderAuthorization(address recorder, bool authorized) external onlyController {
        authorizedRecorders[recorder] = authorized;
        emit RecorderAuthorized(recorder, authorized);
    }

    /// @inheritdoc IPrize
    function recordMatchResult(address winner, address token) external {
        if (!authorizedRecorders[msg.sender]) revert UnauthorizedRecorder();
        
        // Get or create pool for this token
        uint256 poolId = _currentPoolByToken[token];
        if (poolId == 0) {
            poolId = _createPool(token);
        }
        
        PrizePool storage pool = _pools[poolId];
        
        // Track token if new
        if (!_tokenExists[token]) {
            _tokens.push(token);
            _tokenExists[token] = true;
        }
        
        // Track player in pool if new
        if (!_poolPlayerExists[poolId][winner]) {
            _poolPlayers[poolId].push(winner);
            _poolPlayerExists[poolId][winner] = true;
        }
        
        // Increment match count and winner's wins
        pool.matchesCompleted++;
        _poolWins[poolId][winner]++;
        
        emit MatchRecorded(poolId, token, winner, pool.matchesCompleted);
        
        // Check if pool is complete
        if (pool.matchesCompleted >= matchesPerPool) {
            _finalizePool(poolId);
        }
    }

    /**
     * @notice Create a new pool for a token
     * @param token Token address
     * @return poolId New pool ID
     */
    function _createPool(address token) internal returns (uint256 poolId) {
        poolId = ++_poolIdCounter;
        _pools[poolId].token = token;
        _currentPoolByToken[token] = poolId;
        
        emit PrizePoolCreated(poolId, token, matchesPerPool);
    }

    /**
     * @notice Finalize a pool and compute winners
     * @param poolId Pool ID to finalize
     */
    function _finalizePool(uint256 poolId) internal {
        PrizePool storage pool = _pools[poolId];
        pool.finalized = true;
        
        // Collect shares from all registered share contracts
        if (_shareContracts.length > 0) {
            _collectSharesForPool(poolId);
        }
        
        // Compute top N winners
        _computeWinners(poolId);
        
        emit PrizePoolFinalized(poolId, pool.token, pool.winners, pool.winCounts);
        
        // Create new pool for this token
        _createPool(pool.token);
    }

    /**
     * @notice Collect shares from all share contracts for pool's token
     * @param poolId Pool ID to collect for
     */
    function _collectSharesForPool(uint256 poolId) internal {
        PrizePool storage pool = _pools[poolId];
        address token = pool.token;
        
        uint256 length = _shareContracts.length;
        for (uint256 i = 0; i < length;) {
            IShares shareContract = _shareContracts[i];
            uint256 pending = shareContract.getPendingShares(address(this), token);
            if (pending > 0) {
                uint256 balanceBefore = _getBalance(token);
                shareContract.claimShares(token);
                uint256 balanceAfter = _getBalance(token);
                uint256 received = balanceAfter - balanceBefore;
                
                pool.prizeAmount += received;
                emit SharesCollected(token, received);
            }
            unchecked { ++i; }
        }
    }

    /**
     * @notice Compute top N winners for a pool
     * @param poolId Pool ID
     */
    function _computeWinners(uint256 poolId) internal {
        PrizePool storage pool = _pools[poolId];
        address[] storage players = _poolPlayers[poolId];
        uint256 playerCount = players.length;
        
        // Create array of player wins for sorting
        PlayerWins[] memory playerWins = new PlayerWins[](playerCount);
        for (uint256 i = 0; i < playerCount; i++) {
            playerWins[i] = PlayerWins({
                player: players[i],
                wins: _poolWins[poolId][players[i]]
            });
        }
        
        // Sort by wins (descending) using insertion sort
        for (uint256 i = 1; i < playerCount; i++) {
            PlayerWins memory key = playerWins[i];
            // casting to int256 is safe because i is bounded by playerCount which won't exceed int256 max
            // forge-lint: disable-next-line(unsafe-typecast)
            int256 j = int256(i) - 1;
            // casting to uint256 is safe because j >= 0 is checked in the while condition
            // forge-lint: disable-next-line(unsafe-typecast)
            while (j >= 0 && playerWins[uint256(j)].wins < key.wins) {
                // forge-lint: disable-next-line(unsafe-typecast)
                playerWins[uint256(j + 1)] = playerWins[uint256(j)];
                j--;
            }
            // forge-lint: disable-next-line(unsafe-typecast)
            playerWins[uint256(j + 1)] = key;
        }
        
        // Store top N winners
        uint256 actualWinners = playerCount < winnersCount ? playerCount : winnersCount;
        pool.winners = new address[](actualWinners);
        pool.winCounts = new uint256[](actualWinners);
        
        for (uint256 i = 0; i < actualWinners; i++) {
            pool.winners[i] = playerWins[i].player;
            pool.winCounts[i] = playerWins[i].wins;
        }
    }

    /**
     * @notice Get token balance
     * @param token Token address (address(0) for native)
     */
    function _getBalance(address token) internal view returns (uint256) {
        if (token == address(0)) {
            return address(this).balance;
        }
        return IERC20(token).balanceOf(address(this));
    }

    /// @inheritdoc IPrize
    function claimPrize(uint256 poolId) external nonReentrant {
        PrizePool storage pool = _pools[poolId];
        
        if (!pool.finalized) revert PoolNotFinalized();
        if (pool.claimed[msg.sender]) revert PrizeAlreadyClaimed();
        
        // Find caller's rank
        uint256 rank = type(uint256).max;
        for (uint256 i = 0; i < pool.winners.length; i++) {
            if (pool.winners[i] == msg.sender) {
                rank = i;
                break;
            }
        }
        
        if (rank == type(uint256).max) revert NotPoolWinner();
        
        pool.claimed[msg.sender] = true;
        
        // Calculate prize amount for this rank
        uint256 prizeForRank = _calculatePrizeForRank(poolId, rank);
        if (prizeForRank == 0) revert NoPrizeToClaim();
        
        _transfer(pool.token, msg.sender, prizeForRank);
        emit PrizeClaimed(poolId, msg.sender, pool.token, prizeForRank, rank);
    }

    /**
     * @notice Calculate prize amount for a specific rank
     * @param poolId Pool ID
     * @param rank Winner rank (0 = 1st place)
     * @return amount Prize amount
     */
    function _calculatePrizeForRank(uint256 poolId, uint256 rank) internal view returns (uint256 amount) {
        PrizePool storage pool = _pools[poolId];
        uint256 totalPrize = pool.prizeAmount;
        uint256 numWinners = pool.winners.length;
        
        if (numWinners == 0 || rank >= numWinners) return 0;
        
        if (distributionStrategy == DistributionStrategy.Equal) {
            return totalPrize / numWinners;
        }
        
        if (distributionStrategy == DistributionStrategy.WinnerTakeAll) {
            return rank == 0 ? totalPrize : 0;
        }
        
        if (distributionStrategy == DistributionStrategy.Linear) {
            // Linear: 1st gets N shares, 2nd gets N-1, etc.
            // Total shares = N + (N-1) + ... + 1 = N*(N+1)/2
            uint256 totalShares = (numWinners * (numWinners + 1)) / 2;
            uint256 rankShares = numWinners - rank;
            return (totalPrize * rankShares) / totalShares;
        }
        
        if (distributionStrategy == DistributionStrategy.Exponential) {
            // Exponential: 50%, 25%, 12.5%, etc.
            // Each rank gets half of remaining prize
            uint256 remaining = totalPrize;
            for (uint256 i = 0; i < rank; i++) {
                remaining = remaining / 2;
            }
            // Last winner gets all remaining
            if (rank == numWinners - 1) {
                return remaining;
            }
            return remaining / 2;
        }
        
        if (distributionStrategy == DistributionStrategy.ProportionalToWins) {
            // Proportional to wins in the pool
            uint256 totalWins = 0;
            for (uint256 i = 0; i < numWinners; i++) {
                totalWins += pool.winCounts[i];
            }
            if (totalWins == 0) return 0;
            return (totalPrize * pool.winCounts[rank]) / totalWins;
        }
        
        return 0;
    }

    /// @inheritdoc IPrize
    function getPool(uint256 poolId) external view returns (
        address token,
        uint256 matchesCompleted,
        bool finalized,
        uint256 prizeAmount
    ) {
        PrizePool storage pool = _pools[poolId];
        return (
            pool.token,
            pool.matchesCompleted,
            pool.finalized,
            pool.prizeAmount
        );
    }

    /// @inheritdoc IPrize
    function getPoolWinners(uint256 poolId) external view returns (
        address[] memory winners,
        uint256[] memory winCounts,
        bool[] memory claimed
    ) {
        PrizePool storage pool = _pools[poolId];
        uint256 length = pool.winners.length;
        
        winners = pool.winners;
        winCounts = pool.winCounts;
        claimed = new bool[](length);
        
        for (uint256 i = 0; i < length; i++) {
            claimed[i] = pool.claimed[pool.winners[i]];
        }
    }

    /// @inheritdoc IPrize
    function getPoolWins(uint256 poolId, address player) external view returns (uint256 wins) {
        return _poolWins[poolId][player];
    }

    /// @inheritdoc IPrize
    function getPrizeForRank(uint256 poolId, uint256 rank) external view returns (uint256 amount) {
        PrizePool storage pool = _pools[poolId];
        if (!pool.finalized || rank >= pool.winners.length) revert InvalidRank();
        return _calculatePrizeForRank(poolId, rank);
    }

    /// @inheritdoc IPrize
    function getCurrentPoolId(address token) external view returns (uint256 poolId) {
        return _currentPoolByToken[token];
    }

    /// @inheritdoc IPrize
    function getMatchesPerPool() external view returns (uint256) {
        return matchesPerPool;
    }

    /// @inheritdoc IPrize
    function getWinnersCount() external view returns (uint256) {
        return winnersCount;
    }

    /// @inheritdoc IPrize
    function getDistributionStrategy() external view returns (DistributionStrategy) {
        return distributionStrategy;
    }

    /**
     * @notice Get all tracked token addresses
     * @return tokens Array of token addresses
     */
    function getTokens() external view returns (address[] memory) {
        return _tokens;
    }

    /**
     * @notice Get claimable pools for an address
     * @param player Address to check
     * @return poolIds Array of pool IDs where player is winner and has not claimed
     */
    function getClaimablePools(address player) external view returns (uint256[] memory poolIds) {
        // Count claimable pools first
        uint256 count = 0;
        for (uint256 i = 1; i <= _poolIdCounter; i++) {
            PrizePool storage pool = _pools[i];
            if (pool.finalized && !pool.claimed[player]) {
                // Check if player is in winners list
                for (uint256 j = 0; j < pool.winners.length; j++) {
                    if (pool.winners[j] == player) {
                        count++;
                        break;
                    }
                }
            }
        }
        
        // Populate array
        poolIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= _poolIdCounter; i++) {
            PrizePool storage pool = _pools[i];
            if (pool.finalized && !pool.claimed[player]) {
                for (uint256 j = 0; j < pool.winners.length; j++) {
                    if (pool.winners[j] == player) {
                        poolIds[index++] = i;
                        break;
                    }
                }
            }
        }
    }

    /**
     * @notice Get total pool count
     * @return count Total number of pools created
     */
    function getTotalPoolCount() external view returns (uint256 count) {
        return _poolIdCounter;
    }

    /// @inheritdoc IFeature
    function version() external pure returns (string memory) {
        return "2.0.0";
    }

    /// @inheritdoc IFeature
    function featureName() external pure returns (string memory) {
        return "GamePrize - OCI-004";
    }

    /**
     * @notice Receive native tokens
     */
    receive() external payable {}
}
