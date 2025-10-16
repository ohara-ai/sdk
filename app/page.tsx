'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowRight, Trophy, Gamepad2, Boxes, Code2, Zap } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium">
              <Zap className="w-4 h-4" />
              <span>AI-ready SDK</span>
            </div>
            <h1 className="text-6xl font-bold tracking-tight text-gray-900">
              Ohara SDK
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Build on-chain gaming applications with production-ready UI components. 
              Simple, powerful, and fully customizable.
            </p>
          </div>
        </div>
      </div>

      {/* Demos Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Interactive Demos</h2>
          <p className="text-gray-600">Explore live examples of SDK components in action</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/demos/tic-tac-toe" className="group">
            <Card className="h-full border-2 border-gray-200 hover:border-blue-500 transition-all duration-200 hover:shadow-lg">
              <CardHeader className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <Gamepad2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors group-hover:translate-x-1 duration-200" />
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900 mb-2">Tic-Tac-Toe</CardTitle>
                <CardDescription className="text-sm text-gray-600 leading-relaxed">
                  Wagered matches with stake management and leaderboard tracking. See WageringBox and LeaderBoard in action.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/demos/leaderboard" className="group">
            <Card className="h-full border-2 border-gray-200 hover:border-purple-500 transition-all duration-200 hover:shadow-lg">
              <CardHeader className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                    <Trophy className="w-5 h-5 text-purple-600" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors group-hover:translate-x-1 duration-200" />
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900 mb-2">Leaderboard</CardTitle>
                <CardDescription className="text-sm text-gray-600 leading-relaxed">
                  Top players, scores, and statistics. Explore LeaderBoard component with various configurations.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/contract-testing" className="group">
            <Card className="h-full border-2 border-dashed border-gray-300 hover:border-green-500 transition-all duration-200 hover:shadow-lg">
              <CardHeader className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                    <Boxes className="w-5 h-5 text-green-600" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors group-hover:translate-x-1 duration-200" />
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900 mb-2">Contract Testing</CardTitle>
                <CardDescription className="text-sm text-gray-600 leading-relaxed">
                  Internal testing environment for deployment and contract interaction. For development use.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>

      {/* Getting Started Section */}
      <div className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <Code2 className="w-6 h-6 text-gray-900" />
              <h2 className="text-2xl font-bold text-gray-900">Getting Started</h2>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Integrate production-ready components into your gaming applications with a single command.
            </p>
            
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Installation</h3>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-sm">
                  npm install @ohara-ai/game-sdk
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Core Components</h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <div>
                      <p className="font-medium text-gray-900">LeaderBoard</p>
                      <p className="text-sm text-gray-600">Display high scores and player rankings with customizable sorting and styling</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-1.5 bg-purple-500 rounded-full flex-shrink-0"></div>
                    <div>
                      <p className="font-medium text-gray-900">WageringBox</p>
                      <p className="text-sm text-gray-600">Create and join wagered matches with built-in escrow and transaction handling</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
