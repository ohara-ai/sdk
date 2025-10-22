'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Link2 } from 'lucide-react'
import { DeployFactoryContract } from '../DeployFactoryContract'
import { useOharaAi } from '@/sdk/src/context/OnchainContext'
import { ContractType } from '@/sdk/src/types/contracts'

interface DeployContractProps {
  onDeployed: (address: `0x${string}`) => void
  deployedGameScoreAddress?: `0x${string}` | null
}

interface FeeRecipient {
  address: string
  share: string
}

export function DeployContract({ onDeployed, deployedGameScoreAddress: propGameScoreAddress }: DeployContractProps) {
  // Configuration state
  const [useDeployedGameScore, setUseDeployedGameScore] = useState(false)
  const [feeRecipients, setFeeRecipients] = useState<FeeRecipient[]>([])
  
  const { getContractAddress, factoryAddresses, deployGameMatch } = useOharaAi()
  const hookGameScoreAddress = getContractAddress(ContractType.GAMESCORE)
  
  // Use prop if provided, otherwise fall back to hook (prop takes precedence for reactivity)
  const deployedGameScoreAddress = propGameScoreAddress ?? hookGameScoreAddress

  // Reset toggle when scoreboard address changes (e.g., new deployment)
  useEffect(() => {
    if (!deployedGameScoreAddress) {
      setUseDeployedGameScore(false)
    }
  }, [deployedGameScoreAddress])

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

  const getDeploymentBody = () => {
    // Validate fee recipients
    const validFeeRecipients = feeRecipients.filter(r => r.address && r.share)
    
    // Use deployed scoreboard if toggle is enabled and address exists
    const finalGameScoreAddress = useDeployedGameScore && deployedGameScoreAddress 
      ? deployedGameScoreAddress 
      : '0x0000000000000000000000000000000000000000'
    
    return {
      gameScoreAddress: finalGameScoreAddress,
      feeRecipients: validFeeRecipients.map(r => r.address),
      feeShares: validFeeRecipients.map(r => r.share),
    }
  }

  const handleDeployed = (address: `0x${string}`) => {
    setUseDeployedGameScore(false)
    setFeeRecipients([])
    onDeployed(address)
  }

  const configSection = (
    <>
      <div>
        <Label htmlFor="scoreboard" className="text-sm font-medium text-gray-900">GameScore Integration</Label>
        <div className="mt-1.5 space-y-2">
          <Button
            type="button"
            variant={useDeployedGameScore ? "default" : "outline"}
            size="sm"
            onClick={() => setUseDeployedGameScore(!useDeployedGameScore)}
            disabled={!deployedGameScoreAddress}
            className="w-full gap-2 h-9"
          >
            <Link2 className="w-4 h-4" />
            {useDeployedGameScore 
              ? "GameScore Enabled (Auto-Authorized)" 
              : deployedGameScoreAddress
                ? "Enable GameScore Integration"
                : "No GameScore Deployed"}
          </Button>
          {!deployedGameScoreAddress && (
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-600">
                Deploy a GameScore contract first to enable integration
              </p>
            </div>
          )}
          {useDeployedGameScore && deployedGameScoreAddress && (
            <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs font-medium text-green-900 mb-1">GameScore Address</p>
              <code className="text-xs font-mono text-green-700 break-all">{deployedGameScoreAddress}</code>
              <p className="text-xs text-green-700 mt-2">
                ✓ GameMatch will be automatically authorized to record results
              </p>
            </div>
          )}
        </div>
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
    </>
  )

  const gameMatchAddress = getContractAddress(ContractType.GAME_MATCH)

  return (
    <DeployFactoryContract
      factoryAddress={factoryAddresses.gameMatchFactory}
      factoryEnvVar="NEXT_PUBLIC_GAME_MATCH_FACTORY"
      contractName="Game Match"
      contractDescription="Escrow-based match system with stake management and winner selection"
      deployFunction={deployGameMatch}
      onDeployed={handleDeployed}
      configSection={configSection}
      getDeploymentBody={getDeploymentBody}
      deployedAddress={gameMatchAddress}
      featuresLink="/contract-testing/features/game-match"
    />
  )
}
