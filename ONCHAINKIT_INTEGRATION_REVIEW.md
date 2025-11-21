# OnchainKit Integration Review

## Executive Summary

This document reviews the integration of OnchainKit from Base.org into the OharaAI SDK e2e-test application. The goal is to replace the custom `ConnectWallet` component with OnchainKit's `<Wallet />` component while ensuring seamless compatibility with the existing SDK.

## Current Architecture

### Provider Stack (e2e-test/components/Providers.tsx)
```tsx
<WagmiProvider config={config}>
  <QueryClientProvider client={queryClient}>
    <OharaAiWagmiProvider>
      {children}
    </OharaAiWagmiProvider>
  </QueryClientProvider>
</WagmiProvider>
```

### Key Components
- **Wagmi Configuration** (`e2e-test/lib/wagmi.ts`): Manages wallet connectors (MetaMask, injected wallets)
- **OharaAiWagmiProvider** (`sdk/src/context/OharaAiWagmiProvider.tsx`): Bridges wagmi hooks to SDK context
- **ConnectWallet** (`e2e-test/components/ConnectWallet.tsx`): Custom wallet connection UI

### SDK Integration Points
The `OharaAiWagmiProvider` automatically:
1. Reads `usePublicClient()`, `useWalletClient()`, `useChainId()` from wagmi
2. Passes these clients to the SDK's `OharaAiProvider`
3. Fetches contract addresses from `/api/sdk/addresses?chainId=<chainId>`
4. Creates operation instances for game contracts

## OnchainKit Requirements

### Dependencies
```bash
npm install @coinbase/onchainkit
```

**Already satisfied**: `react`, `react-dom`, `wagmi`, `viem` are present in e2e-test

### Provider Setup
OnchainKit requires `<OnchainKitProvider>` wrapping the app with:
- `apiKey`: Coinbase Developer Platform API key
- `chain`: Primary chain (e.g., `base`, `baseSepolia`, or custom chains)
- `config`: Optional appearance and wallet preferences

### Styles Import
```tsx
import '@coinbase/onchainkit/styles.css';
```

## Integration Strategy

### Recommended Approach: Co-existence with Custom Wagmi Config

OnchainKit is designed to work alongside custom wagmi configurations. This is the **optimal path** because:

1. **Preserves Existing Infrastructure**: Your wagmi config with custom chains (anvil, sepolia, mainnet) remains intact
2. **SDK Compatibility**: OharaAiWagmiProvider continues to work without modification
3. **Incremental Adoption**: You can use OnchainKit components while keeping custom logic

### Provider Architecture

```tsx
'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { OnchainKitProvider } from '@coinbase/onchainkit'
import { config } from '@/lib/wagmi'
import { OharaAiWagmiProvider } from '@ohara-ai/sdk'
import '@coinbase/onchainkit/styles.css'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={config.chains[0]} // or specify your primary chain
          config={{
            appearance: {
              mode: 'auto', // 'light' | 'dark' | 'auto'
            },
            wallet: {
              display: 'modal', // 'modal' | 'drawer'
            },
          }}
        >
          <OharaAiWagmiProvider>
            {children}
          </OharaAiWagmiProvider>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

**Key Points**:
- OnchainKitProvider wraps OharaAiWagmiProvider but stays inside WagmiProvider
- Both share the same wagmi configuration
- SDK continues to receive clients from wagmi hooks unchanged

## Wallet Component Replacement

### Current ConnectWallet (Custom)
Location: `e2e-test/components/ConnectWallet.tsx`

Features:
- Wallet connection with MetaMask/injected wallets
- Address display (shortened)
- Chain switching (to localhost/Anvil)
- Disconnect functionality
- Error handling

### OnchainKit Wallet (Replacement)

**Basic Implementation**:
```tsx
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet'
import {
  Address,
  Avatar,
  Name,
  Identity,
} from '@coinbase/onchainkit/identity'

