// src/analysis/parsers/cppParser.js
// Very similar approach to the Java parser; many C++ constructs are similar
// to Java, though templates complicate things. We'll use the same regex
// for function definitions and count the same decision keywords.

function countPoints(text) {
  const decisions = text.match(/\b(if|for|while|case|catch)\b/g) || [];
  const logical = text.match(/&&|\|\|/g) || [];
  const ternary = text.match(/\?/g) || [];
  return decisions.length + logical.length + ternary.length;
}

export function parseCpp(code /* string */) {
  const results = [];
  const lines = code.split(/\r?\n/);
  let current = null;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (braceDepth === 0) {
      // match: [return_type] function_name ( params ) {
      const m = line.match(/(\w+)\s*\([^)]*\)\s*\{/);
      if (m) {
        current = { name: m[1], complexity: 1, startLine: i + 1 };
      }
    }
    if (current) {
      current.complexity += countPoints(line);
    }
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