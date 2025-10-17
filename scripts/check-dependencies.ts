#!/usr/bin/env ts-node
/**
 * CLI tool to check contract dependencies for demo apps
 * 
 * Usage:
 *   npx ts-node scripts/check-dependencies.ts
 *   npx ts-node scripts/check-dependencies.ts --demo=leaderboard
 *   npx ts-node scripts/check-dependencies.ts --component=LeaderBoard
 */

import { 
  COMPONENT_REGISTRY,
  getContractDependencies,
  getRequiredContracts,
  getOptionalContracts,
  validateContractConfiguration,
  getComponentsByContract,
  ContractType,
  ComponentName,
} from '../sdk/src/index'

// Demo configurations
const DEMOS = {
  leaderboard: ['LeaderBoard'] as ComponentName[],
  'tic-tac-toe': ['MatchBoard', 'LeaderBoard'] as ComponentName[],
} as const

function printComponentInfo(componentName: ComponentName) {
  const metadata = COMPONENT_REGISTRY[componentName]
  if (!metadata) {
    console.log(`❌ Component "${componentName}" not found in registry`)
    return
  }

  console.log(`\n📦 Component: ${metadata.name}`)
  if (metadata.description) {
    console.log(`   ${metadata.description}`)
  }
  
  console.log(`\n   Contract Dependencies:`)
  for (const dep of metadata.dependencies) {
    const icon = dep.required ? '🔴' : '🔵'
    const status = dep.required ? 'Required' : 'Optional'
    console.log(`   ${icon} ${dep.contract} (${status})`)
    if (dep.description) {
      console.log(`      ${dep.description}`)
    }
    if (dep.envVar) {
      console.log(`      Env: ${dep.envVar}`)
    }
  }
}

function printDemoInfo(demoName: string, components: ComponentName[]) {
  console.log(`\n🎮 Demo: ${demoName}`)
  console.log(`   Uses: ${components.join(', ')}`)
  
  const allDeps = getContractDependencies(components)
  const required = getRequiredContracts(components)
  const optional = getOptionalContracts(components)
  
  if (required.length > 0) {
    console.log(`\n   ✅ Required Contracts:`)
    for (const dep of required) {
      console.log(`      • ${dep.contract}`)
      if (dep.envVar) {
        console.log(`        ${dep.envVar}`)
      }
    }
  }
  
  if (optional.length > 0) {
    console.log(`\n   ⚠️  Optional Contracts:`)
    for (const dep of optional) {
      console.log(`      • ${dep.contract}`)
      if (dep.envVar) {
        console.log(`        ${dep.envVar}`)
      }
    }
  }
  
  // Validate against environment
  const validation = validateContractConfiguration(components, process.env)
  console.log(`\n   Configuration Status:`)
  console.log(`   ${validation.valid ? '✅' : '❌'} ${validation.valid ? 'All required contracts configured' : 'Missing required contracts'}`)
  
  if (validation.missing.length > 0) {
    console.log(`\n   ❌ Missing:`)
    for (const dep of validation.missing) {
      console.log(`      • ${dep.contract} (${dep.envVar})`)
    }
  }
  
  if (validation.configured.length > 0) {
    console.log(`\n   ✅ Configured:`)
    for (const dep of validation.configured) {
      console.log(`      • ${dep.contract}`)
    }
  }
}

function printAllComponents() {
  console.log('\n📚 All SDK Components:\n')
  const names = Object.keys(COMPONENT_REGISTRY) as ComponentName[]
  for (const name of names) {
    printComponentInfo(name)
  }
}

function printAllDemos() {
  console.log('\n🎮 All Demo Apps:\n')
  for (const [demoName, components] of Object.entries(DEMOS)) {
    printDemoInfo(demoName, components)
  }
}

function printContractUsage(contractType: ContractType) {
  console.log(`\n📄 Contract: ${contractType}`)
  const components = getComponentsByContract(contractType)
  console.log(`   Used by: ${components.join(', ') || 'No components'}`)
}

function main() {
  const args = process.argv.slice(2)
  const demoArg = args.find(arg => arg.startsWith('--demo='))
  const componentArg = args.find(arg => arg.startsWith('--component='))
  const contractArg = args.find(arg => arg.startsWith('--contract='))

  console.log('🔍 Contract Dependency Checker\n')
  console.log('=' . repeat(50))

  if (demoArg) {
    const demoName = demoArg.split('=')[1]
    const components = DEMOS[demoName as keyof typeof DEMOS]
    if (!components) {
      console.log(`❌ Demo "${demoName}" not found`)
      console.log(`   Available demos: ${Object.keys(DEMOS).join(', ')}`)
      return
    }
    printDemoInfo(demoName, components)
  } else if (componentArg) {
    const componentName = componentArg.split('=')[1] as ComponentName
    printComponentInfo(componentName)
  } else if (contractArg) {
    const contractType = contractArg.split('=')[1] as ContractType
    printContractUsage(contractType)
  } else {
    // Print everything
    printAllComponents()
    printAllDemos()
  }

  console.log('\n' + '='.repeat(50))
  console.log('\n💡 Usage:')
  console.log('   npx ts-node scripts/check-dependencies.ts')
  console.log('   npx ts-node scripts/check-dependencies.ts --demo=leaderboard')
  console.log('   npx ts-node scripts/check-dependencies.ts --component=LeaderBoard')
  console.log('   npx ts-node scripts/check-dependencies.ts --contract=Scoreboard')
  console.log('')
}

main()
