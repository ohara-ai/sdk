'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatEther } from 'viem'
import { usePublicClient } from 'wagmi'
import { useOharaAi } from '@ohara-ai/sdk'
import {
  Rocket,
  Trash2,
  Eye,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Copy,
  Trophy,
  Swords,
  Gift,
  Target,
  Factory,
  Info,
  Users,
  Brackets,
  Coins,
} from 'lucide-react'
import { OnchainKitWallet } from '@/components/OnchainKitWallet'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogClose,
} from '@/components/ui/dialog'

type ContractType = 'Score' | 'Match' | 'Prize' | 'Prediction' | 'League' | 'Tournament' | 'Heap'

interface ContractConfig {
  type: ContractType
  name: string
  description: string
  icon: React.ReactNode
  iconBg: string
  testPath: string
  dependsOn?: ContractType[]
}

const GAME_CONTRACTS: ContractConfig[] = [
  {
    type: 'Match',
    name: 'Match',
    description: 'Creates matches, holds escrowed stakes, and settles outcomes',
    icon: <Swords className="w-4 h-4 text-purple-600" />,
    iconBg: 'bg-purple-100',
    testPath: '/testing/features/game/match',
    dependsOn: ['Score'],
  },
  {
    type: 'Heap',
    name: 'Heap',
    description: 'Token collection pools with contribution-based entries',
    icon: <Coins className="w-4 h-4 text-orange-600" />,
    iconBg: 'bg-orange-100',
    testPath: '/testing/features/game/heap',
    dependsOn: ['Score'],
  },
  {
    type: 'Score',
    name: 'Score',
    description: 'Tracks player stats, match results, and leaderboards',
    icon: <Trophy className="w-4 h-4 text-amber-600" />,
    iconBg: 'bg-amber-100',
    testPath: '/testing/features/game/score',
  },
  {
    type: 'Prize',
    name: 'Prize',
    description: 'Manages prize pools, fee distribution, and winner claims',
    icon: <Gift className="w-4 h-4 text-emerald-600" />,
    iconBg: 'bg-emerald-100',
    testPath: '/testing/features/game/prize',
    dependsOn: ['Match'],
  },
  {
    type: 'League',
    name: 'League',
    description: 'Cycle-based player rankings and seasonal leaderboards',
    icon: <Users className="w-4 h-4 text-blue-600" />,
    iconBg: 'bg-blue-100',
    testPath: '/testing/features/game/league',
    dependsOn: ['Match'],
  },
  {
    type: 'Tournament',
    name: 'Tournament',
    description: 'Bracket-based elimination tournaments with seeding',
    icon: <Brackets className="w-4 h-4 text-rose-600" />,
    iconBg: 'bg-rose-100',
    testPath: '/testing/features/game/tournament',
    dependsOn: ['Score'],
  },
  {
    type: 'Prediction',
    name: 'Prediction',
    description: 'Prediction markets for betting on match outcomes',
    icon: <Target className="w-4 h-4 text-cyan-600" />,
    iconBg: 'bg-cyan-100',
    testPath: '/testing/features/game/prediction',
  },
]

interface ContractValidation {
  type: ContractType
  address: string | undefined
  existsOnChain: boolean
}

interface DeploymentStatus {
  isDeploying: boolean
  success: boolean | null
  message: string
  totalDeployed?: number
  totalExisting?: number
}

interface FactoryConfig {
  Match: {
    defaultMaxActiveMatches: number
    feeRecipients: string[]
    feeShares: number[]
  } | null
  Score: {
    maxLosersPerMatch: number
    maxTotalPlayers: number
    maxTotalMatches: number
  } | null
  Prize: {
    defaultMatchesPerPool: number
  } | null
  Prediction: {
    matchAddress?: string
  } | null
  League: {
    cycleDuration?: number
    maxCyclesKept?: number
  } | null
  Tournament: {
    maxParticipants?: number
  } | null
  Heap: {
    defaultMaxActiveHeaps?: number
  } | null
}

