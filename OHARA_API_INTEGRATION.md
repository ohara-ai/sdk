# Ohara API Integration

This document describes the Ohara API integration that enables managed deployments and controller operations.

## Overview

The SDK now supports two modes of operation for server-side controller actions:

1. **Direct On-Chain Mode** (Default): Executes transactions directly using a controller private key
2. **Ohara API Mode**: Delegates operations to the Ohara API for managed deployments

## Mode Selection

The SDK automatically switches to **Ohara API Mode** when both environment variables are set:

```bash
OHARA_CONTROLLER_TOKEN=your_token_here
OHARA_API_URL=https://api.ohara.ai
```

Without these variables, the SDK operates in **Direct On-Chain Mode** using the controller private key from storage.

## What Changes in API Mode

### Controller Operations

When API mode is enabled, the following operations are executed via the Ohara API:

- **`activate(matchId)`**: Match activation via API
- **`finalize(matchId, winner)`**: Match finalization via API

These operations automatically:

- Submit requests to the API with authentication
- Wait for transaction confirmation
- Return transaction hash
- Throw errors on failure

### Deployment Operations

Contract deployments use the API endpoints:

- **`deployGameScore()`**: Deploys via `/v2/miniapp-controller/deploy` with `ScoreFactory` type
- **`deployGameMatch()`**: Deploys via `/v2/miniapp-controller/deploy` with `MatchFactory` type

### Controller Address

In API mode, the controller address is fetched from:

```
GET /v2/miniapp-controller/wallet
```

Returns:

```json
{
  "address": "0x...",
  "balance": "1000000000000000000",
  "lastFundedAt": "2024-01-01T00:00:00Z"
}
```

## API Endpoints Used

### 1. Get Wallet Info

```
GET /v2/miniapp-controller/wallet
Authorization: Bearer <OHARA_CONTROLLER_TOKEN>
```

### 2. Deploy Contract

```
POST /v2/miniapp-controller/deploy
Authorization: Bearer <OHARA_CONTROLLER_TOKEN>
Content-Type: application/json

{
  "factoryType": "MatchFactory" | "ScoreFactory",
  "scoreAddress": "0x..." (optional, for MatchFactory),
  "chainId": 1
}
```

Returns:

```json
{
  "contractAddress": "0x...",
  "txHash": "0x...",
  "contractType": "Match" | "Score",
  "deploymentId": "uuid"
}
```

### 3. Execute Contract Function

```
POST /v2/miniapp-controller/execute
Authorization: Bearer <OHARA_CONTROLLER_TOKEN>
Content-Type: application/json

{
  "contractAddress": "0x...",
  "functionName": "activate" | "finalize",
  "params": {
    "matchId": "1",
    "winner": "0x..." (for finalize only)
  },
  "chainId": 1
}
```

Returns:

```json
{
  "txHash": "0x...",
  "transactionId": "uuid",
  "status": "PENDING"
}
```

### 4. Get Transaction Status

```
GET /v2/miniapp-controller/transaction/:txHash
Authorization: Bearer <OHARA_CONTROLLER_TOKEN>
```

Returns:

```json
{
  "txHash": "0x...",
  "status": "PENDING" | "CONFIRMED" | "FAILED",
  "gasUsed": "21000",
  "errorMessage": "error details (if failed)",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

## Code Examples

### Server Context Creation

```typescript
import { createServerOharaAi } from '@ohara-ai/sdk/server'

// Automatically detects mode based on environment variables
const { game, app, isApiMode } = await createServerOharaAi()

console.log('API Mode:', isApiMode) // true if OHARA_CONTROLLER_TOKEN is set
console.log('Controller Address:', app.controller.address) // Fetched from API in API mode
```

### Match Operations

```typescript
const { game } = await createServerOharaAi()

// Works in both modes - automatically uses API if configured
if (game.match.operations) {
  // Activate match
  const hash = await game.match.operations.activate(matchId)

  // Finalize match
  const hash = await game.match.operations.finalize(matchId, winnerAddress)
}
```

### Deployment

```typescript
import { deployGameScore, deployGameMatch } from '@ohara-ai/sdk/server'