export function OnchainKitWallet() {
  return (
    <Wallet>
      <ConnectWallet>
        <Avatar className="h-6 w-6" />
        <Name />
      </ConnectWallet>
      <WalletDropdown>
        <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
          <Avatar />
          <Name />
          <Address />
        </Identity>
        <WalletDropdownDisconnect />
      </WalletDropdown>
    </Wallet>
  )
}
```

### Feature Parity Considerations

| Feature | Custom ConnectWallet | OnchainKit Wallet | Notes |
|---------|---------------------|-------------------|-------|
| Wallet Connection | ✅ | ✅ | Both use wagmi connectors |
| Address Display | ✅ (custom shortened) | ✅ (ENS/basename support) | OnchainKit has richer identity |
| Disconnect | ✅ | ✅ | Built-in |
| Chain Switching | ✅ (custom UI) | ⚠️ | May need custom implementation |
| Error Display | ✅ | ⚠️ | Custom error UI may be needed |
| Loading State | ✅ | ✅ | Built-in |

### Chain Switching Challenge

**Current Implementation**: Custom UI to switch to localhost (Anvil, chainId 31337)

**OnchainKit**: Doesn't have built-in chain switching UI but works with wagmi's `useSwitchChain`

**Solution**: Keep custom chain switching logic separate or create a hybrid component:

```tsx
import { useSwitchChain, useChainId } from 'wagmi'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet'
import { Identity, Avatar, Name, Address } from '@coinbase/onchainkit/identity'

export function HybridWallet() {
  const { switchChain } = useSwitchChain()
  const chainId = useChainId()
  const isWrongChain = chainId !== 31337

  return (
    <div className="flex flex-col items-end gap-2">
      <Wallet>
        <ConnectWallet>
          <Avatar className="h-6 w-6" />
          <Name />
        </ConnectWallet>
        <WalletDropdown>
          <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar />
            <Name />
            <Address />
          </Identity>
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
      
      {isWrongChain && switchChain && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-yellow-500">
            <AlertCircle className="w-3 h-3" />
            <span>Wrong network</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => switchChain({ chainId: 31337 })}
          >
            Switch to Localhost
          </Button>
        </div>
      )}
    </div>
  )
}
```

## SDK Compatibility Analysis

### ✅ Full Compatibility - No Changes Needed

**Why**:
1. **Shared Wagmi Context**: Both OnchainKit and OharaAiWagmiProvider read from the same wagmi hooks
2. **No Interference**: OnchainKitProvider doesn't override wagmi providers, it only adds UI components
3. **Client Independence**: SDK operations receive the same `publicClient` and `walletClient` regardless of UI components

**Test Confirmation**:
```tsx
// This pattern works seamlessly
<WagmiProvider config={config}>
  <QueryClientProvider client={queryClient}>
    <OnchainKitProvider apiKey={apiKey} chain={chain}>
      <OharaAiWagmiProvider>
        {/* Both SDK hooks and OnchainKit components work here */}
        <YourApp />
      </OharaAiWagmiProvider>
    </OnchainKitProvider>
  </QueryClientProvider>
</WagmiProvider>
```

### SDK Operations Continue Working

```tsx
function GameComponent() {
  const { game } = useOharaAi() // ✅ Works unchanged
  
  const createMatch = async () => {
    // ✅ SDK receives the same walletClient from wagmi
    // Whether user connected via custom component or OnchainKit
    const hash = await game.match.operations.create({
      token: '0x0000000000000000000000000000000000000000',
      stakeAmount: parseEther('0.1'),
      maxPlayers: 2,
    })
    return hash
  }
}
```

## Implementation Steps

### Step 1: Install OnchainKit
```bash
cd e2e-test
npm install @coinbase/onchainkit
```

### Step 2: Configure Environment Variables
Add to `e2e-test/.env` or `e2e-test/.env.local`:
```bash
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_api_key_here
```

Get API key from: https://portal.cdp.coinbase.com/

### Step 3: Update Providers
Edit `e2e-test/components/Providers.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { OnchainKitProvider } from '@coinbase/onchainkit'
import { config } from '@/lib/wagmi'
import { OharaAiWagmiProvider } from '@ohara-ai/sdk'
import '@coinbase/onchainkit/styles.css'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={config.chains[0]}
        >
          <OharaAiWagmiProvider>
            {children}
          </OharaAiWagmiProvider>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

