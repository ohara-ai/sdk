'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlusCircle, Trash2, Users, Loader2 } from 'lucide-react'
import { useOharaAi } from '@ohara-ai/sdk'
import { isAddress } from 'viem'

/**
 * Form component for creating new tournaments
 */
export function CreateTournamentForm() {
  const { game } = useOharaAi()
  const [participants, setParticipants] = useState<string[]>(['', ''])
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const addParticipant = () => {
    if (participants.length < 64) {
      setParticipants([...participants, ''])
    }
  }

  const removeParticipant = (index: number) => {
    if (participants.length > 2) {
      setParticipants(participants.filter((_, i) => i !== index))
    }
  }

  const updateParticipant = (index: number, value: string) => {
    const updated = [...participants]
    updated[index] = value
    setParticipants(updated)
  }

  const isPowerOfTwo = (n: number) => {
    return n > 0 && (n & (n - 1)) === 0
  }

  const validateParticipants = (): string | null => {
    const count = participants.length
    
    if (count < 2) {
      return 'At least 2 participants required'
    }
    
    if (count > 64) {
      return 'Maximum 64 participants allowed'
    }
    
    if (!isPowerOfTwo(count)) {
      return `Participant count must be a power of 2 (2, 4, 8, 16, 32, 64). Current: ${count}`
    }

    const validAddresses = participants.filter(p => p.trim() !== '')
    if (validAddresses.length !== count) {
      return 'All participant addresses must be filled'
    }

    for (let i = 0; i < participants.length; i++) {
      if (!isAddress(participants[i])) {
        return `Invalid address at position ${i + 1}`
      }
    }

    const uniqueAddresses = new Set(participants.map(p => p.toLowerCase()))
    if (uniqueAddresses.size !== participants.length) {
      return 'Duplicate addresses detected'
    }

    return null
  }

  const handleCreate = async () => {
    setError(null)
    setSuccess(null)

    const validationError = validateParticipants()
    if (validationError) {
      setError(validationError)
      return
    }

    if (!game.tournament?.address) {
      setError('Tournament contract not available')
      return
    }

    try {
      setIsCreating(true)
      
      const response = await fetch('/api/sdk/game/tournament/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tournament')
      }

      setSuccess(`Tournament created successfully! TX: ${data.txHash.slice(0, 10)}...`)
      setParticipants(['', ''])
    } catch (err) {
      console.error('Error creating tournament:', err)
      setError(err instanceof Error ? err.message : 'Failed to create tournament')
    } finally {
      setIsCreating(false)
    }
  }

  const suggestPowerOfTwo = () => {
    const count = participants.length
    if (isPowerOfTwo(count)) return null

    const nextPower = Math.pow(2, Math.ceil(Math.log2(count)))
    const prevPower = Math.pow(2, Math.floor(Math.log2(count)))
    
    return { next: nextPower, prev: prevPower }
  }

  const adjustToPowerOfTwo = (target: number) => {
    const current = participants.length
    if (target > current) {
      const toAdd = target - current
      setParticipants([...participants, ...Array(toAdd).fill('')])
    } else if (target < current) {
      setParticipants(participants.slice(0, target))
    }
  }

  const suggestion = suggestPowerOfTwo()

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-rose-600" />
          Create New Tournament
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <p className="font-medium mb-1">Requirements:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Participant count must be a power of 2 (2, 4, 8, 16, 32, 64)</li>
              <li>All addresses must be valid and unique</li>
              <li>Tournament starts in Pending status</li>
            </ul>
          </div>

          {/* Participant Count Info */}
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">
              Participants: {participants.length}
            </span>
            {suggestion && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-600">Adjust to:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustToPowerOfTwo(suggestion.prev)}
                  className="h-6 text-xs"
                >
                  {suggestion.prev}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustToPowerOfTwo(suggestion.next)}
                  className="h-6 text-xs"
                >
                  {suggestion.next}
                </Button>
              </div>
            )}
          </div>

          {/* Participant Inputs */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {participants.map((participant, index) => (
              <div key={index} className="flex items-center gap-2">
                <Label className="text-xs font-medium text-gray-700 w-16">
                  #{index + 1}
                </Label>
                <Input
                  placeholder="0x..."
                  value={participant}
                  onChange={(e) => updateParticipant(index, e.target.value)}
                  className="flex-1 text-xs font-mono"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeParticipant(index)}
                  disabled={participants.length <= 2}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="w-3 h-3 text-red-600" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add Participant Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={addParticipant}
            disabled={participants.length >= 64}
            className="w-full"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Participant
          </Button>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
              {success}
            </div>
          )}

          {/* Create Button */}
          <Button
            onClick={handleCreate}
            disabled={isCreating || !game.tournament?.operations}
            variant="controller"
            className="w-full"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Tournament...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Create Tournament
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
