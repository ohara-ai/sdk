'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ContractTestingPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        <h1 className="text-4xl font-bold mb-4">Contract Testing Environment</h1>
        <p className="text-gray-600 mb-8">
          This section contains the internal testing environment for contract deployment and interaction.
          The content from the original app folder can be accessed here.
        </p>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This is an internal testing environment. 
            The original contract testing interface has been preserved here for development purposes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/contract-testing/features/game-match">
            <div className="p-6 border rounded-lg hover:border-blue-500 transition-colors cursor-pointer">
              <h3 className="text-xl font-semibold mb-2">Game Match Testing</h3>
              <p className="text-gray-600">Deploy and test GameMatch contracts</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
