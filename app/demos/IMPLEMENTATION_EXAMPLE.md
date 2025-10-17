# Contract Dependencies Implementation Examples

This document shows how to implement the contract dependency system in your demo apps.

## Example 1: Leaderboard Demo (Simple)

### Before
```typescript
// app/demos/leaderboard/page.tsx
export default function LeaderboardDemoPage() {
  // Hardcoded address check
  const scoreBoardAddress = (process.env.NEXT_PUBLIC_SCOREBOARD_ADDRESS || 
    '0x0000000000000000000000000000000000000000') as `0x${string}`

  // Manual validation
  if (scoreBoardAddress === '0x0000000000000000000000000000000000000000') {
    return <div>ScoreBoard contract not configured.</div>
  }

  return <LeaderBoard scoreBoardAddress={scoreBoardAddress} />
}
```

### After
```typescript
// app/demos/leaderboard/page.tsx
import { useContractDependencies } from '@/lib/hooks/useContractDependencies'
import { ContractDependencyInfo } from '@/components/ContractDependencyInfo'
import { DEMO_CONFIG } from './config'

export default function LeaderboardDemoPage() {
  const { isValid } = useContractDependencies(DEMO_CONFIG.components)
  
  const scoreBoardAddress = process.env.NEXT_PUBLIC_SCOREBOARD_ADDRESS as `0x${string}`

  return (
    <div>
      {/* Show dependency status */}
      <ContractDependencyInfo components={DEMO_CONFIG.components} />
      
      {/* Only render if valid */}
      {isValid && scoreBoardAddress && (
        <LeaderBoard scoreBoardAddress={scoreBoardAddress} />
      )}
    </div>
  )
}
```

## Example 2: Tic-Tac-Toe Demo (Complex)

### Before
```typescript
// app/demos/tic-tac-toe/page.tsx
export default function TicTacToePage() {
  const { address: gameMatchAddress } = useDeployedGameMatchAddress()
  const scoreBoardAddress = process.env.NEXT_PUBLIC_SCOREBOARD_ADDRESS as `0x${string}`

  return (
    <div>
      {gameMatchAddress ? (
        <WageringBox gameMatchAddress={gameMatchAddress} />
      ) : (
        <div>GameMatch contract not deployed.</div>
      )}
      
      {scoreBoardAddress !== '0x0000000000000000000000000000000000000000' ? (
        <LeaderBoard scoreBoardAddress={scoreBoardAddress} />
      ) : (
        <div>ScoreBoard contract not configured.</div>
      )}
    </div>
  )
}
```

### After
```typescript
// app/demos/tic-tac-toe/page.tsx
import { useContractDependencies } from '@/lib/hooks/useContractDependencies'
import { ContractDependencyInfo } from '@/components/ContractDependencyInfo'
import { DEMO_CONFIG } from './config'

export default function TicTacToePage() {
  const { validation } = useContractDependencies(DEMO_CONFIG.components)
  const { address: gameMatchAddress } = useDeployedGameMatchAddress()
  const scoreBoardAddress = process.env.NEXT_PUBLIC_SCOREBOARD_ADDRESS as `0x${string}`

  // Check if GameMatch is configured (required)
  const hasGameMatch = validation.configured.some(
    c => c.contract === 'GameMatch'
  )
  
  // Check if Scoreboard is configured (optional for this demo)
  const hasScoreboard = scoreBoardAddress && 
    scoreBoardAddress !== '0x0000000000000000000000000000000000000000'

  return (
    <div>
      {/* Automatic dependency info */}
      <ContractDependencyInfo components={DEMO_CONFIG.components} />
      
      {/* WageringBox - required */}
      {hasGameMatch && gameMatchAddress && (
        <WageringBox gameMatchAddress={gameMatchAddress} />
      )}
      
      {/* LeaderBoard - optional */}
      {hasScoreboard && (
        <LeaderBoard scoreBoardAddress={scoreBoardAddress} />
      )}
    </div>
  )
}
```

## Example 3: Programmatic Dependency Checking

```typescript
import { 
  getContractDependencies, 
  getRequiredContracts,
  ContractType 
} from '@/sdk/src'

// Get all dependencies for your components
const components = ['LeaderBoard', 'WageringBox']
const deps = getContractDependencies(components)

console.log('All dependencies:', deps)
// Output:
// [
//   { contract: 'Scoreboard', required: true, envVar: 'NEXT_PUBLIC_SCOREBOARD_ADDRESS' },
//   { contract: 'GameMatch', required: true, envVar: 'NEXT_PUBLIC_GAME_MATCH_INSTANCE' }
// ]

// Get only required
const required = getRequiredContracts(components)

// Find which components use a contract
import { getComponentsByContract } from '@/sdk/src'
const scoreboardUsers = getComponentsByContract(ContractType.SCOREBOARD)
// Output: ['LeaderBoard']
```

## Example 4: Custom Validation UI

```typescript
import { useContractDependencies, getMissingContractsMessage } from '@/lib/hooks/useContractDependencies'
import { DEMO_CONFIG } from './config'

export default function CustomDemoPage() {
  const { isValid, missing, required } = useContractDependencies(DEMO_CONFIG.components)

  if (!isValid) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-bold text-red-900 mb-4">
          Configuration Required
        </h2>
        <p className="text-red-800 mb-4">
          {getMissingContractsMessage(missing)}
        </p>
        <div className="space-y-2">
          <p className="font-semibold text-red-900">Required contracts:</p>
          <ul className="list-disc list-inside space-y-1">
            {required.map(dep => (
              <li key={dep.contract} className="text-red-800">
                <strong>{dep.contract}</strong>: {dep.description}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  return <div>Your demo content...</div>
}
```

## Example 5: Build-Time Validation Script

```typescript
// scripts/validate-demo-contracts.ts
import { getRequiredContracts } from './sdk/src'

const demos = {
  leaderboard: ['LeaderBoard'],
  'tic-tac-toe': ['WageringBox', 'LeaderBoard'],
}

for (const [demoName, components] of Object.entries(demos)) {
  console.log(`\n${demoName} demo:`)
  
  const required = getRequiredContracts(components)
  
  console.log(`  Uses: ${components.join(', ')}`)
  console.log(`  Requires:`)
  
  for (const dep of required) {
    console.log(`    - ${dep.contract} (${dep.envVar})`)
  }
}
```

Output:
```
leaderboard demo:
  Uses: LeaderBoard
  Requires:
    - Scoreboard (NEXT_PUBLIC_SCOREBOARD_ADDRESS)

tic-tac-toe demo:
  Uses: WageringBox, LeaderBoard
  Requires:
    - GameMatch (NEXT_PUBLIC_GAME_MATCH_INSTANCE)
    - Scoreboard (NEXT_PUBLIC_SCOREBOARD_ADDRESS)
```

## Best Practices

1. **Always create a config.ts**: Define components used in each demo
2. **Use the hook early**: Call `useContractDependencies` at the top of your component
3. **Show dependency info**: Use `<ContractDependencyInfo>` in development mode
4. **Handle missing contracts gracefully**: Show helpful error messages
5. **Mark truly optional deps**: If a component can work without a contract, mark it optional
6. **Keep metadata updated**: When adding new contracts, update component metadata

## Testing Your Implementation

1. **Clear environment variables** to test missing contract handling
2. **Configure one contract at a time** to verify individual dependencies
3. **Check console warnings** for unregistered components
4. **Validate error messages** are helpful to developers
5. **Test both required and optional** contract scenarios
