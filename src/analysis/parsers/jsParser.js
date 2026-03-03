// src/analysis/parsers/jsParser.js
// Parses JavaScript/TypeScript source using Acorn and returns an array of
// {name, complexity, loc} for each function/arrow expression/func decl.

import { parse } from 'acorn';
import { calculateComplexity } from '../complexityCalculator.js';

export function parseJavaScript(code /* string */, filename = '<input>') {
  const ast = parse(code, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    locations: true,
  });
  const results = [];

  function walk(n) {
    if (!n || typeof n !== 'object') return;

    // capture function-like constructs
    if (
      n.type === 'FunctionDeclaration' ||
      n.type === 'FunctionExpression' ||
      n.type === 'ArrowFunctionExpression'
    ) {
      const name = n.id ? n.id.name : '<anonymous>';
      const complexity = calculateComplexity(n.body);
      results.push({ name, complexity, loc: n.loc });
    }

    for (const key of Object.keys(n)) {
      const child = n[key];
      if (Array.isArray(child)) child.forEach(walk);
      else walk(child);
    }
  }

  walk(ast);
  return results;
}
