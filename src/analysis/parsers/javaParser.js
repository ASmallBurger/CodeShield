// src/analysis/parsers/javaParser.js
// Naive Java parser: identifies methods by a simple regex and then counts
// decision points within the method body. Not a full AST but sufficient
// for complexity counting in typical Java sources.

function countPoints(text) {
  const decisions = text.match(/\b(if|for|while|case|catch)\b/g) || [];
  const logical = text.match(/&&|\|\|/g) || [];
  const ternary = text.match(/\?/g) || [];
  return decisions.length + logical.length + ternary.length;
}

export function parseJava(code /* string */) {
  const results = [];
  const lines = code.split(/\r?\n/);
  let current = null;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // try to detect a method signature when not already inside one
    if (braceDepth === 0) {
      const m = line.match(/(\w+)\s*\([^)]*\)\s*\{/);
      if (m) {
        current = { name: m[1], complexity: 1, start: i + 1 };
      }
    }

    if (current) {
      current.complexity += countPoints(line);
    }

    // update brace depth by scanning the line
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      else if (ch === '}') braceDepth--;
    }

    if (current && braceDepth === 0) {
      current.end = i + 1;
      results.push(current);
      current = null;
    }
  }

  return results;
}
