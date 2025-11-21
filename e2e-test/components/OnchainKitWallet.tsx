'use client'

import { useSwitchChain, useChainId, useAccount } from 'wagmi'
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
  EthBalance,
} from '@coinbase/onchainkit/identity'

export function OnchainKitWallet() {
  const { switchChain, chains } = useSwitchChain()
  const chainId = useChainId()
  const { isConnected } = useAccount()

  // For development, prefer Anvil (localhost)
  const isOnAnvil = chainId === 31337
  const isOnBaseSepolia = chainId === 84532
  const isOnBase = chainId === 8453

  // Show chain switcher if not on Anvil during development
  const showChainSwitcher = isConnected && !isOnAnvil && switchChain

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
            <EthBalance />
          </Identity>
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>

      {showChainSwitcher && (
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1 text-xs text-yellow-500">
            <AlertCircle className="w-3 h-3" />
            <span>
              {isOnBaseSepolia && 'On Base Sepolia'}
              {isOnBase && 'On Base Mainnet'}
              {!isOnBaseSepolia && !isOnBase && 'Wrong network'}
            </span>
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
