# Contract Dependency Management - Solution Summary

## Problem Statement

Need automatic detection of which contracts are required by SDK components used in demo apps:
- **Leaderboard demo**: Uses `LeaderBoard` → needs `Scoreboard` contract
- **Tic-Tac-Toe demo**: Uses `MatchBoard` + `LeaderBoard` → needs `GameMatch` + `Scoreboard` contracts

## Implemented Solution: Component Metadata System

### ✅ What Was Implemented

A comprehensive contract dependency metadata system that allows explicit declaration of contract dependencies at the component level.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SDK Components                          │
│  ┌──────────────┐              ┌──────────────┐            │
│  │ LeaderBoard  │              │ MatchBoard  │            │
│  │  .metadata   │              │  .metadata   │            │
│  └──────┬───────┘              └──────┬───────┘            │
│         │                              │                    │
│         └────────────┬─────────────────┘                    │
│                      │                                      │
│         ┌────────────▼────────────────┐                    │
│         │  Component Registry &       │                    │
│         │  Dependency Metadata        │                    │
│         └────────────┬────────────────┘                    │
│                      │                                      │
│         ┌────────────▼────────────────┐                    │
│         │  Dependency Utilities       │                    │
│         │  - getContractDependencies  │                    │
│         │  - validateConfiguration    │                    │
│         │  - getRequiredContracts     │                    │
│         └─────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     Demo Apps                               │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ Leaderboard Demo │         │ Tic-Tac-Toe Demo │         │
│  │   config.ts      │         │   config.ts      │         │
│  │ components: [    │         │ components: [    │         │
│  │  'LeaderBoard'   │         │  'MatchBoard',  │         │
│  │ ]                │         │  'LeaderBoard'   │         │
│  │                  │         │ ]                │         │
│  └──────────────────┘         └──────────────────┘         │
│         │                              │                    │
│         └────────────┬─────────────────┘                    │
│                      │                                      │
│         ┌────────────▼────────────────┐                    │
│         │ useContractDependencies()   │                    │
│         │  - Auto-detects contracts   │                    │
│         │  - Validates configuration  │                    │
│         │  - Returns status           │                    │
│         └─────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. **Type Definitions** (`sdk/src/types/contracts.ts`)
- `ContractType` enum
- `ContractDependency` interface  
- `ComponentMetadata` interface

#### 2. **Metadata Registry** (`sdk/src/metadata/componentDependencies.ts`)
- `LEADERBOARD_METADATA`
- `MATCH_BOARD_METADATA`
- `COMPONENT_REGISTRY`

#### 3. **Dependency Utilities** (`sdk/src/utils/dependencies.ts`)
- `getContractDependencies()` - Get all deps for components
- `getRequiredContracts()` - Filter only required
- `validateContractConfiguration()` - Check env vars
- `getComponentsByContract()` - Reverse lookup

#### 4. **React Hook** (`lib/hooks/useContractDependencies.ts`)
- `useContractDependencies()` - Hook for demo apps
- Auto-validates against `process.env`

#### 5. **UI Component** (`components/ContractDependencyInfo.tsx`)
- `<ContractDependencyInfo>` - Visual dependency display
- Shows required/optional status
- Indicates configuration state

#### 6. **Demo Configs** (`app/demos/*/config.ts`)
- Explicit component declaration per demo
- Type-safe component names

#### 7. **CLI Tool** (`scripts/check-dependencies.ts`)
- Command-line dependency checker
- Validates configuration
- Lists all demos and components

## Usage Examples

### In SDK Components
```typescript
// Component automatically declares its dependencies
export function LeaderBoard({ scoreBoardAddress, ...props }) {
  // Uses SCOREBOARD_ABI internally
}
LeaderBoard.metadata = LEADERBOARD_METADATA // Contains contract deps
```

### In Demo Apps
```typescript
// 1. Create config
export const DEMO_CONFIG = {
  components: ['LeaderBoard'] as ComponentName[]
}

// 2. Use hook
const { isValid, missing } = useContractDependencies(DEMO_CONFIG.components)

// 3. Render
{isValid ? <LeaderBoard .../> : <MissingContractsError />}
```

### Programmatically
```typescript
import { getRequiredContracts } from '@/sdk/src'

const required = getRequiredContracts(['MatchBoard'])
// Returns: [{ contract: 'GameMatch', required: true, envVar: '...' }]
```

## Benefits

✅ **Automatic Detection**: Components declare their own dependencies  
✅ **Type-Safe**: TypeScript ensures valid component names  
✅ **Validation**: Auto-check if contracts are configured  
✅ **Self-Documenting**: Dependencies are explicit and discoverable  
✅ **Flexible**: Support required vs optional dependencies  
✅ **Developer-Friendly**: Clear error messages and tooling  
✅ **No Code Changes to Demos**: Can be adopted incrementally  
✅ **CLI Support**: Check dependencies from command line  

