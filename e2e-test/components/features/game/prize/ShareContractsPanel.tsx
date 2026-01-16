'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Share2, ExternalLink, Trash2 } from 'lucide-react'

interface ShareContractsPanelProps {
  shareContracts: readonly `0x${string}`[]
  onAddShareContract: (address: `0x${string}`) => Promise<`0x${string}`>
  onRemoveShareContract: (address: `0x${string}`) => Promise<`0x${string}`>
}

export function ShareContractsPanel({
  shareContracts,
  onAddShareContract,
  onRemoveShareContract,
}: ShareContractsPanelProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [newContractAddress, setNewContractAddress] = useState('')

  const truncateAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`

  const handleAddContract = async () => {
    if (!newContractAddress) return
    setIsUpdating(true)
    setError(null)
    setTxHash(null)
    try {
      const tx = await onAddShareContract(newContractAddress as `0x${string}`)
      setTxHash(tx)
      setNewContractAddress('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add share contract')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemoveContract = async (address: `0x${string}`) => {
    setIsUpdating(true)
    setError(null)
    setTxHash(null)
    try {
      const tx = await onRemoveShareContract(address)
      setTxHash(tx)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove share contract')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-purple-600" />
          <CardTitle className="text-gray-900">Share Contracts</CardTitle>
        </div>
        <CardDescription className="text-gray-600">
          Manage contracts that provide shares to prize pools (controller only)
        </CardDescription>
      </CardHeader>
      <div className="px-6 pb-6 space-y-4">
        {/* Current Share Contracts */}
        <div className="space-y-2">
          <div className="text-xs text-gray-600 font-medium">
            Registered Contracts ({shareContracts.length})
          </div>
          {shareContracts.length === 0 ? (
            <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 text-center">
              No share contracts registered
            </div>
          ) : (
            <div className="space-y-2">
              {shareContracts.map((address) => (
                <div
                  key={address}
                  className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
                >
                  <code className="text-xs font-mono bg-white border border-gray-200 px-2 py-1 rounded flex-1">
                    {truncateAddress(address)}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveContract(address)}
                    disabled={isUpdating}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Share Contract */}
        <div className="space-y-2">
          <Label htmlFor="shareContract" className="text-xs text-gray-700">
            Add Share Contract
          </Label>
          <div className="flex gap-2">
            <Input
              id="shareContract"
              type="text"
              value={newContractAddress}
              onChange={(e) => setNewContractAddress(e.target.value)}
              placeholder="0x..."
              className="flex-1 font-mono text-xs"
              disabled={isUpdating}
            />
            <Button
              size="sm"
              onClick={handleAddContract}
              disabled={isUpdating || !newContractAddress}
            >
              Add
            </Button>
          </div>
        </div>

        {/* Transaction Result */}
        {txHash && (
          <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Transaction submitted</span>
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-green-600 hover:text-green-700"
              >
                View <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="font-mono text-xs mt-1 break-all opacity-75">{txHash}</p>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}
      </div>
    </Card>
  )
}
