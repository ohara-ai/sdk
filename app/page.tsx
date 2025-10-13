'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'
import { useDeployedGameMatchAddress } from '@/lib/hooks/useDeployedAddress'
import { DeployContract } from '@/components/features/game-match/DeployContract'

export default function Home() {
  const { address, setAddress, isValidating, isFromEnv } = useDeployedGameMatchAddress()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleDeployed = (newAddress: `0x${string}`) => {
    setAddress(newAddress)
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">On-Chain Features</h1>
          <p className="text-xl text-muted-foreground">
            Interactive demos for modular on-chain gaming features
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex flex-col gap-4">
            <Link href="/features/game-match" className={!address ? 'pointer-events-none opacity-60' : ''}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle>Game Match</CardTitle>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <CardDescription className="text-base">
                    Escrow-based match system with stake management and winner selection
                  </CardDescription>
                  <div className="mt-4">
                    {mounted && !isValidating && address ? (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Contract Address:</div>
                        <code className="inline-flex items-center px-3 py-1 rounded-md text-sm font-mono bg-primary/10 text-primary">
                          {formatAddress(address)}
                        </code>
                        {isFromEnv && (
                          <div className="text-xs text-muted-foreground mt-1">
                            (from environment)
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-muted text-muted-foreground">
                        Not Deployed
                      </span>
                    )}
                  </div>
                </CardHeader>
              </Card>
            </Link>
            {mounted && !isValidating && !address && (
              <DeployContract onDeployed={handleDeployed} />
            )}
          </div>
        </div>

        <div className="mt-12 p-6 rounded-lg bg-muted/50">
          <h2 className="text-xl font-semibold mb-2">Getting Started</h2>
          <p className="text-muted-foreground mb-4">
            Connect your wallet to interact with the features. Each feature is deployed as an
            independent smart contract that can be easily integrated into your gaming application.
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Smart contracts are deployed through efficient factory patterns</li>
            <li>All features include comprehensive test coverage</li>
            <li>Demo applications showcase real-world usage patterns</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
