# Deployment Security Model

## Server-Side Deployment

The GameMatch deployment flow uses **server-side signing** to provide a seamless user experience. Users don't need to connect their wallet or sign any transactions to deploy contracts.

## How It Works

1. **User clicks "Deploy"** button on the UI
2. **Client sends request** to `/api/deploy-game-match` API route
3. **Server uses private key** from environment variables to sign the deployment transaction
4. **Contract deploys** with owner/controller addresses from environment
5. **Server returns** deployed contract address to client
6. **Client saves** address to localStorage

## Environment Variables

The deployment uses these server-side environment variables:

```bash
# Private key used to sign deployment transactions (kept on server)
PRIVATE_KEY=0x...

# Owner of the deployed GameMatch contract
NEXT_PUBLIC_OWNER_ADDRESS=0x...

# Controller of the deployed GameMatch contract
NEXT_PUBLIC_CONTROLLER_ADDRESS=0x...

# RPC URL for blockchain connection
NEXT_PUBLIC_RPC_URL=http://localhost:8545

# Factory contract address (public)
NEXT_PUBLIC_GAME_MATCH_FACTORY=0x...
```

## Security Considerations

### ✅ Safe for Development

This approach is **appropriate for local development** with Anvil:

- Private keys are test keys with no real value
- Contracts are deployed on local chain only
- Server has full control over deployment parameters
- No user wallet interaction needed

### ⚠️ Production Considerations

For production deployments, consider:

1. **Private Key Management**
   - Store `PRIVATE_KEY` in secure secrets management (e.g., Vercel Secrets, AWS Secrets Manager)
   - Never commit private keys to version control
   - Rotate keys regularly
   - Use dedicated deployment accounts with minimal privileges

2. **Rate Limiting**
   - Add rate limiting to the deployment API endpoint
   - Prevent abuse and spam deployments
   - Consider requiring authentication for production

3. **Deployment Permissions**
   - Consider requiring admin authentication before allowing deployments
   - Add audit logging for all deployments
   - Implement approval workflows for production

4. **Alternative Approaches for Production**
   - **Pre-deploy contracts**: Deploy contracts during CI/CD, store addresses in ENV
   - **User-signed deployments**: Require users to sign deployment transactions with their own wallets
   - **Multi-sig deployment**: Use multi-signature wallets for production contract deployment
   - **Factory allowlist**: Restrict who can deploy from the factory contract

## Development vs Production

### Development (Current Implementation)
- Server-side signing with test private keys
- One-click deployment for rapid iteration
- localStorage persistence with chain validation
- Suitable for local Anvil development

### Production (Recommended Changes)
```typescript
// Option 1: Pre-deployed contracts
NEXT_PUBLIC_GAME_MATCH_INSTANCE=0x... // Set at deploy time

// Option 2: Require authentication
if (!isAdmin(request)) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Option 3: Use user's wallet (remove API route)
// Let users sign deployment with their own wallets
```

## Best Practices

1. **Local Development**: Use the current server-side signing approach
2. **Staging**: Pre-deploy contracts, set addresses in ENV
3. **Production**: Never expose private keys; use pre-deployed contracts or multi-sig
4. **Testing**: Use separate private keys for different environments

## File Permissions

Ensure `.env.local` and `.env` files are properly gitignored:

```bash
# .gitignore
.env
.env.local
.env*.local
```

## Monitoring

For production deployments, implement:
- Transaction monitoring and alerts
- Deployment event logging
- Cost tracking for gas fees
- Failed deployment notifications
