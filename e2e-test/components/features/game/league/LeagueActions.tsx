'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useOharaAi } from '@ohara-ai/sdk'
import { Settings, Trash2, Clock, Link, Target } from 'lucide-react'
import { Address } from 'viem'

export function LeagueActions() {
  const { game } = useOharaAi()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leagueOps = (game as any)?.league?.operations

  const [matchContract, setMatchContract] = useState('')
  const [predictionContract, setPredictionContract] = useState('')
  const [cycleDuration, setCycleDuration] = useState('')
  const [maxCyclesKept, setMaxCyclesKept] = useState('')
  const [cleanupCycleId, setCleanupCycleId] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleFinalizeCycle = async () => {
    setLoading('finalize')
    setResult(null)
    try {
      await leagueOps.finalizeCycle()
      setResult({ type: 'success', message: 'Cycle finalized successfully!' })
    } catch (error) {
      setResult({ type: 'error', message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` })
    } finally {
      setLoading(null)
    }
  }

  const handleSetMatchContract = async () => {
    if (!matchContract) {
      setResult({ type: 'error', message: 'Please enter a match contract address' })
      return
    }
    setLoading('setMatch')
    setResult(null)
    try {
      await leagueOps.setMatchContract(matchContract as Address)
      setResult({ type: 'success', message: 'Match contract updated successfully!' })
      setMatchContract('')
    } catch (error) {
      setResult({ type: 'error', message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` })
    } finally {
      setLoading(null)
    }
  }

  const handleSetPrediction = async () => {
    if (!predictionContract) {
      setResult({ type: 'error', message: 'Please enter a prediction contract address' })
      return
    }
    setLoading('setPrediction')
    setResult(null)
    try {
      await leagueOps.setPrediction(predictionContract as Address)
      setResult({ type: 'success', message: 'Prediction contract updated successfully!' })
      setPredictionContract('')
    } catch (error) {
      setResult({ type: 'error', message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` })
    } finally {
      setLoading(null)
    }
  }

  const handleSetCycleDuration = async () => {
    if (!cycleDuration) {
      setResult({ type: 'error', message: 'Please enter a cycle duration' })
      return
    }
    setLoading('setCycleDuration')
    setResult(null)
    try {
      await leagueOps.setCycleDuration(BigInt(cycleDuration))
      setResult({ type: 'success', message: 'Cycle duration updated successfully!' })
      setCycleDuration('')
    } catch (error) {
      setResult({ type: 'error', message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` })
    } finally {
      setLoading(null)
    }
  }

  const handleSetMaxCyclesKept = async () => {
    if (!maxCyclesKept) {
      setResult({ type: 'error', message: 'Please enter max cycles kept' })
      return
    }
    setLoading('setMaxCycles')
    setResult(null)
    try {
      await leagueOps.setMaxCyclesKept(BigInt(maxCyclesKept))
      setResult({ type: 'success', message: 'Max cycles kept updated successfully!' })
      setMaxCyclesKept('')
    } catch (error) {
      setResult({ type: 'error', message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` })
    } finally {
      setLoading(null)
    }
  }

  const handleCleanupCycle = async () => {
    if (!cleanupCycleId) {
      setResult({ type: 'error', message: 'Please enter a cycle ID' })
      return
    }
    setLoading('cleanup')
    setResult(null)
    try {
      await leagueOps.cleanupCycle(BigInt(cleanupCycleId))
      setResult({ type: 'success', message: 'Cycle cleaned up successfully!' })
      setCleanupCycleId('')
    } catch (error) {
      setResult({ type: 'error', message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` })
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Settings className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-gray-900">Admin Actions</CardTitle>
            <CardDescription className="text-gray-600">
              Controller & Owner functions
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {result && (
          <div
            className={`p-3 rounded-lg text-sm ${
              result.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {result.message}
          </div>
        )}

        {/* Controller Actions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Target className="w-4 h-4" />
            Controller Actions
          </div>

          {/* Finalize Cycle */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-700">Finalize Current Cycle</Label>
            <Button
              onClick={handleFinalizeCycle}
              disabled={loading === 'finalize'}
              variant="controller"
              className="w-full"
            >
              {loading === 'finalize' ? 'Finalizing...' : 'Finalize Cycle'}
            </Button>
          </div>

          {/* Set Match Contract */}
          <div className="space-y-2">
            <Label htmlFor="matchContract" className="text-sm text-gray-700">
              Set Match Contract
            </Label>
            <div className="flex gap-2">
              <Input
                id="matchContract"
                placeholder="0x..."
                value={matchContract}
                onChange={(e) => setMatchContract(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleSetMatchContract}
                disabled={loading === 'setMatch'}
                variant="controller"
              >
                <Link className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Set Prediction Contract */}
          <div className="space-y-2">
            <Label htmlFor="predictionContract" className="text-sm text-gray-700">
              Set Prediction Contract
            </Label>
            <div className="flex gap-2">
              <Input
                id="predictionContract"
                placeholder="0x... (or 0x0 to disable)"
                value={predictionContract}
                onChange={(e) => setPredictionContract(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleSetPrediction}
                disabled={loading === 'setPrediction'}
                variant="controller"
              >
                <Link className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200" />

        {/* Owner Actions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Settings className="w-4 h-4" />
            Owner Actions
          </div>

          {/* Set Cycle Duration */}
          <div className="space-y-2">
            <Label htmlFor="cycleDuration" className="text-sm text-gray-700">
              Set Cycle Duration (seconds)
            </Label>
            <div className="flex gap-2">
              <Input
                id="cycleDuration"
                type="number"
                placeholder="3600 - 2678400"
                value={cycleDuration}
                onChange={(e) => setCycleDuration(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleSetCycleDuration}
                disabled={loading === 'setCycleDuration'}
                variant="controller"
              >
                <Clock className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500">Min: 3600s (1h), Max: 2678400s (31d)</p>
          </div>

          {/* Set Max Cycles Kept */}
          <div className="space-y-2">
            <Label htmlFor="maxCyclesKept" className="text-sm text-gray-700">
              Set Max Cycles Kept
            </Label>
            <div className="flex gap-2">
              <Input
                id="maxCyclesKept"
                type="number"
                placeholder="Minimum: 4"
                value={maxCyclesKept}
                onChange={(e) => setMaxCyclesKept(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleSetMaxCyclesKept}
                disabled={loading === 'setMaxCycles'}
                variant="controller"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500">Minimum: 4 cycles</p>
          </div>

          {/* Cleanup Cycle */}
          <div className="space-y-2">
            <Label htmlFor="cleanupCycleId" className="text-sm text-gray-700">
              Cleanup Old Cycle
            </Label>
            <div className="flex gap-2">
              <Input
                id="cleanupCycleId"
                type="number"
                placeholder="Cycle ID"
                value={cleanupCycleId}
                onChange={(e) => setCleanupCycleId(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleCleanupCycle}
                disabled={loading === 'cleanup'}
                variant="admin"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Only finalized cycles older than maxCyclesKept
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
