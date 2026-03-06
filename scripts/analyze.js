#!/usr/bin/env node
// scripts/analyze.js
// use from the cli (read analysis_usage.md)
// Usage: node scripts/analyze.js <file-or-directory> [file2] [file3] ...

import { analyzeFromPaths, analyzeFromDirectory } from '../src/analysis/fileAnalyzer.js';
import path from 'path';
import fs from 'fs';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node scripts/analyze.js <file-or-directory> [file2] [...]');
  console.error('');
  console.error('Examples:');
  console.error('  node scripts/analyze.js src/main.js');
  console.error('  node scripts/analyze.js src/');
  console.error('  node scripts/analyze.js file1.js file2.py');
  process.exit(1);
}

async function main() {
  try {
    let filesToAnalyze = [];

    // process each argument
    for (const arg of args) {
      const resolvedPath = path.resolve(arg);

      if (!fs.existsSync(resolvedPath)) {
        console.warn(`⚠ Path not found: ${arg}`);
        continue;
      }

      const stat = fs.statSync(resolvedPath);
      if (stat.isDirectory()) {
        filesToAnalyze.push(resolvedPath); // will be handled by analyzeFromDirectory
      } else {
        filesToAnalyze.push(resolvedPath);
      }
    }

    if (filesToAnalyze.length === 0) {
      console.error('No valid files or directories found.');
      process.exit(1);
    }

    // separate files and directories
    const files = filesToAnalyze.filter(p => fs.statSync(p).isFile());
    const directories = filesToAnalyze.filter(p => fs.statSync(p).isDirectory());

    let results = [];

    // analyse individual files
    if (files.length > 0) {
      results = results.concat(await analyzeFromPaths(files));
    }

    // analyse directories
    for (const dir of directories) {
      results = results.concat(await analyzeFromDirectory(dir));
    }

    // print results
    displayResults(results);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

function displayResults(results) {
  if (results.length === 0) {
    console.log('No files analyzed.');
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log('CODE COMPLEXITY ANALYSIS RESULTS');
  console.log('='.repeat(80) + '\n');

  let totalComplexity = 0;
  let totalFunctions = 0;

  for (const result of results) {
    const { file, functions, aggregate } = result;
    totalComplexity += aggregate || 0;
    totalFunctions += functions.length;

    console.log(`${file}`);
    console.log(`   Aggregate Complexity: ${aggregate || 0}`);
    console.log(`   Functions: ${functions.length}`);

    if (functions.length > 0) {
      console.log('   ');
      functions.forEach((fn) => {
        const complexity = fn.complexity || 0;
        const riskLevel = getRiskLevel(complexity);
        console.log(`     • ${fn.name} (${complexity}) ${riskLevel}`);
      });
    }
    console.log('');
  }

  console.log('='.repeat(80));
  console.log(`SUMMARY: ${results.length} file(s), ${totalFunctions} function(s), Total Complexity: ${totalComplexity}`);
  console.log('='.repeat(80) + '\n');
}

function getRiskLevel(complexity) {
  if (complexity <= 5) return 'Low';
  if (complexity <= 10) return 'Medium';
  if (complexity <= 20) return 'High';
  return 'Critical';
}

main();
