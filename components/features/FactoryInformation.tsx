'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Factory, Shield, User, BarChart3, Settings, Check, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { GAME_MATCH_FACTORY_ABI, getGameMatchFactoryAddress } from '@/lib/contracts/gameMatch'
import { SCOREBOARD_FACTORY_ABI, getScoreBoardFactoryAddress } from '@/lib/contracts/scoreBoard'

/**
 * Reusable factory information component that displays factory addresses,
 * owner information, and configured limits
 */
export function FactoryInformation() {
  const [mounted, setMounted] = useState(false)
  const { address: connectedAddress } = useAccount()
  
  // Collapse states
  const [isGameMatchCollapsed, setIsGameMatchCollapsed] = useState(true)
  const [isScoreBoardCollapsed, setIsScoreBoardCollapsed] = useState(true)
  
  // Edit mode states
  const [editingGameMatchInstance, setEditingGameMatchInstance] = useState(false)
  const [editingGameMatchLimits, setEditingGameMatchLimits] = useState(false)
  const [editingScoreBoardInstance, setEditingScoreBoardInstance] = useState(false)
  const [editingScoreBoardLimits, setEditingScoreBoardLimits] = useState(false)
  
  // Form values
  const [newGameMatchInstanceOwner, setNewGameMatchInstanceOwner] = useState('')
  const [newGameMatchMaxActive, setNewGameMatchMaxActive] = useState('')
  const [newScoreBoardInstanceOwner, setNewScoreBoardInstanceOwner] = useState('')
  const [newMaxLosers, setNewMaxLosers] = useState('')
  const [newMaxPlayers, setNewMaxPlayers] = useState('')
  const [newMaxMatches, setNewMaxMatches] = useState('')
  
  const gameMatchFactoryAddress = getGameMatchFactoryAddress()
  const scoreBoardFactoryAddress = getScoreBoardFactoryAddress()

  useEffect(() => {
    setMounted(true)
  }, [])
  
  const { writeContract: writeGameMatchContract, data: gameMatchTxHash, isPending: isGameMatchPending } = useWriteContract()
  const { writeContract: writeScoreBoardContract, data: scoreBoardTxHash, isPending: isScoreBoardPending } = useWriteContract()
  
  const { isLoading: isGameMatchConfirming, isSuccess: isGameMatchSuccess } = useWaitForTransactionReceipt({
    hash: gameMatchTxHash,
  })
  
  const { isLoading: isScoreBoardConfirming, isSuccess: isScoreBoardSuccess } = useWaitForTransactionReceipt({
    hash: scoreBoardTxHash,
  })

  // GameMatch Factory data
  const { data: gameMatchFactoryOwner } = useReadContract({
    address: gameMatchFactoryAddress,
    abi: GAME_MATCH_FACTORY_ABI,
    functionName: 'owner',
  })

  const { data: gameMatchInstanceOwner } = useReadContract({
    address: gameMatchFactoryAddress,
    abi: GAME_MATCH_FACTORY_ABI,
    functionName: 'getInstanceOwner',
  })

  const { data: defaultMaxActiveMatches } = useReadContract({
    address: gameMatchFactoryAddress,
    abi: GAME_MATCH_FACTORY_ABI,
    functionName: 'defaultMaxActiveMatches',
  })

  // ScoreBoard Factory data
  const { data: scoreBoardFactoryOwner } = useReadContract({
    address: scoreBoardFactoryAddress,
    abi: SCOREBOARD_FACTORY_ABI,
    functionName: 'owner',
  })

  const { data: scoreBoardInstanceOwner } = useReadContract({
    address: scoreBoardFactoryAddress,
    abi: SCOREBOARD_FACTORY_ABI,
    functionName: 'getInstanceOwner',
  })

  const { data: maxLosersPerMatch } = useReadContract({
    address: scoreBoardFactoryAddress,
    abi: SCOREBOARD_FACTORY_ABI,
    functionName: 'maxLosersPerMatch',
  })

  const { data: maxTotalPlayers } = useReadContract({
    address: scoreBoardFactoryAddress,
    abi: SCOREBOARD_FACTORY_ABI,
    functionName: 'maxTotalPlayers',
  })

  const { data: maxTotalMatches } = useReadContract({
    address: scoreBoardFactoryAddress,
    abi: SCOREBOARD_FACTORY_ABI,
    functionName: 'maxTotalMatches',
  })
  
  // Reset form states on success
  useEffect(() => {
    if (isGameMatchSuccess) {
      setEditingGameMatchInstance(false)
      setEditingGameMatchLimits(false)
      setNewGameMatchInstanceOwner('')
      setNewGameMatchMaxActive('')
    }
  }, [isGameMatchSuccess])
  
  useEffect(() => {
    if (isScoreBoardSuccess) {
      setEditingScoreBoardInstance(false)
      setEditingScoreBoardLimits(false)
      setNewScoreBoardInstanceOwner('')
      setNewMaxLosers('')
      setNewMaxPlayers('')
      setNewMaxMatches('')
    }
  }, [isScoreBoardSuccess])
  
  // Handler functions
  const handleUpdateGameMatchInstanceOwner = () => {
    if (!newGameMatchInstanceOwner || !gameMatchFactoryAddress) return
    writeGameMatchContract({
      address: gameMatchFactoryAddress,
      abi: GAME_MATCH_FACTORY_ABI,
      functionName: 'setInstanceOwner',
      args: [newGameMatchInstanceOwner as `0x${string}`],
    })
  }
  
  const handleUpdateGameMatchLimits = () => {
    if (!newGameMatchMaxActive || !gameMatchFactoryAddress) return
    writeGameMatchContract({
      address: gameMatchFactoryAddress,
      abi: GAME_MATCH_FACTORY_ABI,
      functionName: 'setDefaultMaxActiveMatches',
      args: [BigInt(newGameMatchMaxActive)],
    })
  }
  
  const handleUpdateScoreBoardInstanceOwner = () => {
    if (!newScoreBoardInstanceOwner || !scoreBoardFactoryAddress) return
    writeScoreBoardContract({
      address: scoreBoardFactoryAddress,
      abi: SCOREBOARD_FACTORY_ABI,
      functionName: 'setInstanceOwner',
      args: [newScoreBoardInstanceOwner as `0x${string}`],
    })
  }
  
  const handleUpdateScoreBoardLimits = () => {
    if (!newMaxLosers || !newMaxPlayers || !newMaxMatches || !scoreBoardFactoryAddress) return
    writeScoreBoardContract({
      address: scoreBoardFactoryAddress,
      abi: SCOREBOARD_FACTORY_ABI,
      functionName: 'setDeploymentLimits',
      args: [BigInt(newMaxLosers), BigInt(newMaxPlayers), BigInt(newMaxMatches)],
    })
  }
  
  const canModifyGameMatch = connectedAddress && gameMatchFactoryOwner && 
    connectedAddress.toLowerCase() === gameMatchFactoryOwner.toLowerCase()
  const canModifyScoreBoard = connectedAddress && scoreBoardFactoryOwner && 
    connectedAddress.toLowerCase() === scoreBoardFactoryOwner.toLowerCase()

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-gray-900">Factory Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Game Match Factory Section */}
          <div>
            <button
              onClick={() => setIsGameMatchCollapsed(!isGameMatchCollapsed)}
              className="w-full text-sm font-semibold text-gray-900 mb-4 flex items-center justify-between hover:text-blue-600 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                  <Factory className="w-3.5 h-3.5 text-blue-600" />
                </div>
                Game Match Factory
              </div>
              {isGameMatchCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            {!isGameMatchCollapsed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top duration-200">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
                  <Factory className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 mb-1.5">Factory Address</p>
                  <p className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                    {!mounted ? 'Loading...' : gameMatchFactoryAddress || 'Not configured'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-50 rounded-lg flex-shrink-0">
                  <Shield className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 mb-1.5">Factory Owner</p>
                  <p className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                    {!mounted ? 'Loading...' : gameMatchFactoryOwner || 'Not available'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-50 rounded-lg flex-shrink-0">
                  <User className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-gray-900">Instance Owner</p>
                    {canModifyGameMatch && !editingGameMatchInstance && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingGameMatchInstance(true)}
                        className="h-6 px-2 text-xs"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Used for deployed instances</p>
                  {editingGameMatchInstance ? (
                    <div className="space-y-2">
                      <Input
                        type="text"
                        placeholder="0x... (or 0x0 for factory owner)"
                        value={newGameMatchInstanceOwner}
                        onChange={(e) => setNewGameMatchInstanceOwner(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleUpdateGameMatchInstanceOwner}
                          disabled={!newGameMatchInstanceOwner || isGameMatchPending || isGameMatchConfirming}
                          className="h-7 px-3 text-xs"
                        >
                          {isGameMatchPending || isGameMatchConfirming ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</>
                          ) : (
                            <><Check className="w-3 h-3 mr-1" /> Update</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingGameMatchInstance(false)
                            setNewGameMatchInstanceOwner('')
                          }}
                          disabled={isGameMatchPending || isGameMatchConfirming}
                          className="h-7 px-3 text-xs"
                        >
                          <X className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                      {!mounted ? 'Loading...' : gameMatchInstanceOwner || 'Factory owner'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg flex-shrink-0">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-gray-900">Default Limits</p>
                    {canModifyGameMatch && !editingGameMatchLimits && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingGameMatchLimits(true)
                          setNewGameMatchMaxActive(defaultMaxActiveMatches ? defaultMaxActiveMatches.toString() : '')
                        }}
                        className="h-6 px-2 text-xs"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  {editingGameMatchLimits ? (
                    <div className="space-y-2">
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-600">Max Active Matches:</label>
                        <Input
                          type="number"
                          placeholder="e.g., 100"
                          value={newGameMatchMaxActive}
                          onChange={(e) => setNewGameMatchMaxActive(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleUpdateGameMatchLimits}
                          disabled={!newGameMatchMaxActive || isGameMatchPending || isGameMatchConfirming}
                          className="h-7 px-3 text-xs"
                        >
                          {isGameMatchPending || isGameMatchConfirming ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</>
                          ) : (
                            <><Check className="w-3 h-3 mr-1" /> Update</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingGameMatchLimits(false)
                            setNewGameMatchMaxActive('')
                          }}
                          disabled={isGameMatchPending || isGameMatchConfirming}
                          className="h-7 px-3 text-xs"
                        >
                          <X className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="text-xs bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                        <span className="text-gray-500">Max Active Matches:</span>{' '}
                        <span className="text-gray-900 font-medium">
                          {!mounted ? 'Loading...' : 
                           defaultMaxActiveMatches !== undefined ? 
                             Number(defaultMaxActiveMatches).toLocaleString() 
                           : 'Not available'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>

          {/* ScoreBoard Factory Section */}
          <div className="pt-6 border-t border-gray-200">
            <button
              onClick={() => setIsScoreBoardCollapsed(!isScoreBoardCollapsed)}
              className="w-full text-sm font-semibold text-gray-900 mb-4 flex items-center justify-between hover:text-purple-600 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-purple-50 flex items-center justify-center">
                  <Factory className="w-3.5 h-3.5 text-purple-600" />
                </div>
                ScoreBoard Factory
              </div>
              {isScoreBoardCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            {!isScoreBoardCollapsed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top duration-200">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
                  <Factory className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 mb-1.5">Factory Address</p>
                  <p className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                    {!mounted ? 'Loading...' : scoreBoardFactoryAddress || 'Not configured'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-50 rounded-lg flex-shrink-0">
                  <Shield className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 mb-1.5">Factory Owner</p>
                  <p className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                    {!mounted ? 'Loading...' : scoreBoardFactoryOwner || 'Not available'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-50 rounded-lg flex-shrink-0">
                  <User className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-gray-900">Instance Owner</p>
                    {canModifyScoreBoard && !editingScoreBoardInstance && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingScoreBoardInstance(true)}
                        className="h-6 px-2 text-xs"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Used for deployed instances</p>
                  {editingScoreBoardInstance ? (
                    <div className="space-y-2">
                      <Input
                        type="text"
                        placeholder="0x... (or 0x0 for factory owner)"
                        value={newScoreBoardInstanceOwner}
                        onChange={(e) => setNewScoreBoardInstanceOwner(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleUpdateScoreBoardInstanceOwner}
                          disabled={!newScoreBoardInstanceOwner || isScoreBoardPending || isScoreBoardConfirming}
                          className="h-7 px-3 text-xs"
                        >
                          {isScoreBoardPending || isScoreBoardConfirming ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</>
                          ) : (
                            <><Check className="w-3 h-3 mr-1" /> Update</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingScoreBoardInstance(false)
                            setNewScoreBoardInstanceOwner('')
                          }}
                          disabled={isScoreBoardPending || isScoreBoardConfirming}
                          className="h-7 px-3 text-xs"
                        >
                          <X className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                      {!mounted ? 'Loading...' : scoreBoardInstanceOwner || 'Factory owner'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg flex-shrink-0">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-gray-900">Default Limits</p>
                    {canModifyScoreBoard && !editingScoreBoardLimits && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingScoreBoardLimits(true)
                          setNewMaxLosers(maxLosersPerMatch ? maxLosersPerMatch.toString() : '')
                          setNewMaxPlayers(maxTotalPlayers ? maxTotalPlayers.toString() : '')
                          setNewMaxMatches(maxTotalMatches ? maxTotalMatches.toString() : '')
                        }}
                        className="h-6 px-2 text-xs"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  {editingScoreBoardLimits ? (
                    <div className="space-y-2">
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-600">Max Losers/Match:</label>
                        <Input
                          type="number"
                          placeholder="e.g., 100"
                          value={newMaxLosers}
                          onChange={(e) => setNewMaxLosers(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-600">Max Total Players:</label>
                        <Input
                          type="number"
                          placeholder="e.g., 100"
                          value={newMaxPlayers}
                          onChange={(e) => setNewMaxPlayers(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-600">Max Total Matches:</label>
                        <Input
                          type="number"
                          placeholder="e.g., 100"
                          value={newMaxMatches}
                          onChange={(e) => setNewMaxMatches(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleUpdateScoreBoardLimits}
                          disabled={!newMaxLosers || !newMaxPlayers || !newMaxMatches || isScoreBoardPending || isScoreBoardConfirming}
                          className="h-7 px-3 text-xs"
                        >
                          {isScoreBoardPending || isScoreBoardConfirming ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</>
                          ) : (
                            <><Check className="w-3 h-3 mr-1" /> Update</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingScoreBoardLimits(false)
                            setNewMaxLosers('')
                            setNewMaxPlayers('')
                            setNewMaxMatches('')
                          }}
                          disabled={isScoreBoardPending || isScoreBoardConfirming}
                          className="h-7 px-3 text-xs"
                        >
                          <X className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="text-xs bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                        <span className="text-gray-500">Max Losers/Match:</span>{' '}
                        <span className="text-gray-900 font-medium">
                          {!mounted ? 'Loading...' : 
                           maxLosersPerMatch !== undefined ? 
                             Number(maxLosersPerMatch).toLocaleString() 
                           : 'Not available'}
                        </span>
                      </div>
                      <div className="text-xs bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                        <span className="text-gray-500">Max Total Players:</span>{' '}
                        <span className="text-gray-900 font-medium">
                          {!mounted ? 'Loading...' : 
                           maxTotalPlayers !== undefined ? 
                             Number(maxTotalPlayers).toLocaleString() 
                           : 'Not available'}
                        </span>
                      </div>
                      <div className="text-xs bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                        <span className="text-gray-500">Max Total Matches:</span>{' '}
                        <span className="text-gray-900 font-medium">
                          {!mounted ? 'Loading...' : 
                           maxTotalMatches !== undefined ? 
                             Number(maxTotalMatches).toLocaleString() 
                           : 'Not available'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
