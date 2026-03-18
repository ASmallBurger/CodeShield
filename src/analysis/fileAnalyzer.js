// src/analysis/fileAnalyzer.js
// standalone file analyzer - reads files from disk and runs complexity analysis.
// wraps parserManager with low coupling (no dependencies on ui)

import fs from 'fs';
import path from 'path';
import { analyzeFiles } from './parserManager.js';

/**
 * analyses complexity of files from file system paths.
 * @param {string|string[]} filePaths - single file path or array of file paths
 * @returns {Promise<Array>} analysis results
 */
export async function analyzeFromPaths(filePaths) {
  // normalises input to array
  const paths = Array.isArray(filePaths) ? filePaths : [filePaths];

  // convert file paths to file-like objects
  const fileObjects = await Promise.all(
    paths.map(async (filePath) => {
      const resolvedPath = path.resolve(filePath);
      const fileName = path.basename(resolvedPath);

      // read file content
      const fileContent = fs.readFileSync(resolvedPath, 'utf-8');

      // create file-like object compatible with analyzeFiles()
      return {
        name: fileName,
        file: {
          text: async () => fileContent,
        },
      };
    })
  );

  // Pass to existing analysis pipeline
  return analyzeFiles(fileObjects);
}

/**
 * analyses all supported files in a directory.
 * @param {string} dirPath
 * @param {string[]} extensions
 * @returns {Promise<Array>} analysis results
 */
export async function analyzeFromDirectory(dirPath, extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp']) {
  const resolvedDir = path.resolve(dirPath);

  if (!fs.existsSync(resolvedDir)) {
    throw new Error(`Directory not found: ${resolvedDir}`);
  }

  if (!fs.statSync(resolvedDir).isDirectory()) {
    throw new Error(`Not a directory: ${resolvedDir}`);
  }

  // recursively find all supported files
  function getAllFiles(dir) {
    let files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(getAllFiles(fullPath)); // recurse
      } else if (extensions.includes(path.extname(entry.name).toLowerCase())) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const supportedFiles = getAllFiles(resolvedDir);
  if (supportedFiles.length === 0) {
    return [];
  }

  return analyzeFromPaths(supportedFiles);
}
