'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import { shortenAddress } from '@/lib/utils'
import { Wallet } from 'lucide-react'
import { injected } from 'wagmi/connectors'

export function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <Button variant="outline" onClick={() => disconnect()}>
        {shortenAddress(address)}
      </Button>
    )
  }

  return (
    <Button onClick={() => connect({ connector: injected() })}>
      <Wallet className="w-4 h-4 mr-2" />
      Connect Wallet
    </Button>
  )
}
