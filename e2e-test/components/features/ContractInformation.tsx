'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, FileCode, Percent, BarChart3 } from 'lucide-react'
import { ContractType } from '@ohara-ai/sdk'
import { useOharaAi } from '@ohara-ai/sdk'
import { useBlockNumber } from 'wagmi'

/**
 * Reusable contract information component that displays system addresses
 * and configuration for on-chain features
 */
export function ContractInformation({ type }: { type: ContractType }) {
  const [mounted, setMounted] = useState(false)
  const { game, app } = useOharaAi()
  const { data: blockNumber } = useBlockNumber({ watch: true })

  // GameMatch state
  const [feeConfig, setFeeConfig] = useState<{
    recipients: readonly `0x${string}`[]
    shares: readonly bigint[]
    totalShare: bigint
  } | null>(null)
  const [activeMatchCount, setActiveMatchCount] = useState<bigint | undefined>()
  const [maxActiveMatches, setMaxActiveMatches] = useState<bigint | undefined>()

  // GameScore state
  const [maxLosersPerMatch, setMaxLosersPerMatch] = useState<bigint | undefined>()
  const [maxTotalPlayers, setMaxTotalPlayers] = useState<bigint | undefined>()
  const [maxTotalMatches, setMaxTotalMatches] = useState<bigint | undefined>()
  const [totalPlayers, setTotalPlayers] = useState<bigint | undefined>()
  const [totalMatches, setTotalMatches] = useState<bigint | undefined>()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Get contract address based on type
  const contractAddress = type === ContractType.GAME_MATCH 
    ? game.match?.address 
    : game.scores?.address
  
  const controllerAddress = app.controller?.address

  // Fetch GameMatch data
  useEffect(() => {
    if (type !== ContractType.GAME_MATCH || !game.match?.operations) {
      return
    }

    const fetchMatchData = async () => {
      try {
        const [feeConfigData, activeCount, maxActive, scoreboardAddress] = await Promise.all([
          game.match.operations!.getFeeConfiguration(),
          game.match.operations!.getActiveMatchCount(),
          game.match.operations!.getMaxActiveMatches(),
          game.match.operations!.getScoreboardAddress(),
        ])
        
        setFeeConfig(feeConfigData)
        setActiveMatchCount(activeCount)
        setMaxActiveMatches(maxActive)
      } catch (error) {
        console.error('[ContractInformation] Error fetching match data:', error)
      }
    }

    fetchMatchData()
    const interval = setInterval(fetchMatchData, 10000)
    return () => clearInterval(interval)
  }, [type, game.match?.operations, blockNumber])

  // Fetch GameScore data
  useEffect(() => {
    if (type !== ContractType.GAME_SCORE || !game.scores?.operations) {
      return
    }

    const fetchScoreData = async () => {
      try {
        const [maxLosers, maxPlayers, maxMatches, players, matches] = await Promise.all([
          game.scores.operations!.getMaxLosersPerMatch(),
          game.scores.operations!.getMaxTotalPlayers(),
          game.scores.operations!.getMaxTotalMatches(),
          game.scores.operations!.getTotalPlayers(),
          game.scores.operations!.getTotalMatches(),
        ])
        
        setMaxLosersPerMatch(maxLosers)
        setMaxTotalPlayers(maxPlayers)
        setMaxTotalMatches(maxMatches)
        setTotalPlayers(players)
        setTotalMatches(matches)
      } catch (error) {
        console.error('[ContractInformation] Error fetching score data:', error)
      }
    }

    fetchScoreData()
    const interval = setInterval(fetchScoreData, 10000)
    return () => clearInterval(interval)
  }, [type, game.scores?.operations, blockNumber])

  // Format configuration display
  const getConfigDisplay = () => {
    if (!contractAddress) return 'Contract not deployed'
    
    if (type === ContractType.GAME_MATCH) {
      if (!feeConfig) {
        console.log('[ContractInformation] Fee config not loaded yet')
        return 'Loading...'
      }
      console.log('[ContractInformation] Fee config:', feeConfig)
      const feePercentage = feeConfig.totalShare ? Number((feeConfig.totalShare * 100n) / 10000n) : 0
      console.log('[ContractInformation] Fee percentage:', feePercentage, 'Recipients:', feeConfig.recipients.length)
      return `Fee: ${feePercentage}%, ${feeConfig.recipients.length} recipient(s)`
    } else {
      if (maxLosersPerMatch === undefined) return 'Loading...'
      return `Max ${maxLosersPerMatch} losers/match`
    }
  }

  const getStatsDisplay = () => {
    if (!contractAddress) return 'N/A'
    
    if (type === ContractType.GAME_MATCH) {
      if (activeMatchCount === undefined || maxActiveMatches === undefined) return 'Loading...'
      const maxDisplay = maxActiveMatches === 0n ? '∞' : maxActiveMatches.toString()
      return `Active: ${activeMatchCount}/${maxDisplay}`
    } else {
      if (totalPlayers === undefined || totalMatches === undefined || 
          maxTotalPlayers === undefined || maxTotalMatches === undefined) {
        return 'Loading...'
      }
      return `Players: ${totalPlayers}/${maxTotalPlayers}, Matches: ${totalMatches}/${maxTotalMatches}`
    }
  }

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-gray-900">Contract Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
              <FileCode className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1.5">Contract Address</p>
              <p className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                {!mounted ? 'Loading...' : contractAddress || 'Not deployed'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-50 rounded-lg flex-shrink-0">
              <Shield className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1.5">App Controller Address</p>
              <p className="text-xs text-gray-500 mb-1">App secret key</p>
              <p className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                {!mounted ? 'Loading...' : controllerAddress || 'Not configured'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
              <Percent className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1.5">Configuration</p>
              <p className="text-xs text-gray-600 bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                {!mounted ? 'Loading...' : getConfigDisplay()}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-cyan-50 rounded-lg flex-shrink-0">
              <BarChart3 className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1.5">Capacity Stats</p>
              <p className="text-xs text-gray-600 bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                {!mounted ? 'Loading...' : getStatsDisplay()}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
