# OCI-001: Game Match

## Metadata

- **ID**: OCI-001
- **Title**: Game Match - Escrow-Based Match System
- **Status**: implemented
- **Created**: 2025-10-13
- **Updated**: 2025-10-13
- **Category**: gaming

## Summary

GameMatch is an escrow-based match system enabling players to stake tokens in competitive matches with automated prize distribution. The system manages match lifecycle from creation through finalization, with optional scoreboard integration and configurable fee distribution.

## Problem Statement

### Background

On-chain gaming needs trustless, transparent systems for competitive matches where players wager stakes. Traditional solutions require:
- Trust in centralized servers for prize distribution
- Manual verification of winners
- Complex refund mechanisms
- Opaque fee structures

### User Need

Game developers and players need:
- **Trust**: Automated, transparent prize distribution
- **Flexibility**: Support for various token types (native & ERC20)
- **Control**: Ability to withdraw before match starts
- **Transparency**: Clear fee structure and match status

### Current Limitations

Existing solutions typically:
- Rely on centralized escrow services
- Lack on-chain verification
- Have poor integration with gaming systems
- Provide limited flexibility for different game types

### Use Cases

1. **Tournament Matches**: Players stake tokens to enter tournaments with winner-takes-all prizes
2. **Casual Wagering**: Friends create matches with small stakes for casual games
3. **Ranked Play**: Competitive matches with scoreboard integration tracking win/loss records
4. **Multi-Player Battles**: Support for 2+ player matches with flexible configuration

## Proposed Solution

### Overview

GameMatch provides a smart contract escrow system where:
1. Match creators define stake amount, token, and max players
2. Players join by staking the required amount
3. Players can withdraw stakes before match activation
4. Controller activates match, locking all stakes
5. Controller finalizes match, distributing prizes to winner
6. Optional fees are distributed to configured recipients
7. Results optionally recorded to scoreboard

### Key Features

- **Flexible Staking**: Support for native tokens (ETH) and ERC20 tokens
- **Lifecycle Management**: Open → Active → Finalized status progression
- **Withdrawal Window**: Players can withdraw before activation
- **Automated Distribution**: Winner automatically receives all stakes minus fees
- **Fee Configuration**: Owner-configurable fee recipients and shares
- **Scoreboard Integration**: Optional recording of match results
- **Gas Optimization**: Cleanup of match data after finalization

### Design Principles

- **Trustless**: No reliance on external parties for prize distribution
- **Transparent**: All operations emit events and are publicly verifiable
- **Flexible**: Support various game types, player counts, and tokens
- **Efficient**: Minimal gas costs through strategic storage cleanup
- **Composable**: Integrates with other features via standard interfaces

### User Flow

```
1. Creator calls createMatch(token, stakeAmount, maxPlayers)
   → Match created in Open status
   → Creator automatically joins as first player

2. Other players call joinMatch(matchId)
   → Stakes transferred to contract
   → Players added to match

3. [Optional] Players call withdrawStake(matchId)
   → Only while status is Open
   → Stake returned, player removed

4. Controller calls activateMatch(matchId)
   → Status changes to Active
   → No more joins/withdrawals allowed
   → Players locked in

5. Game happens off-chain
   
6. Controller calls finalizeMatch(matchId, winner)
   → Status changes to Finalized
   → Fees distributed (if configured)
   → Winner receives remaining prize pool
   → Results recorded to scoreboard (if configured)
   → Match data cleaned up
```

## Interface Specification

### Contract Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title IGameMatch
 * @notice Interface for escrow-based match system
 */
interface IGameMatch {
    // ============ Enums ============
    
    enum MatchStatus {
        Open,      // Accepting players, stakes can be withdrawn
        Active,    // Match in progress, stakes locked
        Finalized  // Match complete, prizes distributed
    }
    
    // ============ Structs ============
    
    struct Match {
        address token;                      // Address(0) for native token
        uint256 stakeAmount;                // Required stake per player
        uint256 maxPlayers;                 // Maximum players allowed
        address[] players;                  // Array of player addresses
        mapping(address => uint256) stakes; // Player => stake amount
        MatchStatus status;                 // Current match status
        address winner;                     // Winner address (set on finalize)
    }
    
    // ============ Events ============
    
    /// @notice Emitted when a new match is created
    event MatchCreated(
        uint256 indexed matchId,
        address indexed creator,
        address token,
        uint256 stakeAmount,
        uint256 maxPlayers
    );
    
