import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useOharaAi, ContractDependency } from '@/sdk/src'
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react'

interface ContractDependencyInfoProps {
  className?: string
}

/**
 * Displays contract dependency information automatically detected from mounted SDK components
 * Shows which contracts are required and whether they're configured
 * 
 * Must be used within OharaAiProvider
 */
export function ContractDependencyInfo({
  className,
}: ContractDependencyInfoProps) {
  const { dependencies, validation, activeComponents } = useOharaAi()

  if (dependencies.length === 0) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          Contract Dependencies
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeComponents.size > 0 && (
            <div className="text-sm text-gray-600 mb-4">
              <strong>Active SDK Components:</strong>{' '}
              {Array.from(activeComponents).join(', ')}
            </div>
          )}
          {dependencies.map((dep: ContractDependency) => {
            const isConfigured = validation.configured.some(
              (c: ContractDependency) => c.contract === dep.contract
            )
            const isMissing = validation.missing.some(
              (m: ContractDependency) => m.contract === dep.contract
            )

            return (
              <div
                key={dep.contract}
                className="flex items-start gap-3 p-3 rounded-lg border"
              >
                <div className="mt-0.5">
                  {dep.required ? (
                    isConfigured ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )
                  ) : (
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{dep.contract}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        dep.required
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {dep.required ? 'Required' : 'Optional'}
                    </span>
                  </div>
                  {dep.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      {dep.description}
                    </p>
                  )}
                  {dep.envVar && (
                    <div className="text-xs text-gray-500">
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                        {dep.envVar}
                      </code>
                      {isMissing && (
                        <span className="ml-2 text-red-600 font-medium">
                          Not configured
                        </span>
                      )}
                      {isConfigured && (
                        <span className="ml-2 text-green-600 font-medium">
                          ✓ Configured
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {!validation.valid && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium mb-2">
                Missing Required Contracts
              </p>
              <p className="text-sm text-red-700">
                Please deploy and configure the missing contracts before using
                this demo. Visit the{' '}
                <a
                  href="/contract-testing"
                  className="underline hover:text-red-900"
                >
                  contract testing page
                </a>{' '}
                to deploy contracts.
              </p>
            </div>
          )}

          {validation.valid && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium">
                ✓ All required contracts are configured
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
