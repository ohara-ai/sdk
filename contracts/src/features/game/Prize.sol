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
 * @notice Prize pool system that distributes shares to match winners
 * @dev Pools are indexed by their ending match, winner is address with most wins
 */
contract Prize is IPrize, IFeature, FeatureController, Initializable {
    using SafeERC20 for IERC20;

    struct PrizePool {
        uint256 matchesCompleted;
        address winner;
        uint256 highestWins;
        bool finalized;
        bool prizeClaimed;
    }

    // Configuration
    uint256 public matchesPerPool;
    IShares public matchContract;
    
    // Pool tracking
    uint256 private _currentPoolId;
    mapping(uint256 => PrizePool) private _pools;
    
    // Wins per address per pool: poolId => player => wins
    mapping(uint256 => mapping(address => uint256)) private _poolWins;
    
    // Prize amounts per pool per token: poolId => token => amount
    mapping(uint256 => mapping(address => uint256)) private _poolPrizes;
    
    // Token tracking for iteration
    address[] private _tokens;
    mapping(address => bool) private _tokenExists;
    
    // Authorized score contracts that can record results
    mapping(address => bool) public authorizedRecorders;

    event MatchContractUpdated(address indexed previousMatch, address indexed newMatch);
    event MatchesPerPoolUpdated(uint256 previousValue, uint256 newValue);
    event RecorderAuthorized(address indexed recorder, bool authorized);

    error UnauthorizedRecorder();
    error InvalidMatchContract();
    error InvalidMatchesPerPool();
    error PoolNotFinalized();
    error NotPoolWinner();
    error PrizeAlreadyClaimed();
    error NoPrizeToClaim();

    /**
     * @notice Empty constructor for cloneable pattern
     * @dev Calls parent with zero addresses. The initializer modifier prevents re-initialization.
     */
    constructor() FeatureController(address(0), address(0)) {}

    /**
     * @notice Initialize the Prize contract (replaces constructor for clones)
     * @param _owner Owner address
     * @param _controller Controller address
     * @param _matchContract Address of the match contract implementing IShares
     * @param _matchesPerPool Number of matches per prize pool
     */
    function initialize(
        address _owner,
        address _controller,
        address _matchContract,
        uint256 _matchesPerPool
    ) external initializer {
        // Initialize FeatureController (sets owner and controller)
        _initializeFeatureController(_owner, _controller);
        
        if (_matchContract != address(0)) {
            matchContract = IShares(_matchContract);
        }
        
        if (_matchesPerPool == 0) revert InvalidMatchesPerPool();
        matchesPerPool = _matchesPerPool;
        
        // Initialize first pool
        _currentPoolId = 1;
        emit PrizePoolCreated(1, _matchesPerPool);
    }

    /**
     * @notice Set the match contract implementing IShares
     * @param _matchContract Address of the match contract (address(0) to disable)
     * @dev The match contract must implement IShares for share collection
     */
    function setMatchContract(address _matchContract) external onlyController {
        if (_matchContract != address(0) && _matchContract.code.length == 0) {
            revert InvalidMatchContract();
        }
        address previousMatch = address(matchContract);
        matchContract = IShares(_matchContract);
        emit MatchContractUpdated(previousMatch, _matchContract);
    }

    /**
     * @notice Update matches per pool (only affects new pools)
     * @param _matchesPerPool New matches per pool value
     * @dev Does not affect the current pool, only subsequent pools
     */
    function setMatchesPerPool(uint256 _matchesPerPool) external onlyOwner {
        if (_matchesPerPool == 0) revert InvalidMatchesPerPool();
        uint256 previousValue = matchesPerPool;
        matchesPerPool = _matchesPerPool;
        emit MatchesPerPoolUpdated(previousValue, _matchesPerPool);
    }

    /**
     * @notice Authorize or revoke a contract's ability to record results
     * @param recorder Address of the recorder contract (typically Score)
     * @param authorized Whether to authorize or revoke
     * @dev Only authorized recorders can call recordMatchResult()
     */
    function setRecorderAuthorization(address recorder, bool authorized) external onlyController {
        authorizedRecorders[recorder] = authorized;
        emit RecorderAuthorized(recorder, authorized);
    }

    /// @inheritdoc IPrize
    function recordMatchResult(address winner) external {
        if (!authorizedRecorders[msg.sender]) revert UnauthorizedRecorder();
        
        uint256 poolId = _currentPoolId;
        PrizePool storage pool = _pools[poolId];
        
        // Increment match count
        pool.matchesCompleted++;
        
        // Track winner's wins in this pool
        uint256 newWins = ++_poolWins[poolId][winner];
        
        emit MatchRecorded(poolId, winner, pool.matchesCompleted);
        
        // Update leader if this player now has more wins
        if (newWins > pool.highestWins) {
            pool.highestWins = newWins;
            pool.winner = winner;
        }
        
        // Check if pool is complete
        if (pool.matchesCompleted >= matchesPerPool) {
            _finalizePool(poolId);
        }
    }

    /**
     * @notice Finalize a pool and snapshot prize amounts
     * @param poolId Pool ID to finalize
     */
    function _finalizePool(uint256 poolId) internal {
        PrizePool storage pool = _pools[poolId];
        pool.finalized = true;
        
        // Collect all pending shares from match contract and assign to this pool
        if (address(matchContract) != address(0)) {
            _collectAndAssignShares(poolId);
        }
        
        emit PrizePoolFinalized(poolId, pool.winner, pool.highestWins);
        
        // Start new pool
        _currentPoolId = poolId + 1;
        emit PrizePoolCreated(_currentPoolId, matchesPerPool);
    }

    /**
     * @notice Collect shares from match contract and assign to pool
     * @param poolId Pool ID to assign shares to
     */
    function _collectAndAssignShares(uint256 poolId) internal {
        address[] memory tokens = matchContract.getShareTokens();
        
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 pending = matchContract.getPendingShares(address(this), token);
            
            if (pending > 0) {
                // Track token if new
                if (!_tokenExists[token]) {
                    _tokens.push(token);
                    _tokenExists[token] = true;
                }
                
                // Claim shares from match contract
                uint256 balanceBefore = _getBalance(token);
                matchContract.claimShares(token);
                uint256 balanceAfter = _getBalance(token);
                uint256 received = balanceAfter - balanceBefore;
                
                // Assign to pool
                _poolPrizes[poolId][token] += received;
                
                emit SharesCollected(token, received);
            }
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
        if (pool.winner != msg.sender) revert NotPoolWinner();
        if (pool.prizeClaimed) revert PrizeAlreadyClaimed();
        
        pool.prizeClaimed = true;
        
        // Transfer all tokens for this pool to winner
        bool hasPrize = false;
        for (uint256 i = 0; i < _tokens.length; i++) {
            address token = _tokens[i];
            uint256 amount = _poolPrizes[poolId][token];
            
            if (amount > 0) {
                hasPrize = true;
                _poolPrizes[poolId][token] = 0;
                _transfer(token, msg.sender, amount);
                emit PrizeClaimed(poolId, msg.sender, token, amount);
            }
        }
        
        if (!hasPrize) revert NoPrizeToClaim();
    }

    /// @inheritdoc IPrize
    function getPool(uint256 poolId) external view returns (
        uint256 matchesCompleted,
        address winner,
        uint256 highestWins,
        bool finalized,
        bool prizeClaimed
    ) {
        PrizePool storage pool = _pools[poolId];
        return (
            pool.matchesCompleted,
            pool.winner,
            pool.highestWins,
            pool.finalized,
            pool.prizeClaimed
        );
    }

    /// @inheritdoc IPrize
    function getPoolWins(uint256 poolId, address player) external view returns (uint256 wins) {
        return _poolWins[poolId][player];
    }

    /// @inheritdoc IPrize
    function getPoolPrize(uint256 poolId, address token) external view returns (uint256 amount) {
        return _poolPrizes[poolId][token];
    }

    /// @inheritdoc IPrize
    function getCurrentPoolId() external view returns (uint256 poolId) {
        return _currentPoolId;
    }

    /// @inheritdoc IPrize
    function getMatchesPerPool() external view returns (uint256) {
        return matchesPerPool;
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
     * @return poolIds Array of pool IDs where player is winner and prize not claimed
     */
    function getClaimablePools(address player) external view returns (uint256[] memory poolIds) {
        // Count claimable pools first
        uint256 count = 0;
        for (uint256 i = 1; i <= _currentPoolId; i++) {
            PrizePool storage pool = _pools[i];
            if (pool.finalized && pool.winner == player && !pool.prizeClaimed) {
                count++;
            }
        }
        
        // Populate array
        poolIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= _currentPoolId; i++) {
            PrizePool storage pool = _pools[i];
            if (pool.finalized && pool.winner == player && !pool.prizeClaimed) {
                poolIds[index++] = i;
            }
        }
    }

    /// @inheritdoc IFeature
    function version() external pure returns (string memory) {
        return "1.0.0";
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
