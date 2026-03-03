// src/analysis/parsers/pythonParser.js
// Uses a lightweight python-ast package to parse Python source into an AST.
// The walker reuses the generic complexity calculator above.

import ast from 'python-ast';
import { calculateComplexity } from '../complexityCalculator.js';

export function parsePython(code /* string */) {
  const tree = ast.parse(code);
  const results = [];

  function visit(node) {
    if (!node) return;
    // function definitions in python
    if (
      node.constructor &&
      (node.constructor.name === 'FunctionDef' || node.constructor.name === 'AsyncFunctionDef')
    ) {
      const name = node.name || '<anonymous>';
      const complexity = calculateComplexity(node);
      results.push({ name, complexity, lineno: node.lineno });
    }
    for (const field in node) {
      const child = node[field];
      if (Array.isArray(child)) child.forEach(visit);
      else if (typeof child === 'object') visit(child);
    }
  }

  visit(tree);
  return results;
}
