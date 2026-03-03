// src/analysis/complexityCalculator.js
// Walks an AST node tree and counts decisions to compute cyclomatic complexity.
// Works with JavaScript (Acorn) and Python (python-ast) AST nodes.

export function calculateComplexity(node) {
  let points = 0;

  function walk(n) {
    if (!n || typeof n !== 'object') return;
    switch (n.type || n.constructor?.name) {
      case 'IfStatement':
      case 'ForStatement':
      case 'WhileStatement':
      case 'DoWhileStatement':
      case 'ForInStatement':
      case 'ForOfStatement':
      case 'SwitchCase':
      case 'CatchClause':
      case 'ExceptHandler': // python-ast name for except
        points++;
        break;
      case 'LogicalExpression':
        if (n.operator === '&&' || n.operator === '||') points++;
        break;
      case 'ConditionalExpression':
        points++;
        break;
      case 'If': // python ast.If
      case 'For':
      case 'While':
      case 'With':
        // python AST nodes use body but above cases capture them
        points++;
        break;
    }

    for (const key of Object.keys(n)) {
      const child = n[key];
      if (Array.isArray(child)) {
        child.forEach(walk);
      } else {
        walk(child);
      }
    }
  }

  walk(node);
  // formula M = 1 + decision points (assuming single entry P = 1)
  return 1 + points;
}
