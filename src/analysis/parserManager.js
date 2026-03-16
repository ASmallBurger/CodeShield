// src/analysis/parserManager.js
// top level entrypoint for analyzing a batch of files.
// delegates to language-specific parsers and aggregates the results.

import { parseJavaScript } from './parsers/jsParser.js';
import { parsePython } from './parsers/pythonParser.js';
import { parseJava } from './parsers/javaParser.js';
import { parseCpp } from './parsers/cppParser.js';

const parsers = {
  '.js': parseJavaScript,
  '.py': parsePython,
  '.java': parseJava,
  '.cpp': parseCpp,
};

/**
 * @param {Array<{name:string, language:object, file:File}>} files
 * @returns {Promise<Array<{file:string, functions:Array, aggregate:number}>>}
 */
export async function analyzeFiles(files) {
  const results = [];

  for (const f of files) {
    const ext = f.name.slice(f.name.lastIndexOf('.'));
    const parser = parsers[ext];
    if (!parser) continue;

    const text = await f.file.text();
    let functions = [];
    try {
      functions = parser(text, f.name);
    } catch (err) {
      // if parsing fails, treat whole file as one thingy
      console.warn(`parser failed for ${f.name}`, err);
      const totalPoints = countPoints(text);
      functions = [{ name: '<parse error>', complexity: totalPoints }];
    }

    const aggregate = functions.reduce((sum, fn) => sum + (fn.complexity || 0), 0);
    // sourceLines is kept so the UI can render code snippets with context
    results.push({ file: f.name, functions, aggregate, sourceLines: text.split(/\r?\n/) });
  }

  return results;
}

function countPoints(text) {
  const decisions = text.match(/\b(if|for|while|case|catch)\b/g) || [];
  const logical = text.match(/&&|\|\|/g) || [];
  const ternary = text.match(/\?/g) || [];
  return 1 + decisions.length + logical.length + ternary.length;
}
