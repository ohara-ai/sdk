'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, ExternalLink } from 'lucide-react'

interface RecorderAuthPanelProps {
  onSetRecorderAuthorization: (recorder: `0x${string}`, authorized: boolean) => Promise<`0x${string}`>
}

export function RecorderAuthPanel({ onSetRecorderAuthorization }: RecorderAuthPanelProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [recorderAddress, setRecorderAddress] = useState('')

  const handleAuthorize = async (authorized: boolean) => {
    if (!recorderAddress) return
    setIsUpdating(true)
    setError(null)
    setTxHash(null)
    try {
      const tx = await onSetRecorderAuthorization(recorderAddress as `0x${string}`, authorized)
      setTxHash(tx)
      setRecorderAddress('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set recorder authorization')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          <CardTitle className="text-gray-900">Recorder Authorization</CardTitle>
        </div>
        <CardDescription className="text-gray-600">
          Authorize contracts to record match results (controller only)
        </CardDescription>
      </CardHeader>
      <div className="px-6 pb-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="recorder" className="text-xs text-gray-700">
            Recorder Contract Address
          </Label>
          <Input
            id="recorder"
            type="text"
            value={recorderAddress}
            onChange={(e) => setRecorderAddress(e.target.value)}
            placeholder="0x... (e.g., Score contract)"
            className="font-mono text-xs"
            disabled={isUpdating}
          />
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => handleAuthorize(true)}
            disabled={isUpdating || !recorderAddress}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            Authorize
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAuthorize(false)}
            disabled={isUpdating || !recorderAddress}
            className="flex-1 text-red-600 hover:text-red-700"
          >
            Revoke
          </Button>
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
