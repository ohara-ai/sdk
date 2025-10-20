'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Activity, CheckCircle2, XCircle, Boxes, Code2, Database } from 'lucide-react'
import { useOharaAi } from '@/sdk/src'

interface ProviderStatusProps {
  className?: string
}

/**
 * Displays real-time OharaAiProvider data including active components,
 * validation status, dependencies, and configured addresses
 */
export function ProviderStatus({ className }: ProviderStatusProps) {
  const { 
    activeComponents, 
    dependencies, 
    validation,
    addresses,
  } = useOharaAi()

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Provider Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active Components */}
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="flex items-center gap-2 mb-3">
              <Boxes className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-sm text-gray-900">Active Components</h3>
            </div>
            <div className="space-y-1.5">
              {activeComponents.size > 0 ? (
                Array.from(activeComponents).map(component => (
                  <div key={component} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium text-gray-700">{component}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No components mounted</p>
              )}
            </div>
          </div>

          {/* Validation Status */}
          <div className={`border rounded-lg p-4 ${validation.valid ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
            <div className="flex items-center gap-2 mb-3">
              {validation.valid ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-orange-600" />
              )}
              <h3 className="font-semibold text-sm text-gray-900">Validation</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Status:</span>
                <span className={`font-bold ${validation.valid ? 'text-green-600' : 'text-orange-600'}`}>
                  {validation.valid ? '✓ Valid' : '✗ Invalid'}
                </span>
              </div>
              {validation.configured.length > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-1">Configured:</p>
                  {validation.configured.map(c => (
                    <div key={c.contract} className="text-xs text-green-700">
                      ✓ {c.contract}
                    </div>
                  ))}
                </div>
              )}
              {validation.missing.length > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-1">Missing:</p>
                  {validation.missing.map(m => (
                    <div key={m.contract} className="text-xs text-orange-700">
                      ✗ {m.contract}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Contract Dependencies */}
          <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-3">
              <Code2 className="w-4 h-4 text-purple-600" />
              <h3 className="font-semibold text-sm text-gray-900">Dependencies</h3>
            </div>
            <div className="space-y-2">
              {dependencies.length > 0 ? (
                dependencies.map(dep => (
                  <div key={dep.contract} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{dep.contract}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${dep.required ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {dep.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                    {dep.envVar && (
                      <p className="text-xs text-gray-600 font-mono mt-0.5">{dep.envVar}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No dependencies</p>
              )}
            </div>
          </div>

          {/* Configured Addresses */}
          <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold text-sm text-gray-900">Addresses</h3>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">GameScore</span>
                  {addresses.GameScore ? (
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                  ) : (
                    <XCircle className="w-3 h-3 text-gray-400" />
                  )}
                </div>
                <p className="text-xs font-mono text-gray-600 break-all">
                  {addresses.GameScore || 'Not configured'}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">GameMatch</span>
                  {addresses.GameMatch ? (
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                  ) : (
                    <XCircle className="w-3 h-3 text-gray-400" />
                  )}
                </div>
                <p className="text-xs font-mono text-gray-600 break-all">
                  {addresses.GameMatch || 'Not configured'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
