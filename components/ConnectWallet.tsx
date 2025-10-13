'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import { shortenAddress } from '@/lib/utils'
import { Wallet } from 'lucide-react'

export function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, error } = useConnect()
  const { disconnect } = useDisconnect()

  const handleConnect = async () => {
    try {
      console.log('Available connectors:', connectors.map(c => ({ id: c.id, name: c.name, type: c.type })))
      
      if (connectors.length === 0) {
        console.error('No connector available')
        return
      }
      
      // Use the first available connector (MetaMask preferred)
      const connector = connectors[0]
      console.log('Connecting with:', connector.name, connector.id)
      
      await connect({ connector })
      console.log('Connection initiated with:', connector.name)
    } catch (err: any) {
      console.error('Connection error:', err?.message || err)
    }
  }

  if (isConnected && address) {
    return (
      <Button variant="outline" onClick={() => disconnect()}>
        {shortenAddress(address)}
      </Button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={handleConnect}>
        <Wallet className="w-4 h-4 mr-2" />
        Connect Wallet
      </Button>
      {error && (
        <p className="text-xs text-red-500">
          {error.message || 'Failed to connect'}
        </p>
      )}
    </div>
  )
}
