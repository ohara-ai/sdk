'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getGameMatchFactoryAddress } from '@/lib/contracts/gameMatch'
import { Plus, Trash2 } from 'lucide-react'
import { DeployFactoryContract } from '../DeployFactoryContract'

interface DeployContractProps {
  onDeployed: (address: `0x${string}`) => void
}

interface FeeRecipient {
  address: string
  share: string
}

export function DeployContract({ onDeployed }: DeployContractProps) {
  // Configuration state
  const [scoreBoardAddress, setScoreBoardAddress] = useState('0x0000000000000000000000000000000000000000')
  const [feeRecipients, setFeeRecipients] = useState<FeeRecipient[]>([])
  
  const factoryAddress = getGameMatchFactoryAddress()

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
    
    return {
      scoreBoardAddress,
      feeRecipients: validFeeRecipients.map(r => r.address),
      feeShares: validFeeRecipients.map(r => r.share),
    }
  }

  const handleDeployed = (address: `0x${string}`) => {
    setScoreBoardAddress('0x0000000000000000000000000000000000000000')
    setFeeRecipients([])
    onDeployed(address)
  }

  const configSection = (
    <>
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
    </>
  )

  return (
    <DeployFactoryContract
      factoryAddress={factoryAddress}
      factoryEnvVar="NEXT_PUBLIC_GAME_MATCH_FACTORY"
      contractName="GameMatch"
      apiRoute="/api/deploy-game-match"
      onDeployed={handleDeployed}
      configSection={configSection}
      getDeploymentBody={getDeploymentBody}
    />
  )
}
