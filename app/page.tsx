'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowRight, Trophy, Gamepad2, Book, Code2 } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Ohara AI SDK
            </Link>
            <div className="flex items-center gap-6">
              <Link 
                href="/docs" 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium"
              >
                <Book className="w-4 h-4" />
                Documentation
              </Link>
              <Link 
                href="/contract-testing" 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium"
              >
                <Code2 className="w-4 h-4" />
                Contract Testing
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="border-b border-gray-200 bg-gradient-to-b from-blue-50/50 to-white">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold shadow-lg">
              <Gamepad2 className="w-4 h-4" />
              <span>Gaming</span>
            </div>
            <h1 className="text-6xl font-bold tracking-tight text-gray-900">
              Ohara AI SDK
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Production-ready on-chain gaming components and smart contracts. 
              Build wagered matches, leaderboards, and more with ease.
            </p>
          </div>
        </div>
      </div>

      {/* Gaming Demos Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Gaming Demos</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore interactive examples showcasing wagered matches, leaderboards, and on-chain game mechanics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Link href="/demos/tic-tac-toe" className="group">
            <Card className="h-full border-2 border-gray-200 hover:border-blue-500 transition-all duration-200 hover:shadow-xl hover:-translate-y-1">
              <CardHeader className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                    <Gamepad2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-all group-hover:translate-x-1 duration-200" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900 mb-3">Tic-Tac-Toe</CardTitle>
                <CardDescription className="text-base text-gray-600 leading-relaxed">
                  Full-featured wagered game with stake management, match activation, and real-time leaderboard tracking. 
                  Experience the complete SDK integration.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/demos/leaderboard" className="group">
            <Card className="h-full border-2 border-gray-200 hover:border-purple-500 transition-all duration-200 hover:shadow-xl hover:-translate-y-1">
              <CardHeader className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                    <Trophy className="w-6 h-6 text-purple-600" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-all group-hover:translate-x-1 duration-200" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900 mb-3">Leaderboard</CardTitle>
                <CardDescription className="text-base text-gray-600 leading-relaxed">
                  Standalone leaderboard showcase with rankings, player statistics, and customizable display options. 
                  See how to integrate competitive features.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </main>
  )
}
