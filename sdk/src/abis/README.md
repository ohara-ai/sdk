# Contract ABIs

This directory contains TypeScript ABI definitions for all contracts used in the Ohara AI SDK.

## Available ABIs

### Factory Contracts

These contracts are used to deploy instances of the feature contracts. To effectively gain control over the deployed contracts, the factory contracts deploy functions should be called by the app controller.
It is also possible for the owner to call the setController function on the deployed feature contracts to transfer control to the app controller.

#### `game/matchFactory.ts`
**Export:** `GAME_MATCH_FACTORY_ABI`

ABI for the GameMatchFactory contract, which deploys game.Match instances.

**Key Functions:**
- `deployMatch(address _controller, address _Score)` - Deploy a new game.Match instance
- `setDefaultFees(address[] _recipients, uint256[] _shares)` - Set default fee configuration
- `setDefaultMaxActiveMatches(uint256)` - Set default max active matches limit
- `getDefaultFees()` - Get default fee configuration

**Key Events:**
- `GameMatchDeployed(address instance, address owner, address controller, address gameScore)`
- `DefaultFeesUpdated(address[] recipients, uint256[] shares)`

#### `game/scoreFactory.ts`
**Export:** `SCORE_FACTORY_ABI`

ABI for the GameScoreFactory contract, which deploys game.Score instances.

**Key Functions:**
- `deployScore()` - Deploy a new game.Score instance
- `setDeploymentLimits(uint256 _maxLosersPerMatch, uint256 _maxTotalPlayers, uint256 _maxTotalMatches)` - Set limits

**Key Events:**
- `GameScoreDeployed(address instance, address owner)`
- `DeploymentLimitsUpdated(uint256, uint256, uint256)`

### Feature Contracts

#### `game/match.ts`
**Exports:** `MATCH_ABI`, `MatchStatus` (enum)

ABI for the GameMatch contract, which manages game matches with stakes.

**Key Functions:**
- `createMatch(address token, uint256 stakeAmount, uint256 maxPlayers)` - Create a new match
- `joinMatch(uint256 matchId)` - Join an existing match
- `withdrawStake(uint256 matchId)` - Withdraw stake from a match
- `configureFees(address[] _recipients, uint256[] _shares)` - Configure fee distribution
- `getMatch(uint256 matchId)` - Get match details
- `getActiveMatchIds(uint256 offset, uint256 limit)` - Get list of active match IDs

**Key Events:**
- `MatchCreated(uint256 matchId, address creator, address token, uint256 stakeAmount, uint256 maxPlayers)`
- `PlayerJoined(uint256 matchId, address player, uint256 stakeAmount)`
- `MatchFinalized(uint256 matchId, address winner, uint256 totalPrize, uint256 winnerAmount)`
- `FeesConfigured(address[] recipients, uint256[] shares, uint256 totalShare)`

**MatchStatus Enum:**
```typescript
enum MatchStatus {
  Open = 0,      // Match is open for players to join
  Active = 1,    // Match is active with full players
  Finalized = 2, // Match has been completed
  Cancelled = 3, // Match was cancelled
}
```

#### `game/score.ts`
**Export:** `SCORE_ABI`

ABI for the GameScore contract, which tracks player scores and leaderboards.

**Key Functions:**
- `recordMatchResult(uint256 matchId, address winner, address[] losers, uint256 prize)` - Record match result
- `getPlayerScore(address player)` - Get player's score details
- `getTopPlayersByWins(uint256 limit)` - Get top players by wins
- `getTopPlayersByPrize(uint256 limit)` - Get top players by prize amount
- `setRecorderAuthorization(address recorder, bool authorized)` - Authorize recorders

**Key Events:**
- `ScoreRecorded(uint256 matchId, address winner, uint256 totalWins, uint256 totalPrize)`
- `RecorderAuthorized(address recorder, bool authorized)`

## Usage

### In Your Code

```typescript
// Import individual ABIs
import { MATCH_ABI, MatchStatus } from '@/sdk/src/abis/game/match'
import { SCORE_ABI } from '@/sdk/src/abis/game/score'
import { MATCH_FACTORY_ABI } from '@/sdk/src/abis/game/matchFactory'
import { SCORE_FACTORY_ABI } from '@/sdk/src/abis/game/scoreFactory'

// Or import from the main SDK index
import { 
  MATCH_ABI, 
  SCORE_ABI,
  MATCH_FACTORY_ABI,
  SCORE_FACTORY_ABI,
  MatchStatus
} from '@/sdk'

// Use with viem
import { useReadContract } from 'wagmi'

const { data: match } = useReadContract({
  address: matchAddress,
  abi: MATCH_ABI,
  functionName: 'getMatch',
  args: [matchId],
})
```

## ABI Generation

ABIs are extracted from compiled Solidity contracts in `/contracts/out/`.

To regenerate ABIs from contracts:
```bash
# Build contracts and update ABIs
npm run sdk:update-abi
```

The update script (`scripts/update-abis.js`) automatically:
- Builds the contracts using Forge
- Extracts ABIs from all compiled contracts in `contracts/out/`
- Generates TypeScript files in `sdk/src/abis/game/`
- Updates the index file with all exports

To add a new contract to the ABI generation, edit `CONTRACT_MAPPINGS` in `scripts/update-abis.js`. The script will automatically handle the `game/` namespace for the generated files.

## Type Safety

All ABIs are exported with `as const` to ensure TypeScript can infer exact types for function names, arguments, and return values when used with libraries like viem and wagmi.
