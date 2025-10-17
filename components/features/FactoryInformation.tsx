'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Factory, Shield, User, BarChart3, Settings, Check, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { GAME_MATCH_FACTORY_ABI, getGameMatchFactoryAddress } from '@/lib/contracts/gameMatch'
import { GAMESCORE_FACTORY_ABI, getGameScoreFactoryAddress } from '@/lib/contracts/gameScore'

/**
 * Reusable factory information component that displays factory addresses,
 * owner information, and configured limits
 */
export function FactoryInformation() {
  const [mounted, setMounted] = useState(false)
  const { address: connectedAddress } = useAccount()
  
  // Collapse states
  const [isGameMatchCollapsed, setIsGameMatchCollapsed] = useState(true)
  const [isGameScoreCollapsed, setIsGameScoreCollapsed] = useState(true)
  
  // Edit mode states
  const [editingGameMatchInstance, setEditingGameMatchInstance] = useState(false)
  const [editingGameMatchLimits, setEditingGameMatchLimits] = useState(false)
  const [editingGameScoreInstance, setEditingGameScoreInstance] = useState(false)
  const [editingGameScoreLimits, setEditingGameScoreLimits] = useState(false)
  
  // Form values
  const [newGameMatchInstanceOwner, setNewGameMatchInstanceOwner] = useState('')
  const [newGameMatchMaxActive, setNewGameMatchMaxActive] = useState('')
  const [newGameScoreInstanceOwner, setNewGameScoreInstanceOwner] = useState('')
  const [newMaxLosers, setNewMaxLosers] = useState('')
  const [newMaxPlayers, setNewMaxPlayers] = useState('')
  const [newMaxMatches, setNewMaxMatches] = useState('')
  
  const gameMatchFactoryAddress = getGameMatchFactoryAddress()
  const gameScoreFactoryAddress = getGameScoreFactoryAddress()

  useEffect(() => {
    setMounted(true)
  }, [])
  
  const { writeContract: writeGameMatchContract, data: gameMatchTxHash, isPending: isGameMatchPending } = useWriteContract()
  const { writeContract: writeGameScoreContract, data: gameScoreTxHash, isPending: isGameScorePending } = useWriteContract()
  
  const { isLoading: isGameMatchConfirming, isSuccess: isGameMatchSuccess } = useWaitForTransactionReceipt({
    hash: gameMatchTxHash,
  })
  
  const { isLoading: isGameScoreConfirming, isSuccess: isGameScoreSuccess } = useWaitForTransactionReceipt({
    hash: gameScoreTxHash,
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

  // GameScore Factory data
  const { data: gameScoreFactoryOwner } = useReadContract({
    address: gameScoreFactoryAddress,
    abi: GAMESCORE_FACTORY_ABI,
    functionName: 'owner',
  })

  const { data: gameScoreInstanceOwner } = useReadContract({
    address: gameScoreFactoryAddress,
    abi: GAMESCORE_FACTORY_ABI,
    functionName: 'getInstanceOwner',
  })

  const { data: maxLosersPerMatch } = useReadContract({
    address: gameScoreFactoryAddress,
    abi: GAMESCORE_FACTORY_ABI,
    functionName: 'maxLosersPerMatch',
  })

  const { data: maxTotalPlayers } = useReadContract({
    address: gameScoreFactoryAddress,
    abi: GAMESCORE_FACTORY_ABI,
    functionName: 'maxTotalPlayers',
  })

  const { data: maxTotalMatches } = useReadContract({
    address: gameScoreFactoryAddress,
    abi: GAMESCORE_FACTORY_ABI,
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
    if (isGameScoreSuccess) {
      setEditingGameScoreInstance(false)
      setEditingGameScoreLimits(false)
      setNewGameScoreInstanceOwner('')
      setNewMaxLosers('')
      setNewMaxPlayers('')
      setNewMaxMatches('')
    }
  }, [isGameScoreSuccess])
  
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
  
  const handleUpdateGameScoreInstanceOwner = () => {
    if (!newGameScoreInstanceOwner || !gameScoreFactoryAddress) return
    writeGameScoreContract({
      address: gameScoreFactoryAddress,
      abi: GAMESCORE_FACTORY_ABI,
      functionName: 'setInstanceOwner',
      args: [newGameScoreInstanceOwner as `0x${string}`],
    })
  }
  
  const handleUpdateGameScoreLimits = () => {
    if (!newMaxLosers || !newMaxPlayers || !newMaxMatches || !gameScoreFactoryAddress) return
    writeGameScoreContract({
      address: gameScoreFactoryAddress,
      abi: GAMESCORE_FACTORY_ABI,
      functionName: 'setDeploymentLimits',
      args: [BigInt(newMaxLosers), BigInt(newMaxPlayers), BigInt(newMaxMatches)],
    })
  }
  
  const canModifyGameMatch = connectedAddress && gameMatchFactoryOwner && 
    connectedAddress.toLowerCase() === gameMatchFactoryOwner.toLowerCase()
  const canModifyGameScore = connectedAddress && gameScoreFactoryOwner && 
    connectedAddress.toLowerCase() === gameScoreFactoryOwner.toLowerCase()

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-gray-900">Factory Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Game Match Factory Section */}
          <div>
            <button
              onClick={() => setIsGameMatchCollapsed(!isGameMatchCollapsed)}
              className={`w-full text-sm font-semibold text-gray-900 flex items-center justify-between hover:text-blue-600 transition-colors ${isGameMatchCollapsed ? 'mb-0' : 'mb-4'}`}
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

          {/* GameScore Factory Section */}
          <div>
            <button
              onClick={() => setIsGameScoreCollapsed(!isGameScoreCollapsed)}
              className={`w-full text-sm font-semibold text-gray-900 flex items-center justify-between hover:text-purple-600 transition-colors ${isGameScoreCollapsed ? 'mb-0' : 'mb-4'}`}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-purple-50 flex items-center justify-center">
                  <Factory className="w-3.5 h-3.5 text-purple-600" />
                </div>
                GameScore Factory
              </div>
              {isGameScoreCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            {!isGameScoreCollapsed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top duration-200">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
                  <Factory className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 mb-1.5">Factory Address</p>
                  <p className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                    {!mounted ? 'Loading...' : gameScoreFactoryAddress || 'Not configured'}
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
                    {!mounted ? 'Loading...' : gameScoreFactoryOwner || 'Not available'}
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
                    {canModifyGameScore && !editingGameScoreInstance && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingGameScoreInstance(true)}
                        className="h-6 px-2 text-xs"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Used for deployed instances</p>
                  {editingGameScoreInstance ? (
                    <div className="space-y-2">
                      <Input
                        type="text"
                        placeholder="0x... (or 0x0 for factory owner)"
                        value={newGameScoreInstanceOwner}
                        onChange={(e) => setNewGameScoreInstanceOwner(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleUpdateGameScoreInstanceOwner}
                          disabled={!newGameScoreInstanceOwner || isGameScorePending || isGameScoreConfirming}
                          className="h-7 px-3 text-xs"
                        >
                          {isGameScorePending || isGameScoreConfirming ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</>
                          ) : (
                            <><Check className="w-3 h-3 mr-1" /> Update</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingGameScoreInstance(false)
                            setNewGameScoreInstanceOwner('')
                          }}
                          disabled={isGameScorePending || isGameScoreConfirming}
                          className="h-7 px-3 text-xs"
                        >
                          <X className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                      {!mounted ? 'Loading...' : gameScoreInstanceOwner || 'Factory owner'}
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
                    {canModifyGameScore && !editingGameScoreLimits && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingGameScoreLimits(true)
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
                  {editingGameScoreLimits ? (
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
                          onClick={handleUpdateGameScoreLimits}
                          disabled={!newMaxLosers || !newMaxPlayers || !newMaxMatches || isGameScorePending || isGameScoreConfirming}
                          className="h-7 px-3 text-xs"
                        >
                          {isGameScorePending || isGameScoreConfirming ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</>
                          ) : (
                            <><Check className="w-3 h-3 mr-1" /> Update</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingGameScoreLimits(false)
                            setNewMaxLosers('')
                            setNewMaxPlayers('')
                            setNewMaxMatches('')
                          }}
                          disabled={isGameScorePending || isGameScoreConfirming}
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
