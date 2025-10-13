'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getGameMatchFactoryAddress } from '@/lib/contracts/gameMatch'
import { AlertCircle, CheckCircle2, Loader2, Rocket } from 'lucide-react'

interface DeployContractProps {
  onDeployed: (address: `0x${string}`) => void
}

export function DeployContract({ onDeployed }: DeployContractProps) {
  const [isDeploying, setIsDeploying] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deployedAddress, setDeployedAddress] = useState<`0x${string}` | null>(null)

  const factoryAddress = getGameMatchFactoryAddress()

  const handleDeploy = async () => {
    if (!factoryAddress) return

    setIsDeploying(true)
    setError(null)

    try {
      const response = await fetch('/api/deploy-game-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          factoryAddress,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Deployment failed')
      }

      if (data.address) {
        setDeployedAddress(data.address)
        setIsSuccess(true)
        onDeployed(data.address)
      } else {
        throw new Error('No address returned from deployment')
      }
    } catch (err) {
      console.error('Deployment error:', err)
      setError(err instanceof Error ? err.message : 'Deployment failed')
    } finally {
      setIsDeploying(false)
    }
  }

  if (!factoryAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Factory Not Configured</CardTitle>
          <CardDescription className="mt-1.5">
            Please set NEXT_PUBLIC_GAME_MATCH_FACTORY in your .env file
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (isSuccess) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Deployment Successful</CardTitle>
              <CardDescription className="mt-1.5">
                Your GameMatch contract is ready to use
              </CardDescription>
            </div>
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
        </CardHeader>
      </Card>
    )
  }

  if (isDeploying) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Deploying...</CardTitle>
              <CardDescription className="mt-1.5">
                Deployment in progress...
              </CardDescription>
            </div>
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">Deploy Contract</CardTitle>
            <CardDescription className="mt-1.5">
              Deploy a new GameMatch instance
            </CardDescription>
          </div>
          <Button onClick={handleDeploy} size="sm" className="gap-2" disabled={isDeploying}>
            <Rocket className="w-4 h-4" />
            Deploy
          </Button>
        </div>
      </CardHeader>
      {error && (
        <CardContent>
          <div className="text-sm text-destructive p-3 rounded-md bg-muted">
            <span className="font-medium">Error:</span> {error}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
