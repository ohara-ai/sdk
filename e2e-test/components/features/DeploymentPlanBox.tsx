'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { 
  Loader2, 
  Rocket, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Info,
  Eye,
  X,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'
import { useOharaAi } from '@ohara-ai/sdk'

type ContractType = 'Score' | 'Match' | 'Prize'

interface ContractOption {
  type: ContractType
  name: string
  description: string
  dependsOn?: ContractType[]
}

const CONTRACT_OPTIONS: ContractOption[] = [
  {
    type: 'Score',
    name: 'Game Score',
    description: 'Track player scores, wins, and match history',
  },
  {
    type: 'Match',
    name: 'Game Match',
    description: 'Escrow-based match system with stake management',
    dependsOn: ['Score'],
  },
  {
    type: 'Prize',
    name: 'Game Prize',
    description: 'Prize pools, pool winners, and claiming',
    dependsOn: ['Match'],
  },
]

interface DeploymentStatus {
  isDeploying: boolean
  success: boolean | null
  message: string
  totalDeployed?: number
  totalExisting?: number
}

interface ContractValidation {
  type: ContractType
  address: string | undefined
  existsOnChain: boolean
}

export function DeploymentPlanBox() {
  const { game, loadAddresses } = useOharaAi()
  const [selectedContracts, setSelectedContracts] = useState<Set<ContractType>>(new Set())
  const [currentPlan, setCurrentPlan] = useState<ContractType[]>([])
  const [isLoadingPlan, setIsLoadingPlan] = useState(true)
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>({
    isDeploying: false,
    success: null,
    message: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [validations, setValidations] = useState<ContractValidation[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [hasStaleAddresses, setHasStaleAddresses] = useState(false)

  // Get deployed addresses from context
  const deployedContracts = {
    Score: game.scores?.address,
    Match: game.match?.address,
    Prize: game.prize?.address,
  }

  // Validate contracts on-chain
  const validateContracts = useCallback(async () => {
    setIsValidating(true)
    try {
      // Server uses NEXT_PUBLIC_SDK_CHAIN_ID from its config
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

  // Get validation status for a contract type
  const getContractStatus = (type: ContractType): 'deployed' | 'stale' | 'none' => {
    const validation = validations.find(v => v.type === type)
    if (!validation?.address) return 'none'
    return validation.existsOnChain ? 'deployed' : 'stale'
  }

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

  // Re-validate when addresses change
  useEffect(() => {
    if (
      deployedContracts.Score ||
      deployedContracts.Match ||
      deployedContracts.Prize
    ) {
      validateContracts()
    }
  }, [
    deployedContracts.Score,
    deployedContracts.Match,
    deployedContracts.Prize,
    validateContracts,
  ])

  // Toggle contract selection
  const toggleContract = (type: ContractType) => {
    const newSelected = new Set(selectedContracts)
    
    if (newSelected.has(type)) {
      newSelected.delete(type)
      // If removing Score, also remove Match and Prize (dependencies)
      if (type === 'Score') {
        newSelected.delete('Match')
        newSelected.delete('Prize')
      }

      // If removing Match, also remove Prize (dependency)
      if (type === 'Match') {
        newSelected.delete('Prize')
      }
    } else {
      newSelected.add(type)
      // If adding Match, also add Score (dependency)
      if (type === 'Match') {
        newSelected.add('Score')
      }

      // If adding Prize, also add Match and Score (dependencies)
      if (type === 'Prize') {
        newSelected.add('Match')
        newSelected.add('Score')
      }
    }
    
    setSelectedContracts(newSelected)
  }

  // Save and execute deployment plan
  const executeDeploymentPlan = async () => {
    setError(null)
    setDeploymentStatus({ isDeploying: true, success: null, message: 'Saving deployment plan...' })

    try {
      // Step 1: Save the deployment plan
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

      // Step 2: Trigger deployment via addresses route
      // Server uses NEXT_PUBLIC_SDK_CHAIN_ID from its config
      const deployResponse = await fetch('/api/sdk/addresses')
      
      if (!deployResponse.ok) {
        const deployData = await deployResponse.json()
        throw new Error(deployData.error || 'Deployment failed')
      }

      const deployData = await deployResponse.json()
      
      // Step 3: Refresh addresses in context
      await loadAddresses()

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('contractDeployed'))

      // Update current plan
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

      // Refresh addresses (will be empty now)
      await loadAddresses()

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('contractDeployed'))

      setCurrentPlan([])
      setSelectedContracts(new Set())
      setDeploymentStatus({
        isDeploying: false,
        success: true,
        message: 'Deployment plan cleared. Contracts reset.',
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

  const formatAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`

  if (isLoadingPlan) {
    return (
      <Card className="border-2 border-gray-200">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Rocket className="w-5 h-5 text-blue-600" />
          Deployment Plan
        </CardTitle>
        <CardDescription className="text-sm text-gray-600">
          Select contracts to deploy. Dependencies are automatically included.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Contract Selection */}
        <div className="space-y-3">
          {CONTRACT_OPTIONS.map((option) => {
            const isSelected = selectedContracts.has(option.type)
            const isDeployed = !!deployedContracts[option.type]
            const isDependency = option.dependsOn?.some(dep => !selectedContracts.has(dep))

            return (
              <div
                key={option.type}
                className={`
                  relative flex items-start gap-3 p-4 rounded-lg border-2 transition-all
                  ${isSelected 
                    ? 'border-blue-300 bg-blue-50' 
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'}
                `}
              >
                <Checkbox
                  id={option.type}
                  checked={isSelected}
                  onCheckedChange={() => toggleContract(option.type)}
                  disabled={deploymentStatus.isDeploying}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <Label
                    htmlFor={option.type}
                    className="text-sm font-medium text-gray-900 cursor-pointer"
                  >
                    {option.name}
                    {option.dependsOn && (
                      <span className="ml-2 text-xs text-gray-500 font-normal">
                        (requires {option.dependsOn.join(', ')})
                      </span>
                    )}
                  </Label>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {option.description}
                  </p>
                  
                  {/* Current deployment status */}
                  {isDeployed && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      <code className="text-xs font-mono text-green-700">
                        {formatAddress(deployedContracts[option.type]!)}
                      </code>
                    </div>
                  )}
                </div>

                {isDependency && isSelected && (
                  <div className="absolute top-2 right-2">
                    <Info className="w-4 h-4 text-blue-500" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Deployment Status */}
        {deploymentStatus.message && (
          <div
            className={`
              p-3 rounded-lg text-sm flex items-start gap-2
              ${deploymentStatus.success === true 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : deploymentStatus.success === false
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'}
            `}
          >
            {deploymentStatus.success === true && <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
            {deploymentStatus.success === false && <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            {deploymentStatus.isDeploying && <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" />}
            <div>
              <p className="font-medium">{deploymentStatus.message}</p>
              {deploymentStatus.totalDeployed !== undefined && (
                <p className="text-xs mt-1 opacity-75">
                  {deploymentStatus.totalDeployed} deployed, {deploymentStatus.totalExisting} existing
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Stale Addresses Warning */}
        {hasStaleAddresses && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Stale Contract Addresses Detected</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Some stored addresses no longer exist on-chain. The chain may have been reset (anvil restart).
                These contracts will be redeployed.
              </p>
              <button
                onClick={validateContracts}
                disabled={isValidating}
                className="mt-2 text-xs text-amber-700 hover:text-amber-900 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isValidating ? 'animate-spin' : ''}`} />
                Refresh validation
              </button>
            </div>
          </div>
        )}

        {/* Deployment Preview */}
        {showPreview && selectedContracts.size > 0 && (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-800">Deployment Preview</h4>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1 hover:bg-slate-200 rounded transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            
            <div className="space-y-2">
              <p className="text-xs text-slate-600 mb-2">
                Contracts will be processed in dependency order:
              </p>
              
              {/* Deployment order - Score first if selected, then Match */}
              {(['Score', 'Match', 'Prize'] as ContractType[])
                .filter(c => selectedContracts.has(c))
                .map((contractType, index) => {
                const option = CONTRACT_OPTIONS.find(o => o.type === contractType)!
                const status = getContractStatus(contractType)
                const address = deployedContracts[contractType]
                
                return (
                  <div
                    key={contractType}
                    className="flex items-center gap-3 p-2 bg-white rounded border border-slate-200"
                  >
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{option.name}</p>
                      <p className="text-xs">
                        {status === 'deployed' ? (
                          <span className="text-green-600">
                            ✓ Already on-chain at {formatAddress(address!)} — will be skipped
                          </span>
                        ) : status === 'stale' ? (
                          <span className="text-amber-600">
                            ⚠ Address {formatAddress(address!)} not on-chain — will be redeployed
                          </span>
                        ) : (
                          <span className="text-blue-600">New deployment</span>
                        )}
                      </p>
                    </div>
                  </div>
                )
              })}
              
              {/* Permissions info */}
              {selectedContracts.has('Match') && selectedContracts.has('Score') && (
                <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-800">
                    <span className="font-medium">Permissions:</span> If Match is deployed, it will be authorized to record scores on the Score contract.
                  </p>
                </div>
              )}

              {selectedContracts.has('Prize') && (
                <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-800">
                    <span className="font-medium">Permissions:</span> If Prize is deployed, Score will be wired to Prize pools and Prize will be registered as a Match share recipient.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={executeDeploymentPlan}
            disabled={deploymentStatus.isDeploying || selectedContracts.size === 0}
            className="flex-1 gap-2"
          >
            {deploymentStatus.isDeploying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                {hasChanges ? 'Save & Deploy' : 'Redeploy'}
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            disabled={deploymentStatus.isDeploying || selectedContracts.size === 0}
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview
          </Button>
          
          <Button
            variant="outline"
            onClick={clearDeploymentPlan}
            disabled={deploymentStatus.isDeploying || currentPlan.length === 0}
            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Info about deployment flow */}
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
          <p className="font-medium text-gray-700 mb-1">How it works:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Select contracts to include in your deployment plan</li>
            <li>Click &quot;Save & Deploy&quot; to execute the plan</li>
            <li>The SDK will deploy missing contracts in dependency order</li>
            <li>Addresses will be available via <code className="bg-gray-200 px-1 rounded">/api/sdk/addresses</code></li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
