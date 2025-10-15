'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getGameMatchFactoryAddress } from '@/lib/contracts/gameMatch'
import { CheckCircle2, Loader2, Rocket, Plus, Trash2, Info } from 'lucide-react'

interface DeployContractProps {
  onDeployed: (address: `0x${string}`) => void
}

interface FeeRecipient {
  address: string
  share: string
}

export function DeployContract({ onDeployed }: DeployContractProps) {
  const [isDeploying, setIsDeploying] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deployedAddress, setDeployedAddress] = useState<`0x${string}` | null>(null)
  
  // Configuration state
  const [scoreBoardAddress, setScoreBoardAddress] = useState('0x0000000000000000000000000000000000000000')
  const [feeRecipients, setFeeRecipients] = useState<FeeRecipient[]>([])
  
  const factoryAddress = getGameMatchFactoryAddress()
  const controllerAddress = process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS || 'Not configured'

  const addFeeRecipient = () => {
    setFeeRecipients([...feeRecipients, { address: '', share: '' }])
  }

  const removeFeeRecipient = (index: number) => {
    setFeeRecipients(feeRecipients.filter((_, i) => i !== index))
  }

  const updateFeeRecipient = (index: number, field: 'address' | 'share', value: string) => {
    const updated = [...feeRecipients]
    updated[index][field] = value
    setFeeRecipients(updated)
  }

  const handleDeploy = async () => {
    if (!factoryAddress) return

    setIsDeploying(true)
    setError(null)

    try {
      // Validate fee recipients
      const validFeeRecipients = feeRecipients.filter(r => r.address && r.share)
      
      const response = await fetch('/api/deploy-game-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          factoryAddress,
          scoreBoardAddress,
          feeRecipients: validFeeRecipients.map(r => r.address),
          feeShares: validFeeRecipients.map(r => r.share),
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

  if (isSuccess && deployedAddress) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-lg">Deployment Successful</CardTitle>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <CardDescription className="mt-1">
                Your GameMatch contract is ready to use
              </CardDescription>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">Deployed Address:</p>
                <code className="inline-flex items-center px-2 py-1 rounded text-xs font-mono bg-primary/10 text-primary break-all">
                  {deployedAddress}
                </code>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setIsSuccess(false)
              setDeployedAddress(null)
              setScoreBoardAddress('0x0000000000000000000000000000000000000000')
              setFeeRecipients([])
            }}
            className="w-full"
          >
            Deploy Another Instance
          </Button>
        </CardContent>
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
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            Deploy Contract
            <div className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help underline decoration-dotted">CONTROLLER</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono text-xs">{controllerAddress}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardTitle>
          <CardDescription className="text-xs">
            Deploy new instance · Owner managed by factory
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="scoreboard" className="text-xs">ScoreBoard Address</Label>
            <Input
              id="scoreboard"
              value={scoreBoardAddress}
              onChange={(e) => setScoreBoardAddress(e.target.value)}
              placeholder="0x0000..."
              className="font-mono text-xs mt-1 h-8"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs">Fee Recipients</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFeeRecipient}
                className="h-6 px-2 gap-1"
              >
                <Plus className="w-3 h-3" />
                <span className="text-xs">Add</span>
              </Button>
            </div>

            {feeRecipients.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2 bg-muted/50 rounded-md">
                No fees configured
              </p>
            ) : (
              <div className="space-y-2">
                {feeRecipients.map((recipient, index) => (
                  <div key={index} className="flex gap-1.5 items-start p-2 bg-muted/50 rounded-md">
                    <div className="flex-1 space-y-1.5">
                      <Input
                        value={recipient.address}
                        onChange={(e) => updateFeeRecipient(index, 'address', e.target.value)}
                        placeholder="Address 0x..."
                        className="font-mono text-xs h-7"
                      />
                      <Input
                        type="number"
                        value={recipient.share}
                        onChange={(e) => updateFeeRecipient(index, 'share', e.target.value)}
                        placeholder="Share (e.g., 1000 = 10%)"
                        className="text-xs h-7"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFeeRecipient(index)}
                      className="h-7 w-7 p-0 mt-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="text-xs text-destructive p-2 rounded-md bg-destructive/10 border border-destructive/20">
              <span className="font-medium">Error:</span> {error}
            </div>
          )}

          <Button onClick={handleDeploy} size="sm" className="w-full gap-2 h-8" disabled={isDeploying}>
            {isDeploying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-xs">Deploying...</span>
              </>
            ) : (
              <>
                <Rocket className="w-3.5 h-3.5" />
                <span className="text-xs">Deploy</span>
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
