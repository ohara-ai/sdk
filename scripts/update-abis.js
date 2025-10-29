#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration: Map contract names to output file names
const CONTRACT_MAPPINGS = {
  'GameMatch': 'gameMatch',
  'GameMatchFactory': 'gameMatchFactory',
  'GameScore': 'gameScore',
  'GameScoreFactory': 'gameScoreFactory',
  // Note: erc20.ts is maintained separately and not auto-generated
};

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
 * Extract ABI from compiled contract JSON
 */
function extractABI(contractName) {
  const filepath = findCompiledContract(contractName);
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  
  if (!data.abi) {
    throw new Error(`No ABI found in ${filepath}`);
  }

  return data.abi;
}

/**
 * Generate TypeScript file content for an ABI
 */
function generateTypeScriptABI(contractName, outputName, abi) {
  const constantName = outputName
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()
    .replace(/^_/, '') + '_ABI';

  return `export const ${constantName} = ${JSON.stringify(abi, null, 2)} as const;\n`;
}

/**
 * Update index.ts to export all ABIs
 */
function updateIndexFile() {
  const exports = Object.values(CONTRACT_MAPPINGS)
    .map(outputName => `export * from './${outputName}';`)
    .join('\n');

  const indexPath = path.join(ABI_OUTPUT_DIR, 'index.ts');
  fs.writeFileSync(indexPath, exports + '\n', 'utf8');
  console.log(`✓ Updated ${indexPath}`);
}

/**
 * Main function
 */
function main() {
  console.log('🔄 Updating ABIs from compiled contracts...\n');

  // Check if contracts are compiled
  if (!fs.existsSync(CONTRACTS_OUT_DIR)) {
    console.error('❌ Contracts not compiled. Run "cd contracts && forge build" first.');
    process.exit(1);
  }

  // Process each contract
  let successCount = 0;
  let errorCount = 0;

  for (const [contractName, outputName] of Object.entries(CONTRACT_MAPPINGS)) {
    try {
      console.log(`Processing ${contractName}...`);
      
      const abi = extractABI(contractName);
      const tsContent = generateTypeScriptABI(contractName, outputName, abi);
      const outputPath = path.join(ABI_OUTPUT_DIR, `${outputName}.ts`);
      
      fs.writeFileSync(outputPath, tsContent, 'utf8');
      console.log(`✓ Generated ${outputPath}`);
      successCount++;
    } catch (error) {
      console.error(`✗ Failed to process ${contractName}: ${error.message}`);
      errorCount++;
    }
  }

  // Update index file
  updateIndexFile();

  // Summary
  console.log(`\n✨ Done! ${successCount} ABIs updated, ${errorCount} errors.`);
  
  if (errorCount > 0) {
    process.exit(1);
  }
}

main();
