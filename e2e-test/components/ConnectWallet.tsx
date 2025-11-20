'use client'

import { useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { Button } from '@/components/ui/button'
import { shortenAddress } from '@/lib/utils'
import { Wallet, AlertCircle } from 'lucide-react'

export function ConnectWallet() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, chains } = useSwitchChain()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleConnect = async () => {
    try {
      console.log(
        'Available connectors:',
        connectors.map((c) => ({ id: c.id, name: c.name, type: c.type })),
      )

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

  // Prevent hydration mismatch by not rendering dynamic content until mounted
  if (!mounted) {
    return (
      <Button variant="outline" disabled>
        <Wallet className="w-4 h-4 mr-2" />
        Loading...
      </Button>
    )
  }

  if (isConnected && address) {
    const isWrongChain = chain?.id !== 31337

    return (
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => disconnect()}>
            {shortenAddress(address)}
          </Button>
        </div>
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