    /// @notice Emitted when a player joins a match
    event PlayerJoined(
        uint256 indexed matchId,
        address indexed player,
        uint256 stakeAmount
    );
    
    /// @notice Emitted when a player withdraws their stake
    event PlayerWithdrew(
        uint256 indexed matchId,
        address indexed player,
        uint256 stakeAmount
    );
    
    /// @notice Emitted when a match is activated
    event MatchActivated(
        uint256 indexed matchId,
        address[] players
    );
    
    /// @notice Emitted when a match is finalized
    event MatchFinalized(
        uint256 indexed matchId,
        address indexed winner,
        uint256 totalPrize,
        uint256 winnerAmount
    );
    
    // ============ Functions ============
    
    /**
     * @notice Create a new match
     * @param token Token address (address(0) for native token)
     * @param stakeAmount Required stake amount per player
     * @param maxPlayers Maximum number of players
     * @return matchId The ID of the created match
     */
    function createMatch(
        address token,
        uint256 stakeAmount,
        uint256 maxPlayers
    ) external payable returns (uint256 matchId);
    
    /**
     * @notice Join an existing match
     * @param matchId ID of the match to join
     */
    function joinMatch(uint256 matchId) external payable;
    
    /**
     * @notice Withdraw stake from an open match
     * @param matchId ID of the match to withdraw from
     */
    function withdrawStake(uint256 matchId) external;
    
    /**
     * @notice Activate a match (controller only)
     * @param matchId ID of the match to activate
     */
    function activateMatch(uint256 matchId) external;
    
    /**
     * @notice Finalize a match and distribute prizes (controller only)
     * @param matchId ID of the match to finalize
     * @param winner Address of the winning player
     */
    function finalizeMatch(uint256 matchId, address winner) external;
    
    /**
     * @notice Get match details
     * @param matchId ID of the match
     * @return token Token address
     * @return stakeAmount Stake amount per player
     * @return maxPlayers Maximum players
     * @return players Array of player addresses
     * @return status Current match status
     * @return winner Winner address (if finalized)
     */
    function getMatch(uint256 matchId) 
        external 
        view 
        returns (
            address token,
            uint256 stakeAmount,
            uint256 maxPlayers,
            address[] memory players,
            MatchStatus status,
            address winner
        );
    
    /**
     * @notice Get a player's stake in a match
     * @param matchId ID of the match
     * @param player Address of the player
     * @return Stake amount
     */
    function getPlayerStake(uint256 matchId, address player) 
        external 
        view 
        returns (uint256);
}
```

### State Management

```solidity
contract GameMatch {
    // Match ID counter for unique identifiers
    uint256 private _matchIdCounter;
    
    // Match ID => Match data
    mapping(uint256 => Match) private _matches;
    
    // Optional integrations
    IScoreBoard public scoreBoard;
    address[] public feeRecipients;
    uint256[] public feeShares; // Basis points (100 = 1%)
    uint256 public totalFeeShare;
}
```

### Access Control

- **Public Functions**:
  - `createMatch()` - Any user can create a match
  - `joinMatch()` - Any user can join an open match
  - `withdrawStake()` - Players can withdraw from open matches
  - `getMatch()` - Anyone can view match data
  - `getPlayerStake()` - Anyone can view player stakes

- **Owner-Only Functions**:
  - `setScoreBoard()` - Configure scoreboard integration
  - `configureFees()` - Set fee recipients and shares

- **Controller-Only Functions**:
  - `activateMatch()` - Lock stakes and start match
  - `finalizeMatch()` - Distribute prizes and record results

## Integration

### Dependencies

#### Required Base Contracts

- `IFeature` - Implements `version()` and `featureName()` for feature identification
- `FeatureController` - Provides `onlyOwner` and `onlyController` access control
- `Owned` - Base ownership functionality

#### Optional Integrations

- `IScoreBoard` - Records match results (wins/losses) for players
  - Called in `finalizeMatch()` if configured
  - Receives: matchId, winner, losers array, prize amount
  - No return value expected

### Inter-Contract Communication

```
GameMatch --> IScoreBoard: recordMatchResult()
  Called when: Match is finalized
  Data sent: matchId, winner, losers, totalPrize
  
GameMatch --> ERC20: transferFrom() / transfer()
  Called when: Players join/prizes distributed
  Data sent: from, to, amount
  
GameMatch --> Native Transfer: call{value}()
  Called when: Native token prizes distributed
  Data sent: amount in wei
