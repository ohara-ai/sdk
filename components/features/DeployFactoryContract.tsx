'use client'

import { useState, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CheckCircle2, Loader2, Rocket, Info, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface DeploymentResult {
  success: true
  address: `0x${string}`
  transactionHash: `0x${string}`
  authorizationWarning?: string
  authorizationError?: string
}

interface DeployFactoryContractProps {
  factoryAddress: `0x${string}` | undefined
  factoryEnvVar: string
  contractName: string
  contractDescription?: string
  /** @deprecated Use deployFunction instead */
  apiRoute?: string
  /** Deployment function from OharaAiProvider (preferred over apiRoute) */
  deployFunction?: (params: any) => Promise<DeploymentResult>
  onDeployed: (address: `0x${string}`) => void
  configSection?: ReactNode
  getDeploymentBody?: () => Record<string, any>
  deployedAddress?: string | null
  featuresLink?: string
}

export function DeployFactoryContract({ 
  factoryAddress,
  factoryEnvVar,
  contractName,
  contractDescription,
  apiRoute,
  deployFunction,
  onDeployed,
  configSection,
  getDeploymentBody,
  deployedAddress: externalDeployedAddress,
  featuresLink
}: DeployFactoryContractProps) {
  const [isDeploying, setIsDeploying] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deployedAddress, setDeployedAddress] = useState<`0x${string}` | null>(null)
  const [authWarning, setAuthWarning] = useState<string | null>(null)
  
  const controllerAddress = process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS || 'Not configured'

  const handleDeploy = async () => {
    if (!factoryAddress) return

    setIsDeploying(true)
    setError(null)

    try {
      const body = getDeploymentBody ? getDeploymentBody() : {}
      let data: DeploymentResult
      
      // Use deployFunction if provided (from OharaAiProvider), otherwise fall back to apiRoute
      if (deployFunction) {
        data = await deployFunction({
          factoryAddress,
          ...body,
        })
      } else if (apiRoute) {
        const response = await fetch(apiRoute, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            factoryAddress,
            ...body,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Deployment failed')
        }

        data = await response.json()
      } else {
        throw new Error('No deployment method configured (deployFunction or apiRoute required)')
      }

      if (data.address) {
        setDeployedAddress(data.address)
        setIsSuccess(true)
        if (data.authorizationWarning) {
          setAuthWarning(data.authorizationWarning)
        }
        onDeployed(data.address)
      } else {
        throw new Error('No address returned from deployment')
      }
    } catch (err) {
      console.error('Deployment error:', err)
      setError(err instanceof Error ? err.message : 'Deployment failed')
    } finally {
      setIsDeploying(false)
    }
  }

  const handleReset = () => {
    setIsSuccess(false)
    setDeployedAddress(null)
    setAuthWarning(null)
  }

  const currentAddress = externalDeployedAddress || deployedAddress
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  if (!factoryAddress) {
    return (
      <Card className="border-2 border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-red-900">{contractName}</CardTitle>
          {contractDescription && (
            <CardDescription className="mt-2 text-sm text-red-700">{contractDescription}</CardDescription>
          )}
          <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-xs font-semibold text-red-900">Factory Not Configured</p>
            <p className="text-xs text-red-800 mt-1">Please set {factoryEnvVar} in your .env file</p>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card className="border-2 border-gray-200">
        <CardHeader className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-gray-900 mb-2">{contractName}</CardTitle>
              {contractDescription && (
                <CardDescription className="text-sm text-gray-600 leading-relaxed">
                  {contractDescription}
                </CardDescription>
              )}
            </div>
            {currentAddress && featuresLink && (
              <Link href={featuresLink} className="group">
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors group-hover:translate-x-1 duration-200" />
              </Link>
            )}
          </div>

          <div className="space-y-3">
            {/* Contract Address - Always Shown */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-700">Contract Address</div>
              {currentAddress ? (
                <code className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-mono bg-green-50 text-green-700 border border-green-200 break-all">
                  {formatAddress(currentAddress)}
                </code>
              ) : (
                <div className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  Not Deployed
                </div>
              )}
            </div>

            {/* Authorization Warning - When Present */}
            {authWarning && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-900 mb-1">⚠️ Authorization Warning</p>
                <p className="text-xs text-amber-800">{authWarning}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs font-medium text-gray-700">Deploy New Instance</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    <span className="font-mono">CONTROLLER</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono text-xs">{controllerAddress}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {configSection}

            {error && (
              <div className="text-xs text-red-700 p-3 rounded-lg bg-red-50 border border-red-200">
                <span className="font-semibold">Error:</span> {error}
              </div>
            )}

            <Button onClick={handleDeploy} size="sm" className="w-full gap-2 h-9" disabled={isDeploying}>
              {isDeploying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Deploying...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  <span className="text-sm">Deploy Contract</span>
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>
    </TooltipProvider>
  )
}