### Step 4: Create New Wallet Component
Create `e2e-test/components/OnchainKitWallet.tsx`:
```tsx
'use client'

import { useSwitchChain, useChainId } from 'wagmi'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet'
import {
  Address,
  Avatar,
  Name,
  Identity,
} from '@coinbase/onchainkit/identity'

export function OnchainKitWallet() {
  const { switchChain } = useSwitchChain()
  const chainId = useChainId()
  const isWrongChain = chainId !== 31337

  return (
    <div className="flex flex-col items-end gap-2">
      <Wallet>
        <ConnectWallet>
          <Avatar className="h-6 w-6" />
          <Name />
        </ConnectWallet>
        <WalletDropdown>
          <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar />
            <Name />
            <Address />
          </Identity>
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
      
      {isWrongChain && switchChain && (
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1 text-xs text-yellow-500">
            <AlertCircle className="w-3 h-3" />
            <span>Wrong network</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => switchChain({ chainId: 31337 })}
          >
            Switch to Localhost
          </Button>
        </div>
      )}
    </div>
  )
}
```

### Step 5: Replace in Main Page
Edit `e2e-test/app/page.tsx`:
```tsx
// Old import
// import { ConnectWallet } from '@/components/ConnectWallet'

// New import
import { OnchainKitWallet } from '@/components/OnchainKitWallet'

// In the component JSX
<div className="flex items-center gap-3">
  <OnchainKitWallet />
  {/* ... rest of the code */}
</div>
```

### Step 6: Test Integration
1. Start the development server: `npm run dev`
2. Test wallet connection with MetaMask/injected wallets
3. Verify chain switching to localhost works
4. Test SDK operations (create match, get leaderboard)
5. Confirm address display and disconnect work

## Chain Configuration Considerations

### Current Chains (e2e-test/lib/wagmi.ts)
```tsx
chains: [anvil, sepolia, mainnet]
```

### OnchainKit Primary Chain
You need to decide which chain to set as `primary` in OnchainKitProvider:

**Option 1: Local Development (Anvil)**
```tsx
<OnchainKitProvider
  apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
  chain={anvil} // Local development
>
```

**Option 2: Base Testnet**
If you want to add Base support:
```tsx
import { base, baseSepolia } from 'wagmi/chains'

export const config = createConfig({
  chains: [anvil, sepolia, mainnet, baseSepolia, base],
  // ... rest of config
})

// Then in provider
<OnchainKitProvider
  apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
  chain={baseSepolia} // or base for mainnet
>
```

**Option 3: Dynamic Chain Selection**
```tsx
<OnchainKitProvider
  apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
  chain={process.env.NODE_ENV === 'production' ? base : baseSepolia}
>
```

## Benefits of OnchainKit Integration

### 1. Rich Identity Features
- **Basenames**: Onchain usernames (like ENS)
- **Avatar Support**: Automatically fetches user avatars
- **ENS Resolution**: Shows ENS names when available

### 2. Better UX
- Polished, production-ready UI components
- Consistent design patterns from Base ecosystem
- Built-in loading states and animations

### 3. Smart Wallet Support
- Coinbase Smart Wallet integration
- Account abstraction features
- Gasless transactions (when supported)

### 4. Maintained by Coinbase/Base
- Regular updates and bug fixes
- Security audits
- Community support

### 5. Future Features
- Transaction components (Swap, NFT minting)
- Frame components (Farcaster integration)
- Additional identity features

## Potential Challenges & Solutions

### Challenge 1: API Key Required
**Issue**: OnchainKit requires a Coinbase Developer Platform API key

**Solution**: 
- Free tier available at https://portal.cdp.coinbase.com/
- Add to environment variables
- Falls back gracefully if not provided (with limited features)

### Challenge 2: Custom Chain Support (Anvil)
**Issue**: OnchainKit is optimized for Base/Ethereum chains, not local testnets

**Solution**:
- OnchainKit components still work because they use wagmi
- The `chain` prop is primarily for OnchainKit-specific features (like Basenames)
- Your custom wagmi config handles actual chain connections

### Challenge 3: Styling Conflicts
**Issue**: OnchainKit uses its own CSS that might conflict with existing styles