```

### External Dependencies

- **Tokens**: 
  - Native token (ETH/MATIC/etc.) for gas-free staking
  - Any ERC20 token implementing standard `transfer()` and `transferFrom()`
  
- **Off-Chain**:
  - Controller service to activate and finalize matches
  - Game server to determine match outcomes

## Implementation Details

### Gas Optimization

- **Storage Cleanup**: Delete player stakes and arrays after finalization
- **Single Storage Slot**: Use enums and packed structs where possible
- **Minimal Loops**: Limit iterations in cleanup and fee distribution
- **Events Over Storage**: Emit events for historical data rather than storing

### Storage Cleanup

After `finalizeMatch()`:
```solidity
function _cleanupMatch(uint256 matchId) internal {
    Match storage m = _matches[matchId];
    address[] memory players = m.players;
    
    // Delete individual stakes
    for (uint256 i = 0; i < players.length; i++) {
        delete m.stakes[players[i]];
    }
    
    // Delete player array
    delete m.players;
}
```

This provides gas refunds and prevents storage bloat.

### Upgrade Strategy

**Immutable Pattern**: Contract is not upgradeable
- Simple and secure
- No proxy complexity
- Future versions deployed as new contracts
- Migration handled by factory pattern

## Security Considerations

### Threat Model

1. **Reentrancy**: External calls during transfers could reenter
2. **Front-running**: Players could see activation and try to join
3. **Controller Abuse**: Controller could finalize incorrectly
4. **DOS**: Maximum players could prevent match from filling
5. **Token Incompatibility**: Non-standard ERC20s could fail

### Mitigations

1. **Checks-Effects-Interactions**: State changes before external calls
2. **Status Guards**: Status checks prevent actions after activation
3. **Controller Trust**: System requires trusted controller (documented limitation)
4. **Player Limits**: Max players configured at creation (2-100 reasonable)
5. **Transfer Validation**: Check return values and data from token calls

### Access Control Risks

**Controller Role**: Has power to:
- Activate matches (locks stakes)
- Finalize matches (distributes prizes)

**Mitigation**: 
- Controller should be trusted backend service
- Future: Multi-sig or DAO governance
- Events provide transparency

### Economic Risks

- **No MEV Risk**: Match outcomes determined off-chain
- **No Front-running Value**: Joining before others has no advantage
- **Fee Risk**: Max 50% fee enforced in `configureFees()`

### Known Limitations

1. **Trust in Controller**: Requires honest match finalization
2. **No Tie Support**: Single winner only
3. **No Partial Refunds**: Winner-takes-all model
4. **Token Standard**: Assumes standard ERC20 implementation

## Testing Strategy

### Unit Tests

- [x] Create match with valid parameters
- [x] Create match with invalid parameters (zero stake, < 2 players)
- [x] Join match successfully
- [x] Join full match (fails)
- [x] Join already-joined match (fails)
- [x] Withdraw stake before activation
- [x] Withdraw after activation (fails)
- [x] Activate match with sufficient players
- [x] Activate match with < 2 players (fails)
- [x] Finalize match with valid winner
- [x] Finalize match with non-player (fails)
- [x] Fee distribution calculation
- [x] Scoreboard integration

### Integration Tests

- [x] Full match lifecycle (create → join → activate → finalize)
- [x] Multiple players joining and withdrawing
- [x] ERC20 token transfers
- [x] Native token transfers
- [x] Fee distribution to multiple recipients
- [x] Scoreboard result recording

### Fuzz Testing

- Fuzz stake amounts (1 wei to max uint256)
- Fuzz player counts (2 to 100)
- Fuzz fee configurations (0 to 5000 basis points)

### Test Coverage Target

- Achieved: 100% line coverage
- All critical paths tested with multiple scenarios

## Deployment Plan

### Factory Contract

Uses `GameMatchFactory` for efficient deployment:

```solidity
contract GameMatchFactory is OwnedFactory {
    uint256 public defaultMaxActiveMatches;
    address[] public defaultFeeRecipients;
    uint256[] public defaultFeeShares;
    
    event GameMatchDeployed(
        address indexed instance, 
        address indexed owner, 
        address indexed controller,
        address scoreBoard
    );
    
    function setDefaultFees(
        address[] calldata _recipients,
        uint256[] calldata _shares
    ) external onlyOwner {
        // Configure default fees for all new deployments
        defaultFeeRecipients = _recipients;
        defaultFeeShares = _shares;
    }
    
    function deployGameMatch(
        address _controller,
        address _scoreBoard
    ) 
        external 
        returns (address instance) 
    {
        address instanceOwnerAddress = getInstanceOwner();
        instance = address(
            new GameMatch(
                instanceOwnerAddress,
                _controller,
                _scoreBoard,
                defaultMaxActiveMatches,
                defaultFeeRecipients,  // Default fees from factory
                defaultFeeShares       // Applied at deployment
            )
        );
        emit GameMatchDeployed(instance, instanceOwnerAddress, _controller, _scoreBoard);
    }
}
```

### Initial Configuration

```solidity
// 1. Deploy factory
GameMatchFactory factory = new GameMatchFactory();

