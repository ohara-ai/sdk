'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Info, Search, Link2, Trophy, Shield } from 'lucide-react'
import { useOharaAi, SCORE_ABI } from '@ohara-ai/sdk'
import { useBlockNumber, usePublicClient } from 'wagmi'
import { isAddress } from 'viem'

interface ContractDetailsProps {
  contractAddress?: `0x${string}`
}

export function ContractDetails({ contractAddress }: ContractDetailsProps) {
  const { game } = useOharaAi()
  const publicClient = usePublicClient()
  const { data: blockNumber } = useBlockNumber({ watch: true })

  const [prizeContract, setPrizeContract] = useState<string>()
  const [tournamentContract, setTournamentContract] = useState<string>()
  const [controllerAddress, setControllerAddress] = useState<string>()
  const [ownerAddress, setOwnerAddress] = useState<string>()
  const [remainingPlayerCapacity, setRemainingPlayerCapacity] = useState<bigint>()
  const [remainingMatchCapacity, setRemainingMatchCapacity] = useState<bigint>()
  
  const [checkAddress, setCheckAddress] = useState('')
  const [isAuthorized, setIsAuthorized] = useState<boolean>()
  const [checkingAuth, setCheckingAuth] = useState(false)

  useEffect(() => {
    if (!publicClient || !contractAddress) return

    const fetchDetails = async () => {
      try {
        const [prize, tournament, controller, owner, playerCap, matchCap] = await Promise.all([
          publicClient.readContract({
            address: contractAddress,
            abi: SCORE_ABI,
            functionName: 'prize',
          }),
          publicClient.readContract({
            address: contractAddress,
            abi: SCORE_ABI,
            functionName: 'tournament',
          }),
          publicClient.readContract({
            address: contractAddress,
            abi: SCORE_ABI,
            functionName: 'controller',
          }),
          publicClient.readContract({
            address: contractAddress,
            abi: SCORE_ABI,
            functionName: 'owner',
          }),
          publicClient.readContract({
            address: contractAddress,
            abi: SCORE_ABI,
            functionName: 'getRemainingPlayerCapacity',
          }),
          publicClient.readContract({
            address: contractAddress,
            abi: SCORE_ABI,
            functionName: 'getRemainingMatchCapacity',
          }),
        ])

        setPrizeContract(prize as string)
        setTournamentContract(tournament as string)
        setControllerAddress(controller as string)
        setOwnerAddress(owner as string)
        setRemainingPlayerCapacity(playerCap as bigint)
        setRemainingMatchCapacity(matchCap as bigint)
      } catch (error) {
        console.error('[ContractDetails] Error fetching details:', error)
      }
    }

    fetchDetails()
    const interval = setInterval(fetchDetails, 10000)
    return () => clearInterval(interval)
  }, [publicClient, contractAddress, blockNumber])

  const handleCheckAuthorization = async () => {
    if (!publicClient || !contractAddress || !isAddress(checkAddress)) {
      return
    }

    setCheckingAuth(true)
    try {
      const authorized = await publicClient.readContract({
        address: contractAddress,
        abi: SCORE_ABI,
        functionName: 'authorizedRecorders',
        args: [checkAddress as `0x${string}`],
      })
      setIsAuthorized(authorized as boolean)
    } catch (error) {
      console.error('[ContractDetails] Error checking authorization:', error)
    } finally {
      setCheckingAuth(false)
    }
  }

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Info className="w-5 h-5 text-gray-600" />
          Contract Details
        </CardTitle>
        <CardDescription className="text-gray-600">
          View contract configuration and linked contracts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-gray-700">Controller</span>
            </div>
            <code className="text-xs text-gray-900 break-all">
              {controllerAddress || 'Loading...'}
            </code>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-semibold text-gray-700">Owner</span>
            </div>
            <code className="text-xs text-gray-900 break-all">
              {ownerAddress || 'Loading...'}
            </code>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-gray-700">Prize Contract</span>
            </div>
            <code className="text-xs text-gray-900 break-all">
              {prizeContract === '0x0000000000000000000000000000000000000000'
                ? 'Not configured'
                : prizeContract || 'Loading...'}
            </code>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-gray-700">Tournament Contract</span>
            </div>
            <code className="text-xs text-gray-900 break-all">
              {tournamentContract === '0x0000000000000000000000000000000000000000'
                ? 'Not configured'
                : tournamentContract || 'Loading...'}
            </code>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Remaining Capacity</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="text-xs text-indigo-700 mb-1">Players</div>
              <div className="text-lg font-bold text-indigo-900">
                {remainingPlayerCapacity !== undefined
                  ? remainingPlayerCapacity.toString()
                  : '—'}
              </div>
            </div>
            <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200">
              <div className="text-xs text-cyan-700 mb-1">Matches</div>
              <div className="text-lg font-bold text-cyan-900">
                {remainingMatchCapacity !== undefined
                  ? remainingMatchCapacity.toString()
                  : '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Check Recorder Authorization
          </h4>
          <div className="space-y-3">
            <div>
              <Label htmlFor="check-address" className="text-xs text-gray-700">
                Address to Check
              </Label>
              <Input
                id="check-address"
                type="text"
                placeholder="0x..."
                value={checkAddress}
                onChange={(e) => {
                  setCheckAddress(e.target.value)
                  setIsAuthorized(undefined)
                }}
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleCheckAuthorization}
              disabled={!isAddress(checkAddress) || checkingAuth}
              size="sm"
              className="w-full"
            >
              {checkingAuth ? 'Checking...' : 'Check Authorization'}
            </Button>
            {isAuthorized !== undefined && (
              <div
                className={`p-3 rounded-lg text-sm font-medium ${
                  isAuthorized
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {isAuthorized ? '✓ Authorized' : '✗ Not Authorized'}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
