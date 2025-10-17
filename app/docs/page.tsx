'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Book, Rocket, Code2, Blocks, Lock, FileText, Lightbulb, Zap, Search, ChevronRight, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface DocSection {
  id: string
  title: string
  description: string
  icon: any
  color: string
  docs: DocItem[]
}

interface DocItem {
  title: string
  path: string
  description: string
  tags: string[]
  external?: boolean
}

const documentation: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Quick guides to get you up and running',
    icon: Rocket,
    color: 'blue',
    docs: [
      {
        title: 'README',
        path: '/README.md',
        description: 'Main project overview, structure, and SDK introduction',
        tags: ['overview', 'introduction']
      },
      {
        title: 'Quick Start',
        path: '/QUICK_START.md',
        description: 'Get started with the on-chain features repository in minutes',
        tags: ['tutorial', 'setup']
      },
      {
        title: 'Quick Start SDK',
        path: '/QUICK_START_SDK.md',
        description: 'SDK development quick start guide with restructured project overview',
        tags: ['sdk', 'setup']
      },
      {
        title: 'SDK Integration Guide',
        path: '/SDK_INTEGRATION_GUIDE.md',
        description: 'Complete guide to integrating the SDK into your applications',
        tags: ['sdk', 'integration', 'tutorial']
      }
    ]
  },
  {
    id: 'architecture',
    title: 'Architecture & Design',
    description: 'Deep dive into system architecture and design patterns',
    icon: Blocks,
    color: 'purple',
    docs: [
      {
        title: 'Architecture Overview',
        path: '/ARCHITECTURE.md',
        description: 'Detailed architecture decisions and project organization',
        tags: ['architecture', 'design']
      },
      {
        title: 'Architecture Summary',
        path: '/ARCHITECTURE_SUMMARY.md',
        description: 'Complete architecture summary with build-time provisioning and provider system',
        tags: ['architecture', 'overview']
      },
      {
        title: 'Development Guide',
        path: '/DEVELOPMENT.md',
        description: 'Development workflow for adding new on-chain features',
        tags: ['development', 'workflow']
      }
    ]
  },
  {
    id: 'advanced',
    title: 'Advanced Features',
    description: 'Build-time provisioning, reactive resolution, and automatic detection',
    icon: Zap,
    color: 'yellow',
    docs: [
      {
        title: 'Build-Time Provisioning',
        path: '/BUILD_TIME_PROVISIONING.md',
        description: 'Automatic contract provisioning during the build process',
        tags: ['provisioning', 'automation', 'deployment']
      },
      {
        title: 'Provisioning Summary',
        path: '/BUILD_TIME_PROVISIONING_SUMMARY.md',
        description: 'Implementation summary of build-time contract provisioning system',
        tags: ['provisioning', 'summary']
      },
      {
        title: 'Reactive Address Resolution',
        path: '/REACTIVE_ADDRESS_RESOLUTION.md',
        description: 'How the provider reactively resolves contract addresses at runtime',
        tags: ['provider', 'runtime', 'reactive']
      },
      {
        title: 'Automatic Dependency Detection',
        path: '/AUTOMATIC_DEPENDENCY_DETECTION.md',
        description: 'OharaAiProvider automatically detecting component dependencies',
        tags: ['provider', 'automation', 'dependencies']
      },
      {
        title: 'OharaAi Provider',
        path: '/sdk/OHARA_AI_PROVIDER.md',
        description: 'Complete provider documentation with automatic contract dependency detection',
        tags: ['provider', 'sdk', 'api']
      }
    ]
  },
  {
    id: 'security',
    title: 'Security & Deployment',
    description: 'Security considerations and deployment best practices',
    icon: Lock,
    color: 'red',
    docs: [
      {
        title: 'Deployment Security',
        path: '/DEPLOYMENT_SECURITY.md',
        description: 'Server-side deployment model and security considerations',
        tags: ['security', 'deployment']
      }
    ]
  },
  {
    id: 'sdk',
    title: 'SDK Documentation',
    description: 'SDK components, hooks, and API reference',
    icon: Code2,
    color: 'green',
    docs: [
      {
        title: 'SDK Package README',
        path: '/sdk/README.md',
        description: 'Production-ready UI components and hooks for building on-chain games',
        tags: ['sdk', 'components', 'api']
      }
    ]
  },
  {
    id: 'proposals',
    title: 'Feature Proposals',
    description: 'Proposal process and templates for new features',
    icon: Lightbulb,
    color: 'orange',
    docs: [
      {
        title: 'Proposals README',
        path: '/proposals/README.md',
        description: 'Feature proposal process and guidelines',
        tags: ['proposals', 'process']
      },
      {
        title: 'Proposal Template',
        path: '/proposals/TEMPLATE.md',
        description: 'Standard template for creating new feature proposals',
        tags: ['proposals', 'template']
      }
    ]
  },
  {
    id: 'examples',
    title: 'Examples & Guides',
    description: 'Implementation examples and how-to guides',
    icon: FileText,
    color: 'indigo',
    docs: [
      {
        title: 'Implementation Examples',
        path: '/app/demos/IMPLEMENTATION_EXAMPLE.md',
        description: 'Contract dependencies implementation examples for demo apps',
        tags: ['examples', 'implementation']
      },
      {
        title: 'Development Tokens',
        path: '/contracts/src/tokens/README.md',
        description: 'DEVWORLD token and other development tokens documentation',
        tags: ['tokens', 'development']
      }
    ]
  }
]

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    hover: 'hover:border-blue-500',
    icon: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700'
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    hover: 'hover:border-purple-500',
    icon: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700'
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    hover: 'hover:border-yellow-500',
    icon: 'text-yellow-600',
    badge: 'bg-yellow-100 text-yellow-700'
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    hover: 'hover:border-red-500',
    icon: 'text-red-600',
    badge: 'bg-red-100 text-red-700'
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    hover: 'hover:border-green-500',
    icon: 'text-green-600',
    badge: 'bg-green-100 text-green-700'
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    hover: 'hover:border-orange-500',
    icon: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-700'
  },
  indigo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    hover: 'hover:border-indigo-500',
    icon: 'text-indigo-600',
    badge: 'bg-indigo-100 text-indigo-700'
  }
}

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Filter documentation based on search query
  const filteredSections = documentation.map(section => ({
    ...section,
    docs: section.docs.filter(doc => {
      const searchLower = searchQuery.toLowerCase()
      return (
        doc.title.toLowerCase().includes(searchLower) ||
        doc.description.toLowerCase().includes(searchLower) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    })
  })).filter(section => section.docs.length > 0 || !searchQuery)

  const displayedSections = selectedCategory
    ? filteredSections.filter(s => s.id === selectedCategory)
    : filteredSections

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Book className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Documentation</h1>
                <p className="text-sm text-gray-600">Complete guide to Ohara AI SDK</p>
              </div>
            </div>
            <Link 
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              ← Back to Home
            </Link>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === null
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            {documentation.map(section => (
              <button
                key={section.id}
                onClick={() => setSelectedCategory(section.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === section.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {searchQuery && (
          <div className="mb-6 text-sm text-gray-600">
            Found {displayedSections.reduce((sum, s) => sum + s.docs.length, 0)} results
          </div>
        )}

        <div className="space-y-12">
          {displayedSections.map(section => {
            const colors = colorClasses[section.color as keyof typeof colorClasses]
            const Icon = section.icon

            return (
              <div key={section.id}>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-2 ${colors.bg} rounded-lg`}>
                    <Icon className={`w-6 h-6 ${colors.icon}`} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
                    <p className="text-sm text-gray-600">{section.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.docs.map((doc, idx) => (
                    <a
                      key={idx}
                      href={`https://github.com/ohara-ai/on-chain-features/blob/main${doc.path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group"
                    >
                      <Card className={`h-full border-2 ${colors.border} ${colors.hover} transition-all duration-200 hover:shadow-lg`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-gray-700">
                              {doc.title}
                            </CardTitle>
                            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0 ml-2" />
                          </div>
                          <CardDescription className="text-sm text-gray-600 leading-relaxed mt-2">
                            {doc.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {doc.tags.map(tag => (
                              <Badge 
                                key={tag} 
                                variant="secondary"
                                className={`text-xs ${colors.badge}`}
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {displayedSections.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600">Try adjusting your search query</p>
          </div>
        )}

        {/* Quick Links Footer */}
        <div className="mt-16 pt-12 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-blue-600" />
                New to SDK?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Start with the Quick Start guide to get your first app running in minutes.
              </p>
              <a
                href="https://github.com/ohara-ai/on-chain-features/blob/main/QUICK_START.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View Quick Start
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-purple-600" />
                Building a Feature?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Follow the development guide and proposal process for new features.
              </p>
              <a
                href="https://github.com/ohara-ai/on-chain-features/blob/main/DEVELOPMENT.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                View Development Guide
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Blocks className="w-5 h-5 text-green-600" />
                Understanding Architecture?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Deep dive into the system architecture and design decisions.
              </p>
              <a
                href="https://github.com/ohara-ai/on-chain-features/blob/main/ARCHITECTURE.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                View Architecture
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