// Automatically uses API if OHARA_CONTROLLER_TOKEN is set
const scoreResult = await deployGameScore({})

const matchResult = await deployGameMatch({
  gameScoreAddress: scoreResult.address,
})
```

### Direct API Client Usage

```typescript
import { OharaApiClient } from '@ohara-ai/sdk/server'

// Check if API mode is configured
if (OharaApiClient.isConfigured()) {
  const client = new OharaApiClient()

  // Get wallet info
  const wallet = await client.getWallet()

  // Deploy contract
  const result = await client.deployContract({
    factoryType: 'ScoreFactory',
    chainId: 1,
  })

  // Execute function
  const tx = await client.executeContractFunction({
    contractAddress: '0x...',
    functionName: 'activate',
    params: { matchId: '1' },
    chainId: 1,
  })

  // Wait for confirmation
  const status = await client.waitForTransaction(tx.txHash)
}
```

## Implementation Details

### File Structure

- `sdk/src/server/oharaApiClient.ts`: API client implementation
- `sdk/src/server/createServerContext.ts`: Server context with mode detection
- `sdk/src/core/game/match.ts`: Match operations with API support
- `sdk/src/deployment/deployGameMatch.ts`: Match deployment with API support
- `sdk/src/deployment/deployGameScore.ts`: Score deployment with API support

### Mode Detection

```typescript
// In createServerContext.ts
const isApiMode = OharaApiClient.isConfigured()

if (isApiMode) {
  // Use API for controller operations
  const apiClient = getOharaApiClient()
  const walletInfo = await apiClient.getWallet()
  controllerAddress = walletInfo.address
} else {
  // Use direct on-chain execution
  const privateKey = await getControllerKey()
  const account = privateKeyToAccount(privateKey)
  // ...
}
```

### Transaction Waiting

The API client includes automatic transaction polling:

```typescript
// Polls every 2 seconds with 60 second timeout
const status = await apiClient.waitForTransaction(txHash, {
  pollingInterval: 2000,
  timeout: 60000,
})

if (status.status === 'FAILED') {
  throw new Error(`Transaction failed: ${status.errorMessage}`)
}
```

## Migration Guide

### From Direct Mode to API Mode

1. Obtain your Ohara API token and URL
2. Set environment variables:
   ```bash
   OHARA_CONTROLLER_TOKEN=your_token
   OHARA_API_URL=https://api.ohara.ai
   ```
3. Restart your application - no code changes needed!

The SDK will automatically:

- Fetch controller address from API
- Route operations through API endpoints
- Handle transaction confirmations

### Testing Both Modes

You can test both modes by toggling the environment variables:

```bash
# Test API mode
OHARA_CONTROLLER_TOKEN=xxx OHARA_API_URL=https://api.ohara.ai npm run dev

# Test direct mode (unset or remove variables)
npm run dev
```

## Limitations

### Fee Configuration in API Mode

When using `deployGameMatch()` in API mode, fee configuration is currently skipped as it typically requires contract owner privileges. If you need custom fee configuration:

1. Deploy via API
2. Manually configure fees using contract owner account
3. Or request an API endpoint for fee configuration

### Authorization in API Mode

Score recorder authorization is typically handled by the API backend during deployment. Manual authorization may be needed if deploying cross-contract setups.

## Error Handling

All API operations throw descriptive errors:

```typescript
try {
  await game.match.operations.activate(matchId)
} catch (error) {
  // Errors include API error messages
  console.error('Activation failed:', error.message)
  // e.g., "Transaction failed: Insufficient balance"
  // or "Ohara API request failed: 401 Unauthorized"
}
```

## Security Notes

- **Never commit** `OHARA_CONTROLLER_TOKEN` to version control
- Store tokens in secure environment variable management (e.g., Doppler, AWS Secrets Manager)
- Tokens are sent as Bearer authentication in API requests
- API communication should use HTTPS in production
