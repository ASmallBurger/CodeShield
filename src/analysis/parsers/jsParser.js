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

    function inferName(parent) {
    if (!parent) return null;

    if (parent.type === 'VariableDeclarator' && parent.id && parent.id.name) {
      return parent.id.name;
    }
  
    if ((parent.type === 'Property' || parent.type === 'MethodDefinition') && parent.key) {
      return parent.key.name || parent.key.value || null;
    }

    if (parent.type === 'AssignmentExpression' && parent.left) {
      if (parent.left.name) return parent.left.name;
      // obj.method = () => {}
      if (parent.left.property) return parent.left.property.name || null;
    }

    if (parent.type === 'CallExpression') {
      const callee = parent.callee;
      const calleeName = callee.name || (callee.property && callee.property.name) || '';
  
      const firstArg = parent.arguments && parent.arguments[0];
      if (firstArg && firstArg.type === 'Literal' && typeof firstArg.value === 'string') {
        return calleeName ? `${calleeName}(${firstArg.value})` : firstArg.value;
      }
      if (calleeName) return `${calleeName} callback`;
    }
    return null;
  }

  function walk(n, parent) {
    if (!n || typeof n !== 'object') return;

    // capture function-like constructs
    if (
      n.type === 'FunctionDeclaration' ||
      n.type === 'FunctionExpression' ||
      n.type === 'ArrowFunctionExpression'
    ) {
      let name = n.id ? n.id.name : null;
      if (!name) name = inferName(parent) || '<anonymous>';
      const complexity = calculateComplexity(n.body);
      results.push({ name, complexity, loc: n.loc });
    }

    for (const key of Object.keys(n)) {
      const child = n[key];
      if (Array.isArray(child)) child.forEach(c => walk(c, n));
      else walk(child, n);
    }
  }

  walk(ast, null);
  return results;
}