**Solution**:
- OnchainKit components are highly customizable via `className` props
- Use Tailwind to override styles: `className="bg-blue-800 hover:bg-blue-900"`
- CSS modules can scope OnchainKit styles if needed

### Challenge 4: Chain Switching UI
**Issue**: OnchainKit doesn't include built-in chain switcher

**Solution**: 
- Implemented in the hybrid component above
- Keep custom UI for chain switching
- OnchainKit handles wallet connection, custom code handles chains

## Testing Checklist

- [ ] Install @coinbase/onchainkit dependency
- [ ] Add NEXT_PUBLIC_ONCHAINKIT_API_KEY to environment
- [ ] Update Providers.tsx with OnchainKitProvider
- [ ] Create OnchainKitWallet component
- [ ] Replace ConnectWallet import in app/page.tsx
- [ ] Test wallet connection (MetaMask)
- [ ] Test wallet connection (other injected wallets)
- [ ] Verify chain switching to Anvil (31337)
- [ ] Test SDK operations (create match)
- [ ] Test SDK operations (get leaderboard)
- [ ] Verify address display in dropdown
- [ ] Test disconnect functionality
- [ ] Check for console errors
- [ ] Verify no styling conflicts
- [ ] Test on mobile viewport (responsive)

## Alternative Integration Patterns

### Pattern 1: Side-by-Side (A/B Testing)
Keep both components and let users choose:
```tsx
const [useOnchainKit, setUseOnchainKit] = useState(false)

{useOnchainKit ? <OnchainKitWallet /> : <ConnectWallet />}
```

### Pattern 2: Gradual Migration
Use OnchainKit on certain pages:
```tsx
// On main page - use OnchainKit
import { OnchainKitWallet } from '@/components/OnchainKitWallet'

// On admin pages - keep custom
import { ConnectWallet } from '@/components/ConnectWallet'
```

### Pattern 3: Feature Detection
Use OnchainKit when Base chain is detected:
```tsx
const chainId = useChainId()
const isBaseChain = chainId === 8453 || chainId === 84532

{isBaseChain ? <OnchainKitWallet /> : <ConnectWallet />}
```

## Conclusion

### Recommended Integration Route

**✅ RECOMMENDED**: Implement the hybrid approach (Step 4 component)

**Rationale**:
1. **Zero SDK Changes**: OharaAiWagmiProvider works unchanged
2. **Best of Both Worlds**: OnchainKit UI + custom chain switching
3. **Future-Proof**: Easy to add Base-specific features later
4. **Low Risk**: Falls back gracefully if OnchainKit issues occur
5. **Incremental**: Can migrate gradually, page by page

### Implementation Timeline

**Phase 1 (1-2 hours)**: Basic Setup
- Install dependencies
- Configure providers
- Create basic OnchainKit wallet component

**Phase 2 (2-3 hours)**: Feature Parity
- Add chain switching UI
- Test all wallet connectors
- Verify SDK operations

**Phase 3 (1 hour)**: Polish & Testing
- Style customization
- Error handling
- Cross-browser testing

**Total Estimate**: 4-6 hours for complete integration

### Success Criteria
- ✅ Users can connect wallets via OnchainKit UI
- ✅ All SDK operations continue to work
- ✅ Chain switching to Anvil functions correctly
- ✅ No performance degradation
- ✅ No breaking changes to existing functionality

### Next Steps After Integration
1. **Enable Base Chain Support**: Add base/baseSepolia to wagmi config
2. **Implement Basenames**: Show user's basename if available
3. **Add Smart Wallet Features**: Leverage account abstraction
4. **Transaction Components**: Use OnchainKit's swap/mint components
5. **Identity Features**: Avatar, badges, verification

## Resources

- [OnchainKit Documentation](https://docs.base.org/onchainkit/)
- [OnchainKit GitHub](https://github.com/coinbase/onchainkit)
- [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
- [Base Chain Info](https://docs.base.org/)
- [Wagmi Documentation](https://wagmi.sh/)

## Support

For issues during integration:
1. Check OnchainKit examples: https://github.com/coinbase/onchainkit-examples
2. Base Discord: https://base.org/discord
3. OnchainKit GitHub Issues: https://github.com/coinbase/onchainkit/issues
