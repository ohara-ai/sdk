// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title IGameEventListener
 * @notice Interface for contracts that listen to game events
 */
interface IGameEventListener {
    /**
     * @notice Called when a match result is recorded
     * @param matchId The match ID
     * @param winner The winner address
     * @param losers Array of loser addresses
     * @param prizeAmount The prize amount won
     */
    function onMatchResult(
        uint256 matchId,
        address winner,
        address[] calldata losers,
        uint256 prizeAmount
    ) external;

    /**
     * @notice Called when a competition starts (for prediction betting closure)
     * @param competitionType The type of competition (0=Match, 1=Tournament, 2=LeagueCycle)
     * @param competitionId The competition ID
     */
    function onCompetitionStarted(uint8 competitionType, uint256 competitionId) external;

    /**
     * @notice Called when a competition is finalized
     * @param competitionType The type of competition
     * @param competitionId The competition ID
     * @param winner The winner address
     */
    function onCompetitionFinalized(uint8 competitionType, uint256 competitionId, address winner) external;
}

/**
 * @title EventBus
 * @notice Central event routing for game contracts
 * @dev Decouples event producers from consumers using observer pattern
 */
contract EventBus {
    // ============ Constants ============

    uint8 public constant EVENT_MATCH_RESULT = 1;
    uint8 public constant EVENT_COMPETITION_STARTED = 2;
    uint8 public constant EVENT_COMPETITION_FINALIZED = 3;

    uint256 public constant MAX_LISTENERS_PER_EVENT = 10;

    // ============ Storage ============

    /// @notice Contract owner
    address public owner;

    /// @notice Authorized event emitters
    mapping(address => bool) public authorizedEmitters;

    /// @notice Listeners per event type: eventType => listeners[]
    mapping(uint8 => address[]) private _listeners;

    /// @notice Listener index tracking: eventType => listener => index (1-based)
    mapping(uint8 => mapping(address => uint256)) private _listenerIndex;

    // ============ Events ============

    event EmitterAuthorized(address indexed emitter, bool authorized);
    event ListenerRegistered(uint8 indexed eventType, address indexed listener);
    event ListenerRemoved(uint8 indexed eventType, address indexed listener);
    event EventDispatchFailed(uint8 indexed eventType, address indexed listener, bytes reason);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ============ Errors ============

    error Unauthorized();
    error InvalidAddress();
    error TooManyListeners();
    error ListenerAlreadyRegistered();
    error ListenerNotFound();

    // ============ Modifiers ============

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyAuthorizedEmitter() {
        if (!authorizedEmitters[msg.sender]) revert Unauthorized();
        _;
    }

    // ============ Constructor ============

    constructor(address _owner) {
        if (_owner == address(0)) revert InvalidAddress();
        owner = _owner;
        emit OwnershipTransferred(address(0), _owner);
    }

    // ============ Admin Functions ============

    /**
     * @notice Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Authorize or revoke an event emitter
     * @param emitter Address to authorize/revoke
     * @param authorized Whether to authorize or revoke
     */
    function setEmitterAuthorization(address emitter, bool authorized) external onlyOwner {
        if (emitter == address(0)) revert InvalidAddress();
        authorizedEmitters[emitter] = authorized;
        emit EmitterAuthorized(emitter, authorized);
    }

    /**
     * @notice Register a listener for an event type
     * @param eventType The event type to listen for
     * @param listener The listener contract address
     */
    function registerListener(uint8 eventType, address listener) external onlyOwner {
        if (listener == address(0)) revert InvalidAddress();
        if (_listenerIndex[eventType][listener] != 0) revert ListenerAlreadyRegistered();
        if (_listeners[eventType].length >= MAX_LISTENERS_PER_EVENT) revert TooManyListeners();

        _listeners[eventType].push(listener);
        _listenerIndex[eventType][listener] = _listeners[eventType].length;

        emit ListenerRegistered(eventType, listener);
    }

    /**
     * @notice Remove a listener from an event type
     * @param eventType The event type
     * @param listener The listener to remove
     */
    function removeListener(uint8 eventType, address listener) external onlyOwner {
        uint256 index = _listenerIndex[eventType][listener];
        if (index == 0) revert ListenerNotFound();

        uint256 arrayIndex = index - 1;
        uint256 lastIndex = _listeners[eventType].length - 1;

        if (arrayIndex != lastIndex) {
            address lastListener = _listeners[eventType][lastIndex];
            _listeners[eventType][arrayIndex] = lastListener;
            _listenerIndex[eventType][lastListener] = index;
        }

        _listeners[eventType].pop();
        delete _listenerIndex[eventType][listener];

        emit ListenerRemoved(eventType, listener);
    }

    // ============ Event Dispatch ============

    /**
     * @notice Emit a match result event to all listeners
     * @param matchId The match ID
     * @param winner The winner address
     * @param losers Array of loser addresses
     * @param prizeAmount The prize amount
     */
    function emitMatchResult(
        uint256 matchId,
        address winner,
        address[] calldata losers,
        uint256 prizeAmount
    ) external onlyAuthorizedEmitter {
        address[] storage listeners = _listeners[EVENT_MATCH_RESULT];
        uint256 length = listeners.length;

        for (uint256 i = 0; i < length;) {
            try IGameEventListener(listeners[i]).onMatchResult(matchId, winner, losers, prizeAmount) {
                // Success
            } catch (bytes memory reason) {
                emit EventDispatchFailed(EVENT_MATCH_RESULT, listeners[i], reason);
            }
            unchecked { ++i; }
        }
    }

    /**
     * @notice Emit a competition started event to all listeners
     * @param competitionType The competition type
     * @param competitionId The competition ID
     */
    function emitCompetitionStarted(
        uint8 competitionType,
        uint256 competitionId
    ) external onlyAuthorizedEmitter {
        address[] storage listeners = _listeners[EVENT_COMPETITION_STARTED];
        uint256 length = listeners.length;

        for (uint256 i = 0; i < length;) {
            try IGameEventListener(listeners[i]).onCompetitionStarted(competitionType, competitionId) {
                // Success
            } catch (bytes memory reason) {
                emit EventDispatchFailed(EVENT_COMPETITION_STARTED, listeners[i], reason);
            }
            unchecked { ++i; }
        }
    }

    /**
     * @notice Emit a competition finalized event to all listeners
     * @param competitionType The competition type
     * @param competitionId The competition ID
     * @param winner The winner address
     */
    function emitCompetitionFinalized(
        uint8 competitionType,
        uint256 competitionId,
        address winner
    ) external onlyAuthorizedEmitter {
        address[] storage listeners = _listeners[EVENT_COMPETITION_FINALIZED];
        uint256 length = listeners.length;

        for (uint256 i = 0; i < length;) {
            try IGameEventListener(listeners[i]).onCompetitionFinalized(competitionType, competitionId, winner) {
                // Success
            } catch (bytes memory reason) {
                emit EventDispatchFailed(EVENT_COMPETITION_FINALIZED, listeners[i], reason);
            }
            unchecked { ++i; }
        }
    }

    // ============ View Functions ============

    /**
     * @notice Get all listeners for an event type
     * @param eventType The event type
     * @return listeners Array of listener addresses
     */
    function getListeners(uint8 eventType) external view returns (address[] memory listeners) {
        return _listeners[eventType];
    }

    /**
     * @notice Check if an address is a listener for an event type
     * @param eventType The event type
     * @param listener The address to check
     * @return isListener Whether the address is a listener
     */
    function isListener(uint8 eventType, address listener) external view returns (bool) {
        return _listenerIndex[eventType][listener] != 0;
    }
}
