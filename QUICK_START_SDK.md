# Quick Start: SDK Development

This guide will help you get started with the newly restructured project.

## Project Structure Overview

The project has been reorganized into three main areas:

1. **`/sdk`** - The npm package with reusable UI components (LeaderBoard, WageringBox)
2. **`/app`** - The demo application showcasing SDK components
3. **`/contract-testing`** - Internal testing environment for contracts (formerly the main app)

## Getting Started

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install SDK dependencies
npm run sdk:install
```

### 2. Build the SDK

```bash
# Build the SDK package
npm run sdk:build

# Or run in watch mode during development
npm run sdk:dev
```

### 3. Deploy Contracts (Local Development)

```bash
# Terminal 1: Start Anvil
anvil

# Terminal 2: Deploy contracts
forge script contracts/script/DeployGameMatchFactory.s.sol:DeployGameMatchFactory \
  --rpc-url http://localhost:8545 \
  --broadcast

forge script contracts/script/DeployScoreBoard.s.sol:DeployScoreBoard \
  --rpc-url http://localhost:8545 \
  --broadcast
```

### 4. Configure Environment

```bash
# Copy example env file
cp .env.example .env.local

# Edit .env.local and add your deployed contract addresses:
# NEXT_PUBLIC_GAME_MATCH_FACTORY=0x...
# NEXT_PUBLIC_SCOREBOARD_ADDRESS=0x...
```

### 5. Run the Demo App

```bash
npm run dev
```

Visit http://localhost:3000 to see:
- **Home**: Overview and navigation
- **Tic-Tac-Toe Demo**: Wagered game using both SDK components
- **Leaderboard Demo**: Interactive leaderboard showcase
- **Contract Testing**: Internal testing interface

## SDK Components

### LeaderBoard

Displays player rankings from a ScoreBoard contract.

**Features**:
- Sortable by wins or total prize
- Configurable display limit
- Statistics overview
- Top 3 highlighting

**Usage**:
```tsx
import { LeaderBoard } from '@/sdk/src/components/LeaderBoard'

<LeaderBoard 
  scoreBoardAddress="0x..."
  limit={10}
  sortBy="wins"
  showStats={true}
/>
```

### WageringBox

Enables creating and joining wagered matches.

**Features**:
- Create new matches with custom stakes
- Join existing matches
- ETH wagering support
- Transaction status handling

**Usage**:
```tsx
import { WageringBox } from '@/sdk/src/components/WageringBox'

<WageringBox 
  gameMatchAddress="0x..."
  onMatchCreated={(id) => console.log('Created:', id)}
  onMatchJoined={(id) => console.log('Joined:', id)}
/>
```

## Development Workflow

### Working on SDK Components

1. Make changes in `/sdk/src/components/`
2. Run `npm run sdk:dev` to watch for changes
3. Test in the demo app at `/app/demos/`
4. Run `npm run sdk:build` before committing

### Adding New Demos

1. Create a new folder in `/app/demos/[demo-name]/`
2. Create a `page.tsx` with your demo
3. Import SDK components
4. Add a link from the home page

### Testing Contracts

1. Visit `/contract-testing` in the demo app
2. Use the existing testing interface
3. Deploy and interact with contracts directly

## Project Commands

### SDK Commands
```bash
npm run sdk:install    # Install SDK dependencies
npm run sdk:build      # Build SDK package
npm run sdk:dev        # Watch mode for SDK development
```

### App Commands
```bash
npm run dev            # Start Next.js dev server
npm run build          # Build production app
npm run start          # Start production server
```

### Contract Commands
```bash
npm run forge:build    # Build Solidity contracts
npm run forge:test     # Run contract tests
npm run forge:coverage # Generate coverage report
```

## Key Files

- **`/sdk/package.json`** - SDK package configuration
- **`/sdk/src/index.ts`** - SDK public exports
- **`/app/page.tsx`** - Demo app home page
- **`/app/demos/tic-tac-toe/page.tsx`** - Tic-tac-toe game demo
- **`/app/demos/leaderboard/page.tsx`** - Leaderboard showcase
- **`/tsconfig.json`** - TypeScript configuration with SDK path alias

## Documentation

- **`README.md`** - Main project documentation
- **`SDK_INTEGRATION_GUIDE.md`** - How to integrate SDK in external apps
- **`ARCHITECTURE.md`** - Detailed architecture overview
- **`sdk/README.md`** - SDK-specific documentation

## Next Steps

1. **Explore the demos** at http://localhost:3000
2. **Read the architecture** in `ARCHITECTURE.md`
3. **Try the SDK** in your own components
4. **Add new features** following the proposal process in `/proposals`

## Troubleshooting

### SDK not building
- Ensure you ran `npm run sdk:install`
- Check for TypeScript errors in `/sdk/src/`

### Components not found in demo app
- Run `npm run sdk:build` first
- Check the import path uses `@/sdk/src/components/`

### Contracts not deployed
- Ensure Anvil is running
- Check RPC URL in `.env.local`
- Verify deployment scripts completed successfully

### Styling issues
- Ensure TailwindCSS is configured
- Check that lucide-react icons are installed
- Verify all SDK dependencies are installed

## Support

For questions or issues:
- Check the demos in `/app/demos/`
- Review SDK source in `/sdk/src/`
- Read integration guide in `SDK_INTEGRATION_GUIDE.md`