## File Structure

```
sdk/
├── src/
│   ├── types/
│   │   └── contracts.ts              # Type definitions
│   ├── metadata/
│   │   └── componentDependencies.ts  # Component metadata registry
│   ├── utils/
│   │   └── dependencies.ts           # Utility functions
│   ├── components/
│   │   ├── LeaderBoard.tsx           # Updated with metadata
│   │   └── MatchBoard.tsx           # Updated with metadata
│   ├── index.ts                      # Exports all deps utilities
│   └── CONTRACT_DEPENDENCIES.md      # Full documentation

lib/
└── hooks/
    └── useContractDependencies.ts    # React hook

components/
└── ContractDependencyInfo.tsx        # UI component

app/
└── demos/
    ├── leaderboard/
    │   └── config.ts                 # Demo config
    ├── tic-tac-toe/
    │   └── config.ts                 # Demo config
    └── IMPLEMENTATION_EXAMPLE.md     # Usage examples

scripts/
└── check-dependencies.ts             # CLI tool

CONTRACT_DEPENDENCY_SOLUTION.md       # This file
```

## Alternative Solutions Considered

### Option 2: App-Level Configuration Files
- Each demo has a `contracts.json` listing required contracts
- **Pros**: Simple, no SDK changes
- **Cons**: Duplicates info, manual maintenance, not type-safe
- **Verdict**: Less maintainable than chosen solution

### Option 3: Separate SDK Instances
- Different SDK builds for different use cases
- **Pros**: Complete isolation
- **Cons**: Massive overhead, multiple builds, version hell
- **Verdict**: Overkill for current needs

### Why Option 1 (Implemented) is Best

1. **Single Source of Truth**: Components declare what they need
2. **Automatic Propagation**: Demo dependency = sum of component dependencies
3. **Type Safety**: Compile-time checking
4. **Scalability**: Easy to add new components/demos
5. **Zero Runtime Overhead**: All validation is optional
6. **Developer Experience**: Great tooling and error messages

## Migration Path

### For New Demos
1. Create `config.ts` with component list
2. Use `useContractDependencies()` hook
3. Optionally add `<ContractDependencyInfo>`

### For Existing Demos
1. Gradual adoption - no breaking changes
2. Start with `<ContractDependencyInfo>` for visibility
3. Replace manual checks with hook validation
4. Remove hardcoded contract lists

### For New SDK Components
1. Define metadata in `componentDependencies.ts`
2. Attach to component: `Component.metadata = METADATA`
3. Add to `COMPONENT_REGISTRY`
4. Export from SDK index

## Testing

```bash
# Check all dependencies
npx ts-node scripts/check-dependencies.ts

# Check specific demo
npx ts-node scripts/check-dependencies.ts --demo=leaderboard

# Check specific component
npx ts-node scripts/check-dependencies.ts --component=MatchBoard

# Check contract usage
npx ts-node scripts/check-dependencies.ts --contract=Scoreboard
```

## Next Steps

### Immediate
1. ✅ Review implementation
2. ⬜ Update existing demos to use new system (optional)
3. ⬜ Add to SDK README
4. ⬜ Create migration guide for future components

### Future Enhancements
- Build-time validation (fail build if contracts missing)
- Auto-deploy contracts based on dependencies
- Dependency graph visualization
- Contract version compatibility checking
- Multi-chain contract address management

## Questions & Discussion

### Q: Do existing demos need to change?
**A**: No. The system is additive. Existing demos work as-is. You can adopt incrementally.

### Q: What if a component has optional contracts?
**A**: Mark `required: false` in metadata. Validation will check only required ones.

### Q: Can demos override dependencies?
**A**: Yes. Demo can check optional deps and conditionally render components.

### Q: How to handle multi-chain?
**A**: Extend `ContractDependency` with chain-specific addresses. Future enhancement.

### Q: Performance impact?
**A**: Zero if not used. Minimal if used (one-time calculation on mount).

## Conclusion

This solution provides a **robust, type-safe, and developer-friendly** way to manage contract dependencies. It:

- ✅ Solves the stated problem (automatic contract detection)
- ✅ Works with current architecture (no major refactoring)
- ✅ Scales to future components and demos
- ✅ Improves developer experience significantly
- ✅ Provides excellent tooling and documentation

**Recommendation**: Adopt incrementally. Start using `<ContractDependencyInfo>` in demos for visibility, then migrate to full validation over time.