export default function Home() {
  const { game, app, internal, loadAddresses } = useOharaAi()
  const publicClient = usePublicClient()

  const [selectedContracts, setSelectedContracts] = useState<Set<ContractType>>(new Set())
  const [currentPlan, setCurrentPlan] = useState<ContractType[]>([])
  const [isLoadingPlan, setIsLoadingPlan] = useState(true)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [validations, setValidations] = useState<ContractValidation[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [hasStaleAddresses, setHasStaleAddresses] = useState(false)
  const [controllerBalance, setControllerBalance] = useState<string | null>(null)
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>({
    isDeploying: false,
    success: null,
    message: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [factoryConfigs, setFactoryConfigs] = useState<FactoryConfig>({
    Match: null,
    Score: null,
    Prize: null,
    Prediction: null,
    League: null,
    Tournament: null,
    Heap: null,
  })
  const [showFactoryInfoDialog, setShowFactoryInfoDialog] = useState<ContractType | null>(null)
  const [isLoadingFactoryConfig, setIsLoadingFactoryConfig] = useState(false)

  const deployedContracts: Record<ContractType, `0x${string}` | undefined> = {
    Score: game.scores?.address,
    Match: game.match?.address,
    Prize: game.prize?.address,
    Prediction: game.prediction?.address,
    League: game.league?.address,
    Tournament: game.tournament?.address,
    Heap: game.heap?.address,
  }

  const factoryAddresses: Record<ContractType, `0x${string}` | undefined> = {
    Score: internal.factories?.gameScore,
    Match: internal.factories?.gameMatch,
    Prize: internal.factories?.gamePrize,
    Prediction: internal.factories?.prediction,
    League: internal.factories?.league,
    Tournament: internal.factories?.tournament,
    Heap: internal.factories?.heap,
  }

  const truncateAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Load controller balance
  useEffect(() => {
    const loadBalance = async () => {
      if (!publicClient || !app.controller.address) return
      try {
        const balance = await publicClient.getBalance({
          address: app.controller.address as `0x${string}`,
        })
        setControllerBalance(formatEther(balance))
      } catch {
        setControllerBalance(null)
      }
    }
    loadBalance()
  }, [publicClient, app.controller.address])

  // Fetch factory configuration when info dialog opens
  const fetchFactoryConfig = useCallback(async (type: ContractType) => {
    setIsLoadingFactoryConfig(true)
    try {
      const response = await fetch(`/api/sdk/factory-config?type=${type}`)
      if (response.ok) {
        const data = await response.json()
        setFactoryConfigs(prev => ({ ...prev, [type]: data }))
      }
    } catch (err) {
      console.error('Failed to fetch factory config:', err)
    } finally {
      setIsLoadingFactoryConfig(false)
    }
  }, [])

  const openFactoryInfo = (type: ContractType) => {
    setShowFactoryInfoDialog(type)
    if (!factoryConfigs[type]) {
      fetchFactoryConfig(type)
    }
  }

  // Validate contracts on-chain
  const validateContracts = useCallback(async () => {
    setIsValidating(true)
    try {
      const response = await fetch('/api/sdk/validate-contracts')
      if (response.ok) {
        const data = await response.json()
        setValidations(data.validations || [])
        setHasStaleAddresses(data.hasStaleAddresses || false)
      }
    } catch {
      console.error('Failed to validate contracts')
    } finally {
      setIsValidating(false)
    }
  }, [])

  // Load current deployment plan
  const loadPlan = useCallback(async () => {
    try {
      const response = await fetch('/testing/deploy/plan')
      const data = await response.json()
      const contracts = (data.contracts || []) as ContractType[]
      setCurrentPlan(contracts)
      setSelectedContracts(new Set(contracts))
    } catch {
      console.error('Failed to load deployment plan')
    } finally {
      setIsLoadingPlan(false)
    }
  }, [])

  useEffect(() => {
    loadPlan()
    validateContracts()
  }, [loadPlan, validateContracts])

  useEffect(() => {
    if (deployedContracts.Score || deployedContracts.Match || deployedContracts.Prize || 
        deployedContracts.League || deployedContracts.Tournament || deployedContracts.Prediction ||
        deployedContracts.Heap) {
      validateContracts()
    }
  }, [deployedContracts.Score, deployedContracts.Match, deployedContracts.Prize, 
      deployedContracts.League, deployedContracts.Tournament, deployedContracts.Prediction,
      deployedContracts.Heap, validateContracts])

  // Toggle contract selection with dependency management
  // Dependencies from factory contracts:
  // - Match depends on Score (optional)
  // - Prize depends on Match
  // - League depends on Match (optional)
  // - Tournament depends on Score (optional)
  // - Prediction has no required dependencies (Match, Tournament, League all optional)
  // - Heap depends on Score (optional)
  const toggleContract = (type: ContractType) => {
    const newSelected = new Set(selectedContracts)

    if (newSelected.has(type)) {
      // Deselecting - remove dependents
      newSelected.delete(type)
      if (type === 'Score') {
        // Score is used by: Match, Tournament, Heap
        newSelected.delete('Match')
        newSelected.delete('Tournament')
        newSelected.delete('Heap')
        // Match is used by: Prize, League
        newSelected.delete('Prize')
        newSelected.delete('League')
      }
      if (type === 'Match') {
        // Match is used by: Prize, League
        newSelected.delete('Prize')
        newSelected.delete('League')
      }
    } else {
      // Selecting - add dependencies
      newSelected.add(type)
      if (type === 'Match') {
        newSelected.add('Score')
      }
      if (type === 'Prize') {
        newSelected.add('Match')
        newSelected.add('Score')
      }
      if (type === 'League') {
        newSelected.add('Match')
        newSelected.add('Score')
      }
      if (type === 'Tournament') {
        newSelected.add('Score')
      }
      if (type === 'Heap') {
        newSelected.add('Score')
      }
    }

    setSelectedContracts(newSelected)
  }

  const getContractStatus = (type: ContractType): 'deployed' | 'stale' | 'none' => {
    const validation = validations.find((v) => v.type === type)
    if (!validation?.address) return 'none'
    return validation.existsOnChain ? 'deployed' : 'stale'
  }

  // Execute deployment
  const executeDeploymentPlan = async () => {
    setError(null)
    setDeploymentStatus({ isDeploying: true, success: null, message: 'Saving deployment plan...' })

    try {
      const contracts = Array.from(selectedContracts)
      const saveResponse = await fetch('/testing/deploy/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contracts }),
      })

      if (!saveResponse.ok) {
        const saveData = await saveResponse.json()
        throw new Error(saveData.error || 'Failed to save deployment plan')
      }

      setDeploymentStatus({ isDeploying: true, success: null, message: 'Executing deployment...' })

      const deployResponse = await fetch('/api/sdk/addresses')

      if (!deployResponse.ok) {
        const deployData = await deployResponse.json()
        throw new Error(deployData.error || 'Deployment failed')
      }

      const deployData = await deployResponse.json()

      await loadAddresses()
      window.dispatchEvent(new CustomEvent('contractDeployed'))
      setCurrentPlan(contracts)

      setDeploymentStatus({
        isDeploying: false,
        success: true,
        message: deployData.deployment?.message || 'Deployment complete',
        totalDeployed: deployData.deployment?.totalDeployed,
        totalExisting: deployData.deployment?.totalExisting,
      })
    } catch (err) {
      console.error('Deployment error:', err)
      setError(err instanceof Error ? err.message : 'Deployment failed')
      setDeploymentStatus({ isDeploying: false, success: false, message: '' })
    }
  }

  // Clear deployment plan
  const clearDeploymentPlan = async () => {
    setError(null)
    setDeploymentStatus({ isDeploying: true, success: null, message: 'Clearing deployment plan...' })

    try {
      const response = await fetch('/testing/deploy/plan', { method: 'DELETE' })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to clear deployment plan')
      }

      await loadAddresses()
      window.dispatchEvent(new CustomEvent('contractDeployed'))

      setCurrentPlan([])
      setSelectedContracts(new Set())
      setDeploymentStatus({
        isDeploying: false,
        success: true,
        message: 'Deployment plan cleared.',
      })
    } catch (err) {
      console.error('Clear error:', err)
      setError(err instanceof Error ? err.message : 'Failed to clear')
      setDeploymentStatus({ isDeploying: false, success: false, message: '' })
    }
  }

  const hasChanges = (() => {
    const currentSet = new Set(currentPlan)
    if (selectedContracts.size !== currentSet.size) return true
    for (const c of selectedContracts) {
      if (!currentSet.has(c)) return true
    }
    return false
  })()

  if (isLoadingPlan) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">OharaAI SDK Test</h1>
              <p className="text-sm text-gray-500 mt-1">Deploy and test on-chain gaming contracts</p>
              
              {/* Controller Info - Inline */}
              {app.controller.address && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Controller</span>
                  <code className="text-xs font-mono text-gray-600">
                    {truncateAddress(app.controller.address)}
                  </code>
                  {controllerBalance && (
                    <span className="text-xs text-emerald-600 font-medium">
                      {parseFloat(controllerBalance).toFixed(4)} ETH
                    </span>
                  )}
                  <button
                    onClick={() => copyToClipboard(app.controller.address!)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Copy controller address"
                  >
                    <Copy className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              )}
            </div>
            <OnchainKitWallet />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Action Buttons */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            onClick={executeDeploymentPlan}
            disabled={deploymentStatus.isDeploying || selectedContracts.size === 0}
            className="gap-2"
          >
            {deploymentStatus.isDeploying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                {hasChanges ? 'Save & Deploy' : 'Redeploy'}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowPreviewDialog(true)}
            disabled={deploymentStatus.isDeploying || selectedContracts.size === 0}
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview Plan
          </Button>

          <Button
            variant="outline"
            onClick={clearDeploymentPlan}
            disabled={deploymentStatus.isDeploying || currentPlan.length === 0}
            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>

          {isValidating && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Validating...
            </div>
          )}
        </div>

        {/* Status Messages */}
        {deploymentStatus.message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              deploymentStatus.success === true
                ? 'bg-green-50 border border-green-200'
                : deploymentStatus.success === false
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-blue-50 border border-blue-200'
            }`}
          >
            {deploymentStatus.success === true && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
            {deploymentStatus.success === false && <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />}
            {deploymentStatus.isDeploying && <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />}
            <div>
              <p className={`font-medium ${
                deploymentStatus.success === true ? 'text-green-800' :
                deploymentStatus.success === false ? 'text-red-800' : 'text-blue-800'
              }`}>
                {deploymentStatus.message}
              </p>
              {deploymentStatus.totalDeployed !== undefined && (
                <p className="text-sm opacity-75 mt-1">
                  {deploymentStatus.totalDeployed} deployed, {deploymentStatus.totalExisting} existing
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm font-medium text-red-800">Error: {error}</p>
          </div>
        )}

        {hasStaleAddresses && (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Stale Addresses Detected</p>
              <p className="text-sm text-amber-700 mt-1">
                Some stored addresses no longer exist on-chain. These contracts will be redeployed.
              </p>
              <button
                onClick={validateContracts}
                disabled={isValidating}
                className="mt-2 text-sm text-amber-700 hover:text-amber-900 flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* Game Context Section */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Game Contracts</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {GAME_CONTRACTS.map((contract) => {
              const isSelected = selectedContracts.has(contract.type)
              const address = deployedContracts[contract.type]
              const factoryAddress = factoryAddresses[contract.type]
              const status = getContractStatus(contract.type)

              return (
                <div
                  key={contract.type}
                  className={`py-3 px-4 transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${contract.iconBg} shrink-0`}>
                      {contract.icon}
                    </div>

                    {/* Contract Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {contract.name}
                        </span>
                        {contract.dependsOn && (
                          <span className="text-xs text-gray-500">
                            (depends on {contract.dependsOn.join(', ')})
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{contract.description}</p>

                      {/* Address Display */}
                      <div className="mt-2 flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500">Address:</span>
                          {address ? (
                            <div className="flex items-center gap-1.5">
                              <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                {truncateAddress(address)}
                              </code>
                              {status === 'deployed' && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                              )}
                              {status === 'stale' && (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Not deployed</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500">Factory:</span>
                          {factoryAddress ? (
                            <div className="flex items-center gap-1.5">
                              <Factory className="w-3 h-3 text-gray-400" />
                              <code className="text-xs font-mono text-gray-600">
                                {truncateAddress(factoryAddress)}
                              </code>
                              <button
                                onClick={() => openFactoryInfo(contract.type)}
                                className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                                title="View factory defaults"
                              >
                                <Info className="w-3.5 h-3.5 text-blue-500" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Column */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <Link
                        href={contract.testPath}
                        className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
                      >
                        Open test page
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <label
                        htmlFor={contract.type}
                        className="flex items-center gap-1.5 cursor-pointer mt-2"
                      >
                        <Checkbox
                          id={contract.type}
                          checked={isSelected}
                          onCheckedChange={() => toggleContract(contract.type)}
                          disabled={deploymentStatus.isDeploying}
                        />
                        <span className="text-xs text-gray-500">Include in deploy</span>
                      </label>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Deployment Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent>
          <DialogClose onClose={() => setShowPreviewDialog(false)} />
          <DialogHeader>
            <DialogTitle>Deployment Preview</DialogTitle>
            <DialogDescription>
              Contracts will be processed in dependency order
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              {/* Contracts */}
              <div className="space-y-1.5">
                {GAME_CONTRACTS
                  .filter((c) => selectedContracts.has(c.type))
                  .map((contract, index) => {
                    const contractType = contract.type
                    const status = getContractStatus(contractType)
                    const address = deployedContracts[contractType]

                    return (
                      <div
                        key={contractType}
                        className="flex items-center gap-2 py-1.5 px-2 bg-gray-50 rounded border border-gray-200"
                      >
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <div className={`p-1 rounded ${contract.iconBg}`}>
                          {contract.icon}
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{contract.name}</span>
                        <span className="text-gray-400 mx-1">—</span>
                        {status === 'deployed' && address ? (
                          <span className="text-xs text-green-600">
                            ✓ On-chain at {truncateAddress(address)}, skip
                          </span>
                        ) : status === 'stale' && address ? (
                          <span className="text-xs text-amber-600">
                            ⚠ {truncateAddress(address)} missing, redeploy
                          </span>
                        ) : (
                          <span className="text-xs text-blue-600">New deployment</span>
                        )}
                      </div>
                    )
                  })}
              </div>

              {/* Permissions & Dependencies */}
              {selectedContracts.size > 0 && (
                <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-800 mb-1.5">Configuration actions:</p>
                  <ul className="text-xs text-blue-700 space-y-0.5">
                    {selectedContracts.has('Match') && selectedContracts.has('Score') && (
                      <li className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-blue-400" />
                        Match → authorized to record scores on Score
                      </li>
                    )}
                    {selectedContracts.has('Prize') && selectedContracts.has('Match') && (
                      <li className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-blue-400" />
                        Prize → linked to Match contract
                      </li>
                    )}
                    {selectedContracts.has('League') && selectedContracts.has('Match') && (
                      <li className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-blue-400" />
                        League → linked to Match contract
                      </li>
                    )}
                    {selectedContracts.has('Tournament') && selectedContracts.has('Score') && (
                      <li className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-blue-400" />
                        Tournament → linked to Score contract
                      </li>
                    )}
                    {selectedContracts.has('Prediction') && selectedContracts.has('Match') && (
                      <li className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-blue-400" />
                        Prediction → linked to Match contract
                      </li>
                    )}
                    {selectedContracts.has('Prediction') && selectedContracts.has('Tournament') && (
                      <li className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-blue-400" />
                        Prediction → linked to Tournament contract
                      </li>
                    )}
                    {selectedContracts.has('Prediction') && selectedContracts.has('League') && (
                      <li className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-blue-400" />
                        Prediction → linked to League contract
                      </li>
                    )}
                    {selectedContracts.has('Heap') && selectedContracts.has('Score') && (
                      <li className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-blue-400" />
                        Heap → linked to Score contract
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <Button onClick={() => { setShowPreviewDialog(false); executeDeploymentPlan() }} className="flex-1 gap-2">
                <Rocket className="w-4 h-4" />
                Deploy Now
              </Button>
              <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                Cancel
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Factory Info Dialog */}
      <Dialog open={showFactoryInfoDialog !== null} onOpenChange={() => setShowFactoryInfoDialog(null)}>
        <DialogContent>
          <DialogClose onClose={() => setShowFactoryInfoDialog(null)} />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Factory className="w-5 h-5" />
              {showFactoryInfoDialog} Factory Defaults
            </DialogTitle>
            <DialogDescription>
              Configuration applied to new contracts deployed via this factory
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {isLoadingFactoryConfig ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : showFactoryInfoDialog === 'Match' && factoryConfigs.Match ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Max Active Matches</span>
                    <span className="font-mono text-sm font-medium">
                      {factoryConfigs.Match.defaultMaxActiveMatches === 0 
                        ? '∞ (unlimited)' 
                        : factoryConfigs.Match.defaultMaxActiveMatches}
                    </span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="text-sm text-gray-600 mb-2">Default Fee Configuration</div>
                    {factoryConfigs.Match.feeRecipients.length > 0 ? (
                      <div className="space-y-2">
                        {factoryConfigs.Match.feeRecipients.map((recipient, idx) => (
                          <div key={recipient} className="flex justify-between items-center text-sm">
                            <code className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {truncateAddress(recipient)}
                            </code>
                            <span className="font-medium text-purple-600">
                              {(factoryConfigs.Match!.feeShares[idx] / 100).toFixed(2)}%
                            </span>
                          </div>
                        ))}
                        <div className="text-xs text-gray-500 mt-2">
                          Total: {factoryConfigs.Match.feeShares.reduce((a, b) => a + b, 0) / 100}%
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No default fees configured</span>
                    )}
                  </div>
                </div>
              </div>
            ) : showFactoryInfoDialog === 'Score' && factoryConfigs.Score ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Max Losers Per Match</span>
                    <span className="font-mono text-sm font-medium">{factoryConfigs.Score.maxLosersPerMatch}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Max Total Players</span>
                    <span className="font-mono text-sm font-medium">{factoryConfigs.Score.maxTotalPlayers.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Max Total Matches</span>
                    <span className="font-mono text-sm font-medium">{factoryConfigs.Score.maxTotalMatches.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : showFactoryInfoDialog === 'Prize' && factoryConfigs.Prize ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Matches Per Prize Pool</span>
                    <span className="font-mono text-sm font-medium">{factoryConfigs.Prize.defaultMatchesPerPool}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-gray-500">
                No configuration available
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </main>
  )
}
