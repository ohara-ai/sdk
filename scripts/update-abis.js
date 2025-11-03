#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration: Map contract names to output file names and source types
const CONTRACT_MAPPINGS = [
  { 
    name: 'Match', 
    output: 'game/match', 
    type: 'local',
    exportName: 'MATCH_ABI'
  },
  { 
    name: 'MatchFactory', 
    output: 'game/matchFactory', 
    type: 'local',
    exportName: 'MATCH_FACTORY_ABI'
  },
  { 
    name: 'Score', 
    output: 'game/score', 
    type: 'local',
    exportName: 'SCORE_ABI'
  },
  { 
    name: 'ScoreFactory', 
    output: 'game/scoreFactory', 
    type: 'local',
    exportName: 'SCORE_FACTORY_ABI'
  },
  { 
    name: 'IERC20', 
    output: 'erc/erc20', 
    type: 'external',
    package: '@openzeppelin/contracts/token/ERC20/IERC20.sol',
    abiPath: require.resolve('@openzeppelin/contracts/build/contracts/IERC20.json'),
    exportName: 'ERC20_ABI'
  }
];

const CONTRACTS_OUT_DIR = path.join(__dirname, '../contracts/out');
const ABI_OUTPUT_DIR = path.join(__dirname, '../sdk/src/abis');

/**
 * Find the compiled JSON file for a contract
 */
function findCompiledContract(contractName) {
  const possiblePaths = [
    path.join(CONTRACTS_OUT_DIR, `${contractName}.sol`, `${contractName}.json`),
  ];

  for (const filepath of possiblePaths) {
    if (fs.existsSync(filepath)) {
      return filepath;
    }
  }

  throw new Error(`Could not find compiled contract: ${contractName}`);
}

/**
 * Extract ABI from a contract
 */
function extractABI(contract) {
  if (contract.type === 'external') {
    const data = JSON.parse(fs.readFileSync(contract.abiPath, 'utf8'));
    if (!data.abi) {
      throw new Error(`No ABI found in ${contract.abiPath}`);
    }
    return data.abi;
  } else {
    const filepath = findCompiledContract(contract.name);
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    
    if (!data.abi) {
      throw new Error(`No ABI found in ${filepath}`);
    }

    return data.abi;
  }
}

/**
 * Generate TypeScript file content for an ABI
 */
function generateTypeScriptABI(contract) {
  const constantName = contract.exportName || 
    contract.output.split('/').pop().toUpperCase() + '_ABI';

  return `export const ${constantName} = ${JSON.stringify(contract.abi, null, 2)} as const;\n`;
}

/**
 * Update index.ts to export all ABIs
 */
function updateIndexFile() {
  // Create directories if they don't exist
  const dirs = new Set(['erc', 'game']);
  for (const dir of dirs) {
    const dirPath = path.join(ABI_OUTPUT_DIR, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  // Create index.ts in erc directory
  const ercIndexPath = path.join(ABI_OUTPUT_DIR, 'erc', 'index.ts');
  fs.writeFileSync(ercIndexPath, "export * from './erc20';\n", 'utf8');
  
  // Create index.ts in game directory
  const gameIndexPath = path.join(ABI_OUTPUT_DIR, 'game', 'index.ts');
  const gameExports = CONTRACT_MAPPINGS
    .filter(contract => contract.output.startsWith('game/'))
    .map(contract => `export * from './${path.basename(contract.output)}';`)
    .join('\n');
  fs.writeFileSync(gameIndexPath, gameExports + '\n', 'utf8');
  
  // Create main index.ts
  const exports = [
    'export * from "./game";',
    'export * from "./erc";'
  ].join('\n');

  const indexPath = path.join(ABI_OUTPUT_DIR, 'index.ts');
  fs.writeFileSync(indexPath, exports + '\n', 'utf8');
  console.log(`✓ Updated ${indexPath}`);
}

/**
 * Main function
 */
function main() {
  console.log('🔄 Updating ABIs from compiled contracts...\n');
  
  let errorCount = 0;

  // Check if contracts are compiled
  if (!fs.existsSync(CONTRACTS_OUT_DIR)) {
    console.error('❌ Contracts not compiled. Run "cd contracts && forge build" first.');
    process.exit(1);
  }

  // Process each contract
  let successCount = 0;
  for (const contract of CONTRACT_MAPPINGS) {
    console.log(`Processing ${contract.name}...`);
    
    try {
      contract.abi = extractABI(contract);
      const outputPath = path.join(ABI_OUTPUT_DIR, `${contract.output}.ts`);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      const tsContent = generateTypeScriptABI(contract);
      fs.writeFileSync(outputPath, tsContent);
      console.log(`✓ Generated ${outputPath}`);
      successCount++;
    } catch (error) {
      console.error(`Error processing ${contract.name}:`, error.message);
      process.exit(1);
    }
  }

  // Update index file
  updateIndexFile();
  
  console.log('\n✅ All ABIs updated successfully!');

  // Summary
  console.log(`\n✨ Done! ${successCount} ABIs updated, ${errorCount} errors.`);
  
  if (errorCount > 0) {
    process.exit(1);
  }
}

main();