// 2. Configure default fees (optional, but recommended)
address[] memory feeRecipients = new address[](2);
feeRecipients[0] = feeRecipient1;
feeRecipients[1] = feeRecipient2;
uint256[] memory feeShares = new uint256[](2);
feeShares[0] = 250;  // 2.5%
feeShares[1] = 250;  // 2.5%
factory.setDefaultFees(feeRecipients, feeShares);

// 3. Deploy GameMatch instances (will use default fees)
address gameMatch = factory.deployGameMatch(
    controllerAddress,  // Can activate and finalize matches
    scoreBoardAddress   // Scoreboard integration (use address(0) if not used)
);

// Note: Fees are automatically configured at deployment from factory defaults
// Fees can still be updated after deployment by the instance owner if needed
GameMatch(gameMatch).configureFees(newRecipients, newShares);
```

### Migration Path

Not applicable - initial implementation.

For future versions:
1. Deploy new GameMatch contract
2. Update frontend to use new address
3. Allow existing matches to complete on old contract
4. Direct new matches to new contract

## Success Criteria

### Functional Requirements

- [x] Support native and ERC20 tokens
- [x] Players can create, join, and withdraw from matches
- [x] Controller can activate and finalize matches
- [x] Prizes distributed correctly with fee deduction
- [x] Scoreboard integration works
- [x] Match data cleaned up after finalization

### Performance Requirements

- [x] Gas cost for `createMatch()` < 150k gas
- [x] Gas cost for `joinMatch()` < 100k gas
- [x] Gas cost for `finalizeMatch()` < 200k gas
- [x] Supports up to 100 players per match
- [x] No gas limit issues with cleanup

### Quality Requirements

- [x] 100% test coverage achieved
- [ ] Security audit pending
- [x] Documentation complete

## Timeline

- **Proposal**: 2025-10-13
- **Implementation**: Completed
- **Testing**: Completed
- **Deployment**: Ready for testnet

## Alternatives Considered

### Alternative 1: Multi-Winner Distribution

**Pros**: 
- Support for ties and ranking systems
- More flexible prize distribution
- Could handle tournament brackets

**Cons**: 
- Significantly more complex
- Higher gas costs
- Most use cases need single winner

**Rejected because**: Single winner covers 90% of use cases, multi-winner can be separate feature

### Alternative 2: Built-in Game Logic

**Pros**: 
- Fully on-chain verification
- No trust in controller needed
- Provably fair

**Cons**: 
- Game-specific (not generic)
- Extremely high gas costs
- Limited game complexity

**Rejected because**: Goal is generic match escrow, not specific game implementation

### Alternative 3: Upgradeable Proxy

**Pros**:
- Can fix bugs post-deployment
- Can add features without redeployment

**Cons**:
- Added complexity
- Security risks with upgrade mechanism
- Gas overhead

**Rejected because**: Immutable contracts are simpler and more secure for escrow

## Open Questions

1. **Multi-winner support**: Should this be added as optional feature? 
   - **Decision**: Defer to FP-002 if needed

2. **Time limits**: Should matches auto-cancel after X time?
   - **Decision**: Not in v1, add if users request

3. **Partial withdrawals**: Allow withdrawing portion of stake?
   - **Decision**: No, adds complexity without clear value

## References

- [ERC20 Token Standard](https://eips.ethereum.org/EIPS/eip-20)
- [Checks-Effects-Interactions Pattern](https://fravoll.github.io/solidity-patterns/checks_effects_interactions.html)
- [Foundry Testing Documentation](https://book.getfoundry.sh/forge/testing)

## Changelog

- 2025-10-13: Initial proposal (retroactive documentation of implemented feature)
