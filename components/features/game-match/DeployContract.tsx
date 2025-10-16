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
      <Card className="border-2 border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-red-900">Factory Not Configured</CardTitle>
          <CardDescription className="mt-1.5 text-red-700">
            Please set NEXT_PUBLIC_GAME_MATCH_FACTORY in your .env file
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (isSuccess && deployedAddress) {
    return (
      <Card className="border-2 border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-base font-semibold text-green-900">Deployment Successful</CardTitle>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <CardDescription className="mt-1 text-green-700">
                Your GameMatch contract is ready to use
              </CardDescription>
              <div className="mt-4">
                <p className="text-xs font-medium text-green-900 mb-2">Deployed Address</p>
                <code className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-mono bg-white text-green-700 border border-green-200 break-all">
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
            className="w-full border-green-300 text-green-700 hover:bg-green-100"
          >
            Deploy Another Instance
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isDeploying) {
    return (
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-blue-900">Deploying...</CardTitle>
              <CardDescription className="mt-1.5 text-blue-700">
                Deployment in progress...
              </CardDescription>
            </div>
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card className="border-2 border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              Deploy Contract
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  <span className="font-mono">CONTROLLER</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-mono text-xs">{controllerAddress}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <CardDescription className="text-xs text-gray-600 mt-1.5">
            Deploy new instance · Owner managed by factory
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="scoreboard" className="text-sm font-medium text-gray-900">ScoreBoard Address</Label>
            <Input
              id="scoreboard"
              value={scoreBoardAddress}
              onChange={(e) => setScoreBoardAddress(e.target.value)}
              placeholder="0x0000..."
              className="font-mono text-xs mt-1.5 h-9 border-gray-300"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-gray-900">Fee Recipients</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFeeRecipient}
                className="h-7 px-2.5 gap-1.5 border-gray-300"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-xs">Add</span>
              </Button>
            </div>

            {feeRecipients.length === 0 ? (
              <div className="text-xs text-gray-600 p-3 bg-gray-50 rounded-lg border border-gray-200">
                No fees configured
              </div>
            ) : (
              <div className="space-y-2.5">
                {feeRecipients.map((recipient, index) => (
                  <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={recipient.address}
                        onChange={(e) => updateFeeRecipient(index, 'address', e.target.value)}
                        placeholder="Address 0x..."
                        className="font-mono text-xs h-8 border-gray-300"
                      />
                      <Input
                        type="number"
                        value={recipient.share}
                        onChange={(e) => updateFeeRecipient(index, 'share', e.target.value)}
                        placeholder="Share (e.g., 1000 = 10%)"
                        className="text-xs h-8 border-gray-300"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFeeRecipient(index)}
                      className="h-8 w-8 p-0 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="text-xs text-red-700 p-3 rounded-lg bg-red-50 border border-red-200">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          <Button onClick={handleDeploy} size="sm" className="w-full gap-2 h-9" disabled={isDeploying}>
            {isDeploying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Deploying...</span>
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                <span className="text-sm">Deploy Contract</span>
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
